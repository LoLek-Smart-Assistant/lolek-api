import { Request, Response } from 'express';
import { signup, login, logout } from '../services/authService';
import { verifyAccessToken, verifyRefreshToken } from '../lib/jwtHelper';

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function signIn(req: Request, res: Response) {
    try {
        const { username, email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const result = await signup(username || email.split('@')[0], email, password);
        
        // Set httpOnly cookies
        res.cookie('lolek-token', result.accessToken, COOKIE_OPTIONS);
        res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
        
        res.json({ user: result.user });
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
        res.cookie('lolek-token', result.accessToken, COOKIE_OPTIONS);
        res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
        
        res.json({ user: result.user });
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
}

export async function logOut(req: Request, res: Response) {
    try {
        const accessToken = (req.cookies as any)?.['lolek-token'];
        const refreshToken = (req.cookies as any)?.refreshToken;
        let payload = accessToken ? verifyAccessToken(accessToken) : null;

        if (!payload && refreshToken) {
            payload = verifyRefreshToken(refreshToken);
        }

        if (payload?.userId) {
            await logout(payload.userId);
        }
        
        // Clear cookies
        res.clearCookie('lolek-token', COOKIE_OPTIONS);
        res.clearCookie('refreshToken', COOKIE_OPTIONS);
        
        res.json({ message: 'Logged out successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}