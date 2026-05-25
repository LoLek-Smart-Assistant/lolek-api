import { Request, Response } from 'express';
import { signup, login, logout, getUserById } from '../services/authService';
import { generateAccessToken, verifyAccessToken, verifyRefreshToken } from '../lib/jwtHelper';

const isProduction = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE_NAME = 'lolek-token';
const REFRESH_COOKIE_NAME = 'lolek-refresh-token';
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
        res.cookie(ACCESS_COOKIE_NAME, result.accessToken, COOKIE_OPTIONS);
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);
        
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
        res.cookie(ACCESS_COOKIE_NAME, result.accessToken, COOKIE_OPTIONS);
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);
        
        res.json({ user: result.user });
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
}

export async function logOut(req: Request, res: Response) {
    try {
        const accessToken = (req.cookies as any)?.[ACCESS_COOKIE_NAME];
        const refreshToken = (req.cookies as any)?.[REFRESH_COOKIE_NAME];
        let payload = accessToken ? verifyAccessToken(accessToken) : null;

        if (!payload && refreshToken) {
            payload = verifyRefreshToken(refreshToken);
        }

        if (payload?.userId) {
            await logout(payload.userId);
        }
        
        // Clear cookies
        res.clearCookie(ACCESS_COOKIE_NAME, COOKIE_OPTIONS);
        res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
        
        res.json({ message: 'Logged out successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function refresh(req: Request, res: Response) {
    try {
        const refreshToken = (req.cookies as any)?.[REFRESH_COOKIE_NAME];
        if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided.' });

        const payload = verifyRefreshToken(refreshToken);
        if (!payload) return res.status(401).json({ error: 'Invalid or expired refresh token.' });

        const user = await getUserById(payload.userId);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ error: 'Refresh token does not match.' });
        }

        const accessToken = generateAccessToken({ userId: user._id.toString(), username: user.username });
        res.cookie(ACCESS_COOKIE_NAME, accessToken, COOKIE_OPTIONS);

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                riotName: user.riotName,
                riotTag: user.riotTag,
                puuid: user.puuid,
                platform: user.platform,
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}