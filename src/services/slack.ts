import { Job } from '../types';

export async function sendToSlack(job: Job): Promise<boolean> {
  const res = await fetch('/api/slack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'job', job }),
  });
  const data = await res.json().catch(() => ({}));
  return Boolean(res.ok && data.ok);
}

export async function sendBulkToSlack(
  jobs: Job[],
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number }> {
  const res = await fetch('/api/slack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'jobs', jobs }),
  });
  const data = await res.json().catch(() => ({}));
  const sent = Number(data.sent) || 0;
  const failed = Number(data.failed) || jobs.length - sent;
  onProgress?.(sent, jobs.length);
  return { sent, failed };
}

export async function testWebhook(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
