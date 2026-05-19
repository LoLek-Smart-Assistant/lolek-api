import { Request, Response } from 'express';
import { signup, login, logout } from '../services/authService';
import { addHATEOASLinks } from '../lib/hateoas';

export async function signIn(req: Request, res: Response) {
    try {
        const { username, email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const result = await signup(username || email.split('@')[0], email, password);

        const hateoasResponse = addHATEOASLinks(
            {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                user: result.user
            },
            'authentication',
            result.user.id
        );

        res.json(hateoasResponse);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function logIn(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const result = await login(email, password);

        const hateoasResponse = addHATEOASLinks(
            {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                user: result.user
            },
            'authentication',
            result.user.id
        );

        res.json(hateoasResponse);
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
}

export async function logOut(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await logout(userId);
        res.json({
            data: { message: 'Logged out successfully.' },
            links: [
                { rel: 'login', href: 'http://localhost:3000/authentication/log-in', method: 'POST' },
                { rel: 'signup', href: 'http://localhost:3000/authentication/sign-in', method: 'POST' }
            ]
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}