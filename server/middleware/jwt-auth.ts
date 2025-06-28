import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTAuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as JWTAuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function generateJWT(user: { id: number; username: string }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function getJWTUser(req: Request): { id: number; username: string } | null {
  const authReq = req as JWTAuthenticatedRequest;
  return authReq.user || null;
}