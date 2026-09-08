import { Job, Preferences } from '../types';
import { SourceStatus } from './sources';

export async function fetchAllJobs(
  onSourceComplete?: (status: SourceStatus) => void,
  prefs?: Preferences
): Promise<Job[]> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefs }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Search failed (${res.status})`);

  for (const status of data.sources || []) {
    onSourceComplete?.(status);
  }
  return data.jobs || [];
}
