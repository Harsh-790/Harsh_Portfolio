import type { NextFunction, Request, Response } from 'express';
import { getUserFromToken, tokenFromAuthorization, type SessionUser } from '../lib/auth';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = tokenFromAuthorization(req.headers.authorization);
    const user = await getUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: 'Unauthorised' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
