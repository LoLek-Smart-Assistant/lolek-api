import { Request, Response } from 'express';
import riot from '../lib/riotClient';

function mapSummonerDto(summ: any) {
  if (!summ) return null;
  return {
    id: summ.id,
    accountId: summ.accountId,
    puuid: summ.puuid,
    name: summ.name,
    profileIconId: summ.profileIconId,
    revisionDate: summ.revisionDate,
    summonerLevel: summ.summonerLevel
  };
}

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

export async function getSpectatorById(req: Request, res: Response) {
  try {
    const { platform, encryptedId } = req.params;
    const data = await riot.spectator(platform, encryptedId);
    res.json(data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}

