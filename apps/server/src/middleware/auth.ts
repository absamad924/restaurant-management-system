import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'rms-super-secret-development-key', (err, user) => {
    if (err) {
      return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
    }

    req.user = user as AuthRequest['user'];
    next();
  });
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Forbidden: Insufficient privileges for this action' 
      });
    }
    next();
  };
};