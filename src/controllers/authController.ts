import { Request, Response } from 'express';
import { signup, login, logout } from '../services/authService';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function signIn(req: Request, res: Response) {
    try {
        const { username, email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const result = await signup(username || email.split('@')[0], email, password);
        
        // Set httpOnly cookies
        res.cookie('token', result.token, COOKIE_OPTIONS);
        res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
        
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function logIn(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const result = await login(email, password);
        
        // Set httpOnly cookies
        res.cookie('token', result.token, COOKIE_OPTIONS);
        res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
        
        res.json(result);
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
}

export async function logOut(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await logout(userId);
        
        // Clear cookies
        res.clearCookie('token');
        res.clearCookie('refreshToken');
        
        res.json({ message: 'Logged out successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}