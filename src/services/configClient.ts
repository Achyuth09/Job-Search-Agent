export type PublicConfig = {
  slackConfigured: boolean;
  slackChannel: string;
  jsearchEnabled: boolean;
};

export async function loadPublicConfig(): Promise<PublicConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) {
    return { slackConfigured: false, slackChannel: 'JONSEARCHAUTO', jsearchEnabled: false };
  }
  return res.json();
}
