import { handleSlack } from '../server/handlers';

export const config = { maxDuration: 10 };

export default async function handler(req: any, res: any) {
  try {
    await handleSlack(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Slack failed' }));
    }
  }
}
