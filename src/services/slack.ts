import { Job } from '../types';

export async function sendToSlack(webhookUrl: string, job: Job): Promise<boolean> {
  if (!webhookUrl) return false;

  const scoreEmoji = job.matchScore >= 85 ? '🔥' : job.matchScore >= 70 ? '✅' : '📋';
  const recLabel = job.matchScore >= 85 ? 'HIGH PRIORITY' : job.matchScore >= 70 ? 'MATCH' : 'POSSIBLE';

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${scoreEmoji} ${job.matchScore}% Match — ${recLabel}`,
      },
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
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `💰 *Salary:* ${job.salary}` },
    });
  }

  if (job.matchedSkills.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*✅ Matched Skills:*\n${job.matchedSkills.map(s => `• ${s}`).join('\n')}`,
      },
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

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '🔗 View Job' },
        url: job.url,
      },
    ],
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Sent by AI Job Hunter • ${new Date().toLocaleDateString()}`,
      },
    ],
  });

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    return res.ok;
  } catch (e) {
    console.error('Slack send failed:', e);
    return false;
  }
}

export async function sendBulkToSlack(
  webhookUrl: string,
  jobs: Job[],
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i++) {
    const success = await sendToSlack(webhookUrl, jobs[i]);
    if (success) sent++;
    else failed++;
    onProgress?.(i + 1, jobs.length);
    // Small delay to avoid rate limiting
    if (i < jobs.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  return { sent, failed };
}

export async function testWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '✅ AI Job Hunter webhook test successful! Your Slack integration is working.',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
