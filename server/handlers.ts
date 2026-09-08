import { fetchAllJobs } from '../src/services/jobApis';
import { filterAndSortJobs } from '../src/services/scorer';
import { publicConfig } from './env';
import { readJson, sendJson } from './http';
import { jobBlocks, postToSlack } from './slackPost';

export async function handleConfig(_req: any, res: any) {
  sendJson(res, 200, publicConfig());
}

export async function handleSearch(req: any, res: any) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJson(req);
    const sources: { name: string; count: number; status: string; detail?: string }[] = [];
    const jobs = await fetchAllJobs((status) => sources.push(status), body.prefs);
    const matched = body.prefs ? filterAndSortJobs(jobs, body.prefs) : jobs;
    sendJson(res, 200, { jobs: matched, sources });
  } catch (e) {
    sendJson(res, 500, { error: e instanceof Error ? e.message : 'Search failed' });
  }
}

export async function handleSlack(req: any, res: any) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJson(req);
    const action = body.action || 'test';

    if (action === 'test') {
      const result = await postToSlack({
        text: `✅ AI Job Hunter webhook test successful! Posting to #${publicConfig().slackChannel}.`,
      });
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    if (action === 'job' && body.job) {
      const result = await postToSlack({ blocks: jobBlocks(body.job) });
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    if (action === 'jobs' && Array.isArray(body.jobs)) {
      let sent = 0;
      let failed = 0;
      for (let i = 0; i < body.jobs.length; i++) {
        const result = await postToSlack({ blocks: jobBlocks(body.jobs[i]) });
        if (result.ok) sent++;
        else failed++;
        if (i < body.jobs.length - 1) await new Promise((r) => setTimeout(r, 1000));
      }
      sendJson(res, 200, { ok: failed === 0, sent, failed });
      return;
    }

    sendJson(res, 400, { ok: false, error: 'Invalid Slack action' });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : 'Slack request failed' });
  }
}
