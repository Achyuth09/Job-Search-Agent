import { handleSearch } from '../server/handlers';

export const config = { maxDuration: 10 };

export default async function handler(req: any, res: any) {
  try {
    await handleSearch(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Search failed' }));
    }
  }
}
