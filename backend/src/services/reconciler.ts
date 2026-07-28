import prisma from '../lib/prisma';
import { emailQueue, EmailJobData } from '../queue/queue';

export async function reconcileOnBoot() {
  console.log('reconciler: checking for orphaned jobs...');

  const orphanedJobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ['scheduled', 'queued', 'sending'] },
    },
    include: { sender: true },
  });

  if (orphanedJobs.length === 0) {
    console.log('reconciler: no orphaned jobs found');
    return;
  }

  let requeued = 0;

  for (const job of orphanedJobs) {
    // Check if there's already a BullMQ job for this
    if (job.bullJobId) {
      try {
        const existing = await emailQueue.getJob(job.bullJobId);
        if (existing) {
          const state = await existing.getState();
          if (state !== 'completed' && state !== 'failed') {
            continue; // BullMQ still has it, skip
          }
        }
      } catch {
        // job not found in redis, needs re-enqueue
      }
    }

    const delay = Math.max(0, new Date(job.scheduledFor).getTime() - Date.now());

    const jobData: EmailJobData = {
      emailJobId: job.id,
      senderId: job.senderId,
      recipientEmail: job.recipientEmail,
      subject: job.subject,
      body: job.body,
      senderEmail: job.sender.email,
    };

    const bullJob = await emailQueue.add('send-email', jobData, {
      delay,
      jobId: `${job.id}-reconcile-${Date.now()}`,
    });

    await prisma.emailJob.update({
      where: { id: job.id },
      data: { status: 'queued', bullJobId: bullJob.id },
    });

    requeued++;
  }

  console.log(`reconciler: re-enqueued ${requeued} orphaned jobs`);
}
