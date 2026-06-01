import { Request, Response } from 'express';
import riot from '../lib/riotClient';
import { buildLiveGameSummary, platformToRegion } from '../services/liveGameSummary';

export async function getAccount(req: Request, res: Response) {
  try {
    const { gameName, tagLine } = req.params;
    const data = await riot.getAccount(gameName, tagLine);
    res.json(data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}

export async function getSpectatorByPuuid(req: Request, res: Response) {
  try {
    const { platform, puuid } = req.params;
    if (!puuid) {
      return res.status(400).json({ error: 'puuid is required' });
    }
    const data = await riot.spectator(platform, puuid);
    res.json(data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}

export async function getLiveGameSummary(req: Request, res: Response) {
  try {
    const { platform, gameName, tagLine } = req.params;
    const region = platformToRegion(platform);
    const account: any = await riot.getAccount(gameName, tagLine, region);
    if (!account?.puuid) {
      return res.status(400).json({ error: 'Could not resolve account puuid from gameName/tagLine' });
    }
    const playerSummonerName =
      typeof account.gameName === 'string' && typeof account.tagLine === 'string'
        ? `${account.gameName}#${account.tagLine}`
        : null;
    const summary = await buildLiveGameSummary({ platform, puuid: account.puuid, playerSummonerName });

    res.json(summary);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}
