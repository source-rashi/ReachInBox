const API_BASE = '/api/backend';

export async function fetchScheduled(page = 1, limit = 50) {
  const res = await fetch(`${API_BASE}/scheduled?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch scheduled jobs');
  return res.json();
}

export async function fetchSent(page = 1, limit = 50) {
  const res = await fetch(`${API_BASE}/sent?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch sent jobs');
  return res.json();
}

export async function uploadCsv(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload-csv`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function scheduleEmails(data: {
  senderEmail: string;
  senderName?: string;
  recipients: { email: string; name?: string }[];
  subject: string;
  body: string;
  scheduledFor: string;
  delayBetweenMs?: number;
  maxPerHour?: number;
}) {
  const res = await fetch(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Scheduling failed');
  }
  return res.json();
}
