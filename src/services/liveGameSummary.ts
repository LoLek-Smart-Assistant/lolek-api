import riot from '../lib/riotClient';
import Champion from '../models/Champion';
import { normalizePlatformCode } from '../lib/riotClient';

export type PlatformRegion = 'europe' | 'americas' | 'asia';

export interface LiveGameParticipantSummary {
  teamId: number | null;
  puuid: string | null;
  summonerName: string | null;
  championName: string | null;
  championKey: string | null;
  championImage: string | null;
  win: boolean | null;
}

export interface LiveGameSummaryPayload {
  platform: string;
  playerPuuid: string;
  playerSummonerName: string | null;
  gameStartTime: number | null;
  gameDuration: number | null;
  myTeam: LiveGameParticipantSummary[];
  enemyTeam: LiveGameParticipantSummary[];
}

export interface LiveGameSummaryInput {
  platform: string;
  puuid: string;
  playerSummonerName?: string | null;
}

const ACCOUNT_NAME_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_NAME_FAILURE_TTL_MS = 60 * 1000;

const accountNameCache = new Map<string, { expiresAt: number; name: string | null }>();
const pendingAccountNameRequests = new Map<string, Promise<string | null>>();

export function platformToRegion(platform: string): PlatformRegion {
  const p = normalizePlatformCode(platform);
  // Ensure we cover both digit and non-digit forms where applicable
  const europe = new Set(['EUW1', 'EUN1', 'TR1', 'RU', 'RU1']);
  const americas = new Set(['NA1', 'BR1', 'LA1', 'LA2', 'OC1']);
  if (europe.has(p)) return 'europe';
  if (americas.has(p)) return 'americas';
  return 'asia';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatRiotId(account: any): string | null {
  const gameName = typeof account?.gameName === 'string' ? account.gameName.trim() : '';
  const tagLine = typeof account?.tagLine === 'string' ? account.tagLine.trim() : '';
  return gameName && tagLine ? `${gameName}#${tagLine}` : null;
}

async function getCachedAccountNameByPuuid(puuid: string, region: PlatformRegion): Promise<string | null> {
  const cacheKey = `${region}:${puuid}`;
  const cached = accountNameCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.name;
  }

  const pending = pendingAccountNameRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = riot.getAccountByPUUID(puuid, region)
    .then((account: any) => {
      const name = formatRiotId(account);
      accountNameCache.set(cacheKey, {
        expiresAt: Date.now() + (name ? ACCOUNT_NAME_CACHE_TTL_MS : ACCOUNT_NAME_FAILURE_TTL_MS),
        name,
      });
      return name;
    })
    .catch(() => {
      accountNameCache.set(cacheKey, {
        expiresAt: Date.now() + ACCOUNT_NAME_FAILURE_TTL_MS,
        name: null,
      });
      return null;
    })
    .finally(() => {
      pendingAccountNameRequests.delete(cacheKey);
    });

  pendingAccountNameRequests.set(cacheKey, request);
  return request;
}

function getLiveParticipantName(participant: any): string | null {
  const gameName = typeof participant?.riotIdGameName === 'string' ? participant.riotIdGameName.trim() : '';
  const tagLine = typeof participant?.riotIdTagline === 'string' ? participant.riotIdTagline.trim() : '';
  if (gameName && tagLine) return `${gameName}#${tagLine}`;

  return typeof participant?.summonerName === 'string' && participant.summonerName.trim()
    ? participant.summonerName.trim()
    : null;
}

function mapParticipant(
  participant: any,
  championKey: string | null,
  championName: string | null,
  championImage: string | null
): LiveGameParticipantSummary {
  const teamId = toNumber(participant?.teamId);

  return {
    teamId,
    puuid: typeof participant?.puuid === 'string' ? participant.puuid : null,
    summonerName: getLiveParticipantName(participant),
    championName,
    championKey,
    championImage,
    win: typeof participant?.win === 'boolean' ? participant.win : null,
  };
}

export async function buildLiveGameSummary(input: LiveGameSummaryInput): Promise<LiveGameSummaryPayload> {
  const platform = (input.platform || '').toUpperCase();
  const puuid = (input.puuid || '').trim();
  let playerSummonerName = typeof input.playerSummonerName === 'string' && input.playerSummonerName.trim()
    ? input.playerSummonerName.trim()
    : null;

  if (!platform) {
    throw new Error('platform is required');
  }
  if (!puuid) {
    throw new Error('puuid is required');
  }

  const data: any = await riot.spectator(platform, puuid);
  const participants = Array.isArray(data?.participants) ? data.participants : [];
  const region = platformToRegion(platform);

  const puuidsNeedingNames = new Set<string>(
    participants
      .filter((participant: any) => !getLiveParticipantName(participant))
      .map((participant: any) => (typeof participant?.puuid === 'string' ? participant.puuid.trim() : ''))
      .filter((participantPuuid: string) => participantPuuid)
  );

  if (!playerSummonerName && !puuidsNeedingNames.has(puuid)) {
    puuidsNeedingNames.add(puuid);
  }

  const accountNameByPuuid = new Map<string, string>();
  await Promise.all(
    [...puuidsNeedingNames].map(async (participantPuuid) => {
      const riotId = await getCachedAccountNameByPuuid(participantPuuid, region);
      if (riotId) {
        accountNameByPuuid.set(participantPuuid, riotId);
      }
    })
  );

  if (!playerSummonerName) {
    const selfParticipant = participants.find((participant: any) => typeof participant?.puuid === 'string' && participant.puuid === puuid) ?? null;
    playerSummonerName = getLiveParticipantName(selfParticipant) ?? accountNameByPuuid.get(puuid) ?? null;
  }

  if (!playerSummonerName) {
    playerSummonerName = await getCachedAccountNameByPuuid(puuid, region);
  }

  const champions = await Champion.find().select('championName championId key image').lean();

  const championNameByKey = new Map<string, string>();
  const championImageByKey = new Map<string, string>();
  for (const champ of champions as Array<{ championName?: string; championId?: string; key?: string; image?: string }>) {
    const key = typeof champ.key === 'string' ? champ.key.trim() : '';
    const name = typeof champ.championName === 'string' ? champ.championName.trim() : '';
    const image = typeof champ.image === 'string' ? champ.image.trim() : '';
    if (!key || !name) continue;

    championNameByKey.set(key, name);
    if (image) {
      championImageByKey.set(key, image);
    }

    if (typeof champ.championId === 'string' && champ.championId.trim()) {
      const championId = champ.championId.trim();
      championNameByKey.set(championId, name);
      if (image) {
        championImageByKey.set(championId, image);
      }
    }
  }

  const mappedParticipants = participants.map((participant: any) => {
    const championKey = typeof participant?.championId !== 'undefined' && participant?.championId !== null
      ? String(participant.championId).trim() || null
      : null;
    const championName = championKey ? (championNameByKey.get(championKey) ?? null) : null;
    const championImage = championKey ? (championImageByKey.get(championKey) ?? null) : null;
    const mappedParticipant = mapParticipant(participant, championKey, championName, championImage);
    if (mappedParticipant.puuid && !mappedParticipant.summonerName) {
      mappedParticipant.summonerName = accountNameByPuuid.get(mappedParticipant.puuid) ?? null;
    }
    if (mappedParticipant.puuid === puuid && !mappedParticipant.summonerName && playerSummonerName) {
      mappedParticipant.summonerName = playerSummonerName;
    }
    return mappedParticipant;
  });

  const myParticipant = mappedParticipants.find((participant: LiveGameParticipantSummary) => participant.puuid === puuid) ?? null;
  const myTeamId = myParticipant?.teamId ?? mappedParticipants[0]?.teamId ?? null;

  return {
    platform,
    playerPuuid: puuid,
    playerSummonerName,
    gameStartTime: toNumber(data?.gameStartTime ?? data?.gameStartTimestamp ?? data?.gameStartDate),
    gameDuration: toNumber(data?.gameLength ?? data?.gameDuration ?? data?.gameTime),
    myTeam: myTeamId === null ? [] : mappedParticipants.filter((participant: LiveGameParticipantSummary) => participant.teamId === myTeamId),
    enemyTeam: myTeamId === null ? [] : mappedParticipants.filter((participant: LiveGameParticipantSummary) => participant.teamId !== myTeamId),
  };
}
