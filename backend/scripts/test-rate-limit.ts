// Quick script to verify rate limiting works and jobs are requeued, not dropped.
// Usage: npx tsx scripts/test-rate-limit.ts
//
// Set MAX_EMAILS_PER_HOUR_PER_SENDER=3 in .env before running to see
// requeue behavior quickly. Watch backend logs for "rate limited" messages.

import dotenv from 'dotenv';
dotenv.config();

const API = `http://localhost:${process.env.PORT || 4000}/api`;

async function main() {
  const scheduledFor = new Date(Date.now() + 5000).toISOString(); // 5 seconds from now

  const payload = {
    senderEmail: 'test-ratelimit@example.com',
    senderName: 'Rate Limit Test',
    recipients: [
      { email: 'user1@test.com' },
      { email: 'user2@test.com' },
      { email: 'user3@test.com' },
      { email: 'user4@test.com' },
      { email: 'user5@test.com' },
    ],
    subject: `Rate limit test ${Date.now()}`,
    body: '<p>Testing rate limits</p>',
    scheduledFor,
    delayBetweenMs: 0,
    maxPerHour: 2, // only allow 2 per hour — should trigger requeue on jobs 3-5
  };

  console.log('Scheduling 5 jobs with maxPerHour=2...');
  const res = await fetch(`${API}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  console.log('Schedule response:', JSON.stringify(result, null, 2));

  // Wait and check
  console.log('\nWaiting 15s for jobs to process...');
  await new Promise(r => setTimeout(r, 15000));

  const scheduled = await fetch(`${API}/scheduled`).then(r => r.json());
  const sent = await fetch(`${API}/sent`).then(r => r.json());

  console.log(`\nScheduled/queued: ${scheduled.total}`);
  console.log(`Sent: ${sent.total}`);
  console.log(`Total accounted for: ${scheduled.total + sent.total}`);

  if (scheduled.total + sent.total >= 5) {
    console.log('✓ No jobs lost — rate limiting requeued correctly');
  } else {
    console.log('✗ Jobs may have been dropped!');
  }
}

main().catch(console.error);
