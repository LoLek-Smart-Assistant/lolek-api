import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwtHelper';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    const payload = verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token.' });

    (req as any).userId = payload.userId;
    (req as any).username = payload.username;
    next();
}