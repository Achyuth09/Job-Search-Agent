import type { IncomingMessage, ServerResponse } from 'http';
import { handleConfig } from '../server/handlers';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleConfig(req, res);
}
