import type { AccessTokenPayload } from '../lib/tokens.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}
