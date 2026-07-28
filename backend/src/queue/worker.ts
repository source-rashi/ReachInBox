import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './queue';
import prisma from '../lib/prisma';
import { checkAndIncrement } from '../services/rateLimiter';
import { sendEmail } from '../services/mailer';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3');
const MIN_DELAY = parseInt(process.env.MIN_DELAY_MS_BETWEEN_SENDS || '2000');

async function processEmailJob(job: Job<EmailJobData>) {
  const { emailJobId, senderId, recipientEmail, subject, body, senderEmail } = job.data;

  // Idempotency: if already sent, skip
  const existing = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
  if (!existing || existing.status === 'sent') {
    return;
  }

  const rateCheck = await checkAndIncrement(senderId);

  if (!rateCheck.allowed) {
    // Reschedule into next hour window — never drop
    const retryDelay = Math.max(rateCheck.retryAfterMs, MIN_DELAY);
    console.log(`rate limited sender ${senderId}, requeuing job ${emailJobId} in ${retryDelay}ms`);

    await emailQueue.add('send-email', job.data, {
      delay: retryDelay,
      jobId: `${emailJobId}-retry-${Date.now()}`,
    });

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: 'queued' },
    });

    return;
  }

  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: 'sending' },
  });

  try {
    const result = await sendEmail(senderEmail, recipientEmail, subject, body);

    await prisma.sendLog.create({
      data: {
        emailJobId,
        messageId: result.messageId,
        etherealUrl: result.etherealUrl,
      },
    });

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: 'sent' },
    });

    console.log(`sent ${emailJobId} → ${recipientEmail} (${result.etherealUrl || 'no preview'})`);
  } catch (err: any) {
    await prisma.sendLog.create({
      data: {
        emailJobId,
        error: err.message,
      },
    });

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: 'failed' },
    });

    throw err;
  }

  // Throttle between sends
  if (MIN_DELAY > 0) {
    await new Promise(r => setTimeout(r, MIN_DELAY));
  }
}

export function startWorker() {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection(),
    concurrency: CONCURRENCY,
  });

  worker.on('completed', (job) => {
    console.log(`job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`job ${job?.id} failed:`, err.message);
  });

  console.log(`email worker started (concurrency: ${CONCURRENCY})`);
  return worker;
}
