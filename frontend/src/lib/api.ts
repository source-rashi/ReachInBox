const API_BASE = '/api/backend';

async function handleResponse(res: Response) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.error || err.message || msg;
    } catch {
      // response wasn't JSON
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchScheduled(page = 1, limit = 50) {
  const res = await fetch(`${API_BASE}/scheduled?page=${page}&limit=${limit}`);
  return handleResponse(res);
}

export async function fetchSent(page = 1, limit = 50) {
  const res = await fetch(`${API_BASE}/sent?page=${page}&limit=${limit}`);
  return handleResponse(res);
}

export async function uploadCsv(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload-csv`, { method: 'POST', body: form });
  return handleResponse(res);
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
  return handleResponse(res);
}
