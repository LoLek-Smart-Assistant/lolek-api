import { Request, Response } from 'express';
import riot from '../lib/riotClient';
import { addHATEOASLinks } from '../lib/hateoas';

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
    const hateoasResponse = addHATEOASLinks(data, 'account', data.puuid);
    res.json(hateoasResponse);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}

export async function getSpectatorByPuuid(req: Request, res: Response) {
  try {
    const { platform, puuid } = req.params;
    const data = await riot.spectator(platform, puuid);
    const hateoasResponse = addHATEOASLinks({ ...data, platform, puuid }, 'summoner', puuid);
    res.json(hateoasResponse);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}