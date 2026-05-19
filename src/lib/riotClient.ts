import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.RIOT_API_KEY;
if (!API_KEY) console.warn('No API key found for RIOT_API_KEY');

const riot = axios.create({
  headers: { 'X-Riot-Token': API_KEY || '' },
  timeout: 10000,
});

function platformBase(platform: string) {
  if (!platform) throw new Error('platform required (e.g. EUW1, NA1, KR)');
  return `https://${platform.toLowerCase()}.api.riotgames.com`;
}

const regionalBase: Record<string, string> = {
  europe: 'https://europe.api.riotgames.com',
  americas: 'https://americas.api.riotgames.com',
  asia: 'https://asia.api.riotgames.com'
};

async function request<T = any>(url: string) {
  try {
    const res = await riot.get<T>(url);
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

export async function getSummonerByPUUID(platform: string, puuid: string) {
  const base = platformBase(platform);
  const url = `${base}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return request(url);
}

export async function spectator(platform: string, encryptedSummonerId: string) {
  const base = platformBase(platform);
  const url = `${base}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(encryptedSummonerId)}`;
  console.log(url);
  return request(url);
}

export default { getAccount, getSummonerByPUUID, spectator };

