import { handleConfig } from '../server/handlers';

export default async function handler(req: any, res: any) {
  try {
    await handleConfig(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Config failed' }));
    }
  }
}
