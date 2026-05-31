import { normalizePlatformCode } from '../lib/riotClient';
import { Request, Response } from 'express';
import { getUserProfile, updateUserRiotProfile } from '../services/authService';
import riot from '../lib/riotClient';
import { removeUserRiotProfile, deleteUser as deleteUserService } from '../services/authService';

export async function getProfile(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await getUserProfile(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function getRiotProfile(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await getUserProfile(userId);
        if (!user?.puuid || !user?.platform) {
            return res.status(400).json({ error: 'Riot profile not linked. Set riotName, riotTag, and platform first.' });
        }

        const summonerData = await riot.getSummonerByPUUID(user.platform, user.puuid);
        let spectatorData = null;
        try {
            spectatorData = await riot.spectator(user.platform, user.puuid);
        } catch {
            // spectator may 404 if player offline
        }

        const responseData = {
            user: {
                username: user.username,
                email: user.email,
                riotName: user.riotName,
                riotTag: user.riotTag,
                platform: user.platform
            },
            summoner: summonerData,
            spectator: spectatorData
        };

        res.json(responseData);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function linkRiotProfile(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { riotName, riotTag, platform } = req.body;
        if (!riotName || !riotTag || !platform) {
            return res.status(400).json({ error: 'riotName, riotTag, and platform are required.' });
        }

            const normalizedPlatform = normalizePlatformCode(String(platform));

        const account = await riot.getAccount(riotName, riotTag);
            const updated = await updateUserRiotProfile(userId, riotName, riotTag, account.puuid, normalizedPlatform);

        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updatedPlain = typeof updated.toObject === 'function' ? updated.toObject() : updated;

        res.json({ message: 'Riot profile linked.', user: updatedPlain });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function removeRiotProfile(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const updated = await removeUserRiotProfile(userId);
        if (!updated) return res.status(404).json({ error: 'User not found' });

        const updatedPlain = typeof updated.toObject === 'function' ? updated.toObject() : updated;
        res.json({ message: 'Riot profile removed.', user: updatedPlain });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteUser(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const removed = await deleteUserService(userId);
        if (!removed) return res.status(404).json({ error: 'User not found' });

        res.json({ message: 'User deleted.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}