import { Request, Response, NextFunction } from 'express';
import { ClerkExpressWithAuth, users } from '@clerk/clerk-sdk-node';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const clerkAuth = ClerkExpressWithAuth();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  // Debug logging
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
  console.log('Auth object keys:', authReq.auth ? Object.keys(authReq.auth) : 'No auth object');
  console.log('Auth check - userId:', authReq.auth?.userId);
  
  if (!authReq.auth?.userId) {
    console.log('Authentication failed - no userId, full auth object:', JSON.stringify(authReq.auth, null, 2));
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  console.log('Authentication successful for user:', authReq.auth.userId);
  next();
}

export function getUserId(req: Request): string | null {
  const authReq = req as AuthenticatedRequest;
  return authReq.auth?.userId || null;
}