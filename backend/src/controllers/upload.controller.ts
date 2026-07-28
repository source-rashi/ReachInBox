import { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';

export async function uploadCsv(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Try to detect email column — look for common header names
    const headers = Object.keys(records[0] || {});
    const emailCol = headers.find(h =>
      /^(email|e-mail|mail|email_address|emailaddress)$/i.test(h)
    );

    if (!emailCol) {
      return res.status(400).json({
        error: 'Could not detect email column',
        headers,
        hint: 'CSV must have a column named "email"',
      });
    }

    const nameCol = headers.find(h =>
      /^(name|full_name|fullname|first_name|firstname)$/i.test(h)
    );

    const leads = records
      .map((row: any) => ({
        email: row[emailCol]?.trim(),
        name: nameCol ? row[nameCol]?.trim() : undefined,
      }))
      .filter((lead: any) => lead.email && lead.email.includes('@'));

    const duplicates = records.length - leads.length;

    return res.json({
      total: records.length,
      valid: leads.length,
      invalid: duplicates,
      leads,
    });
  } catch (err: any) {
    console.error('csv parse error:', err);
    return res.status(400).json({ error: 'Failed to parse CSV', detail: err.message });
  }
}
