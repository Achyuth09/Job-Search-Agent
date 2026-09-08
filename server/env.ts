export function slackWebhookUrl(): string {
  return (process.env.SLACK_WEBHOOK_URL || '').trim();
}

export function slackChannel(): string {
  return (process.env.SLACK_CHANNEL || 'JONSEARCHAUTO').replace(/^#/, '').trim();
}

export function rapidApiKey(): string {
  return (process.env.RAPIDAPI_KEY || '').trim();
}

export function publicConfig() {
  return {
    slackConfigured: Boolean(slackWebhookUrl()),
    slackChannel: slackChannel(),
    jsearchEnabled: Boolean(rapidApiKey()),
  };
}
