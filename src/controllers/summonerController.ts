import { Request, Response } from 'express';
import riot from '../lib/riotClient';
import Champion from '../models/Champion';

function platformToRegion(platform: string) {
  const p = (platform || '').toUpperCase();
  if (['EUW1', 'EUN1', 'TR1', 'RU'].includes(p)) return 'europe';
  if (['NA1', 'BR1', 'LA1', 'LA2', 'OC1'].includes(p)) return 'americas';
  if (['KR', 'JP1'].includes(p)) return 'asia';
  return 'europe';
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

export async function getSpectatorByPuuid(req: Request, res: Response) {
  try {
    const { platform, encryptedId } = req.params;
    if (!encryptedId) {
      return res.status(400).json({ error: 'encryptedId is required' });
    }
    const data = await riot.spectator(platform, encryptedId);
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
    const account: any = await riot.getAccount(gameName, tagLine);
    if (!account?.puuid) {
      return res.status(400).json({ error: 'Could not resolve account puuid from gameName/tagLine' });
    }
    const summoner: any = await riot.getSummonerByPUUID(platform, account.puuid);
    if (!summoner?.puuid) {
      return res.status(400).json({ error: 'Could not resolve encrypted summoner id for platform' });
    }
    const data: any = await riot.spectator(platform, summoner.puuid);

    const participants = Array.isArray(data?.participants) ? data.participants : [];
    const me = participants.find((p: any) => p?.puuid === account.puuid);

    const myTeamId = me?.teamId;
    const myTeamParticipants = participants.filter((p: any) => p?.teamId === myTeamId);
    const enemyTeamParticipants = participants.filter((p: any) => p?.teamId !== myTeamId);

    const championKeys = participants
      .map((p: any) => p?.championId)
      .filter((id: any) => typeof id === 'number')
      .map((id: number) => String(id));

    const champions = await Champion.find({ key: { $in: championKeys } }).lean();
    const championByKey = new Map(champions.map((c: any) => [String(c.key), c]));

    const mapTeam = (teamParticipants: any[]) =>
      teamParticipants.map((p: any) => ({
        summonerName: p?.riotId || p?.summonerName || null,
        champion: p?.championId != null ? championByKey.get(String(p.championId)) || null : null
      }));

    const allChamps = championKeys.map((key: string) => championByKey.get(key)).filter(Boolean);

    res.json({
      myTeam: mapTeam(myTeamParticipants),
      enemyTeam: mapTeam(enemyTeamParticipants),
      allChamps,
      gameDuration: data?.gameLength ?? null,
      startTime: data?.gameStartTime ?? null
    });
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}
