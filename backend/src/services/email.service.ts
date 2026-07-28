import crypto from 'crypto';
import prisma from '../lib/prisma';
import { ScheduleEmailInput } from '../validation/email.validation';
import { emailQueue, EmailJobData } from '../queue/queue';

export function generateDedupeKey(recipientEmail: string, subject: string, scheduledFor: string): string {
  return crypto
    .createHash('sha256')
    .update(`${recipientEmail}|${subject}|${scheduledFor}`)
    .digest('hex');
}

export async function createScheduledJobs(input: ScheduleEmailInput) {
  const baseTime = new Date(input.scheduledFor).getTime();
  const delayBetween = input.delayBetweenMs || 0;

  const sender = await prisma.sender.upsert({
    where: { email: input.senderEmail },
    update: { name: input.senderName || undefined },
    create: { email: input.senderEmail, name: input.senderName },
  });

  const jobs = [];
  const skipped = [];

  for (let i = 0; i < input.recipients.length; i++) {
    const recipient = input.recipients[i];
    const scheduledFor = new Date(baseTime + i * delayBetween);
    const dedupeKey = generateDedupeKey(recipient.email, input.subject, scheduledFor.toISOString());

    const existing = await prisma.emailJob.findUnique({ where: { dedupeKey } });
    if (existing) {
      skipped.push({ email: recipient.email, reason: 'duplicate' });
      continue;
    }

    const job = await prisma.emailJob.create({
      data: {
        senderId: sender.id,
        recipientEmail: recipient.email,
        subject: input.subject,
        body: input.body,
        scheduledFor,
        dedupeKey,
        status: 'scheduled',
      },
    });

    const delay = Math.max(0, scheduledFor.getTime() - Date.now());
    const jobData: EmailJobData = {
      emailJobId: job.id,
      senderId: sender.id,
      recipientEmail: recipient.email,
      subject: input.subject,
      body: input.body,
      senderEmail: input.senderEmail,
    };

    const bullJob = await emailQueue.add('send-email', jobData, {
      delay,
      jobId: job.id,
    });

    await prisma.emailJob.update({
      where: { id: job.id },
      data: { status: 'queued', bullJobId: bullJob.id },
    });

    jobs.push(job);
  }

  return { jobs, skipped, senderId: sender.id };
}

export async function getScheduledJobs(page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.emailJob.findMany({
      where: { status: { in: ['scheduled', 'queued'] } },
      include: { sender: true },
      orderBy: { scheduledFor: 'asc' },
      skip: offset,
      take: limit,
    }),
    prisma.emailJob.count({
      where: { status: { in: ['scheduled', 'queued'] } },
    }),
  ]);

  return { jobs, total, page, limit };
}

export async function getSentJobs(page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.emailJob.findMany({
      where: { status: 'sent' },
      include: { sender: true, sendLog: true },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.emailJob.count({ where: { status: 'sent' } }),
  ]);

  return { jobs, total, page, limit };
}
