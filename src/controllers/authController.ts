import { Request, Response } from 'express';
import { signup, login, logout, getUserById } from '../services/authService';
import { generateAccessToken, verifyAccessToken, verifyRefreshToken } from '../lib/jwtHelper';

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const ACCESS_COOKIE_NAME = 'lolek-token';
const REFRESH_COOKIE_NAME = 'lolek-refresh-token';
const debugCookieFlow = process.env.AUTH_COOKIE_DEBUG === 'true';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function hasCookieHeader(res: Response, cookieName: string): boolean {
    const headers = res.getHeader('Set-Cookie');
    const values = Array.isArray(headers) ? headers : [headers];
    return values.some((value) => typeof value === 'string' && value.startsWith(`${cookieName}=`));
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(ACCESS_COOKIE_NAME, accessToken, COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    const refreshCookieSet = hasCookieHeader(res, REFRESH_COOKIE_NAME);
    if (debugCookieFlow) {
        console.info('[auth] set cookies', {
            accessCookieName: ACCESS_COOKIE_NAME,
            refreshCookieName: REFRESH_COOKIE_NAME,
            refreshTokenPresent: Boolean(refreshToken),
            refreshCookieHeaderPresent: refreshCookieSet,
            secure: COOKIE_OPTIONS.secure,
            sameSite: COOKIE_OPTIONS.sameSite,
            path: COOKIE_OPTIONS.path,
        });
    }

    if (!refreshCookieSet) {
        const error = new Error('Authentication cookies could not be set');
        (error as Error & { statusCode?: number }).statusCode = 500;
        throw error;
    }
}

export async function signIn(req: Request, res: Response) {
    try {
        const { username, email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const result = await signup(username || email.split('@')[0], email, password);
        
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.json({ user: result.user });
    } catch (err: any) {
        res.status(err.statusCode || 400).json({ error: err.message });
    }
}

export async function logIn(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const result = await login(email, password);
        
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.json({ user: result.user });
    } catch (err: any) {
        res.status(err.statusCode || 401).json({ error: err.message });
    }
}

export async function logOut(req: Request, res: Response) {
    try {
        const accessToken = (req.cookies as any)?.[ACCESS_COOKIE_NAME];
        const refreshToken = (req.cookies as any)?.[REFRESH_COOKIE_NAME];
        if (debugCookieFlow) {
            console.info('[auth] logout cookies received', {
                accessCookiePresent: Boolean(accessToken),
                refreshCookiePresent: Boolean(refreshToken),
            });
        }
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
        if (debugCookieFlow) {
            console.info('[auth] refresh cookie received', {
                cookieName: REFRESH_COOKIE_NAME,
                refreshCookiePresent: Boolean(refreshToken),
            });
        }
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
