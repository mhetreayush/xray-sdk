/**
 * Express Request type extensions
 */

declare namespace Express {
  interface Request {
    projectId?: string;
    userId?: string;
  }
}
