import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error('JWT secrets are not configured. Set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET in .env');
}

export interface TokenPayload {
    userId: string;
    username: string;
}

export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET as string, { expiresIn: '14d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET as string) as TokenPayload;
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET as string) as TokenPayload;
    } catch {
        return null;
    }
}