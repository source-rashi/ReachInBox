import { Request, Response } from 'express';
import { scheduleEmailSchema } from '../validation/email.validation';
import * as emailService from '../services/email.service';

export async function scheduleEmails(req: Request, res: Response) {
  const parsed = scheduleEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const result = await emailService.createScheduledJobs(parsed.data);
    return res.status(201).json({
      scheduled: result.jobs.length,
      skipped: result.skipped,
      jobIds: result.jobs.map(j => j.id),
    });
  } catch (err: any) {
    // unique constraint violation — duplicate dedupe key
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate job detected' });
    }
    console.error('schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getScheduled(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const result = await emailService.getScheduledJobs(page, limit);
    return res.json(result);
  } catch (err) {
    console.error('fetch scheduled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSent(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const result = await emailService.getSentJobs(page, limit);
    return res.json(result);
  } catch (err) {
    console.error('fetch sent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
