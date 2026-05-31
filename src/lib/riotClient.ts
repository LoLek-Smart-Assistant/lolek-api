import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const riot = axios.create({
  timeout: 10000,
});

const PLATFORM_ALIASES: Record<string, string> = {
  EUNE: 'EUN1',
  EUN: 'EUN1',
  EUW: 'EUW1',
  NA: 'NA1',
  BR: 'BR1',
  LAN: 'LA1',
  LAS: 'LA2',
  OCE: 'OC1',
  JP: 'JP1',
  TR: 'TR1',
  RU: 'RU',
  KR: 'KR'
};

export function normalizePlatformCode(platform: string) {
  const code = (platform || '').trim().toUpperCase();
  return PLATFORM_ALIASES[code] || code;
}

function getApiKey() {
  const key = process.env.RIOT_API_KEY?.trim();
  if (!key) {
    throw new Error('RIOT_API_KEY is missing. Set it in environment before calling Riot API.');
  }
  return key;
}

function platformBase(platform: string) {
  if (!platform) throw new Error('platform required (e.g. EUW1, NA1, KR)');
  const normalized = normalizePlatformCode(platform);
  return `https://${normalized.toLowerCase()}.api.riotgames.com`;
}

const regionalBase: Record<string, string> = {
  europe: 'https://europe.api.riotgames.com',
  americas: 'https://americas.api.riotgames.com',
  asia: 'https://asia.api.riotgames.com'
};

async function request<T = any>(url: string) {
  const apiKey = getApiKey();
  try {
    const res = await riot.get<T>(url, {
      headers: { 'X-Riot-Token': apiKey },
    });
    return res.data;
  } catch (err: any) {
    const e = new Error(err.message);
    (e as any).response = err.response;
    throw e;
  }
}

export async function getAccount(gameName: string, tagLine: string, region = 'europe') {
  const base = regionalBase[region] || regionalBase.europe;
  const url = `${base}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return request(url);
}

export async function getAccountByPUUID(puuid: string, region = 'europe') {
  const base = regionalBase[region] || regionalBase.europe;
  const url = `${base}/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`;
  return request(url);
}

export async function getSummonerByPUUID(platform: string, puuid: string) {
  const base = platformBase(platform);
  const url = `${base}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return request(url);
}

export async function spectator(platform: string, encryptedSummonerId: string) {
  const base = platformBase(platform);
  const url = `${base}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(encryptedSummonerId)}`;
  return request(url);
}

export async function getMatchIdsByPUUID(
  puuid: string,
  region = 'europe',
  options?: { start?: number; count?: number; queue?: number; type?: string; startTime?: number; endTime?: number },
) {
  const base = regionalBase[region] || regionalBase.europe;
  const query = new URLSearchParams();

  if (typeof options?.start === 'number') query.set('start', String(options.start));
  if (typeof options?.count === 'number') query.set('count', String(options.count));
  if (typeof options?.queue === 'number') query.set('queue', String(options.queue));
  if (typeof options?.type === 'string' && options.type.trim()) query.set('type', options.type.trim());
  if (typeof options?.startTime === 'number') query.set('startTime', String(options.startTime));
  if (typeof options?.endTime === 'number') query.set('endTime', String(options.endTime));

  const qs = query.toString();
  const url = `${base}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids${qs ? `?${qs}` : ''}`;
  const matchIds = await request<string[]>(url);
  console.log('getMatchIdsByPUUID output:', matchIds);
  return matchIds;
}

export async function getMatchById(matchId: string, region = 'europe') {
  const base = regionalBase[region] || regionalBase.europe;
  const url = `${base}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return request(url);
}

export default {
  getAccount,
  getAccountByPUUID,
  getSummonerByPUUID,
  spectator,
  getMatchIdsByPUUID,
  getMatchById,
};

