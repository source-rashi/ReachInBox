import { Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';

export const EMAIL_QUEUE_NAME = 'email-send';

export interface EmailJobData {
  emailJobId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  maxPerHour?: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});
