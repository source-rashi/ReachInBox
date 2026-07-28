import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  senderEmail: z.string().email(),
  senderName: z.string().optional(),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })).min(1),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
  // Accept ISO 8601 with or without timezone (datetime-local sends without Z)
  scheduledFor: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, { message: 'Invalid date format' }),
  delayBetweenMs: z.number().int().min(0).optional(),
  maxPerHour: z.number().int().min(1).optional(),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
