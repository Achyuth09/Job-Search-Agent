import { Job } from '../src/types';
import { slackChannel, slackWebhookUrl } from './env';

export async function postToSlack(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = slackWebhookUrl();
  if (!webhookUrl) return { ok: false, error: 'SLACK_WEBHOOK_URL is not set on the server' };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: `#${slackChannel()}`, ...payload }),
  });
  const text = (await res.text()).trim();
  if (res.ok && (text === 'ok' || text === '')) return { ok: true };
  return { ok: false, error: text || `HTTP ${res.status}` };
}

export function jobBlocks(job: Job) {
  const scoreEmoji = job.matchScore >= 85 ? '🔥' : job.matchScore >= 70 ? '✅' : '📋';
  const recLabel = job.matchScore >= 85 ? 'HIGH PRIORITY' : job.matchScore >= 70 ? 'MATCH' : 'POSSIBLE';
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${scoreEmoji} ${job.matchScore}% Match — ${recLabel}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Title:*\n${job.title}` },
        { type: 'mrkdwn', text: `*Company:*\n${job.company}` },
        { type: 'mrkdwn', text: `*Location:*\n${job.location}${job.remote ? ' (Remote)' : ''}` },
        { type: 'mrkdwn', text: `*Source:*\n${job.source}` },
      ],
    },
  ];

  if (job.salary) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `💰 *Salary:* ${job.salary}` } });
  }
  if (job.matchedSkills?.length) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*✅ Matched Skills:*\n${job.matchedSkills.map((s) => `• ${s}`).join('\n')}` },
    });
  }
  if (job.description) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Description:*\n${job.description.slice(0, 300)}${job.description.length > 300 ? '...' : ''}`,
      },
    });
  }
  if (job.url) {
    blocks.push({
      type: 'actions',
      elements: [{ type: 'button', text: { type: 'plain_text', text: '🔗 View Job' }, url: job.url }],
    });
  }
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `Sent by AI Job Hunter to #${slackChannel()} • ${new Date().toLocaleDateString()}` }],
  });
  return blocks;
}
