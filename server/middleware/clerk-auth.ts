import { Request, Response, NextFunction } from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const clerkAuth = ClerkExpressWithAuth();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.auth?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  next();
}

export function getUserId(req: Request): string | null {
  const authReq = req as AuthenticatedRequest;
  return authReq.auth?.userId || null;
}