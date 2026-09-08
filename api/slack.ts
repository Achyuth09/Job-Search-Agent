import type { IncomingMessage, ServerResponse } from 'http';
import { handleSlack } from '../server/handlers';

export const config = { maxDuration: 60 };

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleSlack(req, res);
}
