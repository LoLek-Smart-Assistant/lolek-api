import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import PlayedMatch from '../models/PlayedMatch';
import Item from '../models/Items';
import User from '../models/User';
import riot from '../lib/riotClient';

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function regionFromPlatform(platform: string): 'europe' | 'americas' | 'asia' {
  const normalized = normalizeString(platform).toUpperCase();
  if (['EUW1', 'EUN1', 'TR1', 'RU'].includes(normalized)) return 'europe';
  if (['NA1', 'BR1', 'LA1', 'LA2', 'OC1'].includes(normalized)) return 'americas';
  if (['KR', 'JP1'].includes(normalized)) return 'asia';
  return 'europe';
}

type ItemLookup = Map<string, { itemName: string; image: string | null; customTags: string[] }>;

function collectItemIds(riotMatches: any[]): string[] {
  const ids = new Set<string>();
  for (const riotMatch of riotMatches) {
    const participants = Array.isArray(riotMatch?.info?.participants) ? riotMatch.info.participants : [];
    for (const participant of participants) {
      for (const slot of [0, 1, 2, 3, 4, 5, 6]) {
        const rawItemId = typeof participant?.[`item${slot}`] === 'number' ? participant[`item${slot}`] : 0;
        if (rawItemId > 0) ids.add(String(rawItemId));
      }
    }
  }
  return Array.from(ids);
}

async function buildItemLookupFromDb(ids: string[]): Promise<ItemLookup> {
  const itemLookup: ItemLookup = new Map();
  if (ids.length === 0) return itemLookup;

  const dbItems = await Item.find({ itemId: { $in: ids } })
    .select('itemId itemName image customTags -_id')
    .lean();

  for (const dbItem of dbItems) {
    const key = normalizeString((dbItem as any).itemId);
    if (!key) continue;
    itemLookup.set(key, {
      itemName: normalizeString((dbItem as any).itemName) || key,
      image: typeof (dbItem as any).image === 'string' ? (dbItem as any).image : null,
      customTags: Array.isArray((dbItem as any).customTags) ? (dbItem as any).customTags : [],
    });
  }
  return itemLookup;
}

function toPlayedMatchFromRiotMatch(riotMatch: any, myPuuid: string, itemLookup: ItemLookup) {
  const metadata = riotMatch?.metadata || {};
  const info = riotMatch?.info || {};
  const participants = Array.isArray(info?.participants) ? info.participants : [];
  const teamsFromInfo = Array.isArray(info?.teams) ? info.teams : [];

  const playersByTeam = new Map<number, any[]>();
  for (const participant of participants) {
    const teamId = Number(participant?.teamId) || 0;
    const current = playersByTeam.get(teamId) || [];
    current.push(participant);
    playersByTeam.set(teamId, current);
  }

  const teams = (
    teamsFromInfo.length > 0
      ? teamsFromInfo
      : Array.from(playersByTeam.keys()).map((teamId) => ({ teamId }))
  ).map((team: any, teamIndex: number) => {
    const teamId = String(team?.teamId ?? teamIndex);
    const teamPlayers = playersByTeam.get(Number(team?.teamId)) || [];

    return {
      teamId,
      name: teamId === '100' ? 'Blue' : teamId === '200' ? 'Red' : null,
      won: Boolean(team?.win),
      players: teamPlayers.map((player: any) => ({
        summonerName: normalizeString(player?.summonerName),
        riotId:
          normalizeString(player?.riotIdGameName) && normalizeString(player?.riotIdTagline)
            ? `${normalizeString(player.riotIdGameName)}#${normalizeString(player.riotIdTagline)}`
            : null,
        championName: normalizeString(player?.championName),
        championId: typeof player?.championId === 'number' ? player.championId : null,
        role: normalizeString(player?.role) || null,
        teamPosition: normalizeString(player?.teamPosition) || null,
        items: [0, 1, 2, 3, 4, 5, 6]
          .map((slot) => ({
            slot,
            rawItemId: typeof player?.[`item${slot}`] === 'number' ? player[`item${slot}`] : 0,
          }))
          .filter((item) => item.rawItemId > 0)
          .map((item) => {
            const itemId = String(item.rawItemId);
            const itemMeta = itemLookup.get(itemId);
            if (!itemMeta) return null;
            return {
              itemId,
              itemName: itemMeta.itemName,
              image: itemMeta.image,
              customTags: itemMeta.customTags,
              slot: item.slot,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null),
        kills: typeof player?.kills === 'number' ? player.kills : null,
        deaths: typeof player?.deaths === 'number' ? player.deaths : null,
        assists: typeof player?.assists === 'number' ? player.assists : null,
        level: typeof player?.champLevel === 'number' ? player.champLevel : null,
      })),
    };
  });

  const winnerTeam = teams.find((team: any) => team.won);
  const me = participants.find(
    (participant: any) => normalizeString(participant?.puuid) === normalizeString(myPuuid),
  );
  const myTeamId = me?.teamId != null ? String(me.teamId) : null;
  const didWin = typeof me?.win === 'boolean'
    ? me.win
    : myTeamId != null
      ? winnerTeam?.teamId === myTeamId
      : null;
  const gameCreation = typeof info?.gameCreation === 'number' ? info.gameCreation : null;
  const gameEndTimestamp = typeof info?.gameEndTimestamp === 'number' ? info.gameEndTimestamp : null;
  const gameDuration = typeof info?.gameDuration === 'number' ? info.gameDuration : 0;

  return {
    matchId: normalizeString(metadata?.matchId) || randomUUID(),
    myTeamId,
    didWin,
    source: 'live' as const,
    gameMode: normalizeString(info?.gameMode) || 'UNKNOWN',
    queue: info?.queueId != null ? String(info.queueId) : null,
    durationSeconds: gameDuration >= 0 ? Math.floor(gameDuration) : 0,
    startedAt: gameCreation ? new Date(gameCreation) : null,
    endedAt: gameEndTimestamp
      ? new Date(gameEndTimestamp)
      : gameCreation
        ? new Date(gameCreation + gameDuration * 1000)
        : null,
    winnerTeamId: winnerTeam?.teamId || (teams[0]?.teamId ?? '0'),
    teams,
  };
}

export async function savePlayedMatch(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId).select('puuid platform').lean();
    if (!user?.puuid || !user?.platform) {
      return res.status(400).json({ error: 'Riot profile not linked. Set riotName, riotTag, and platform first.' });
    }
    const userPuuid = user.puuid;

    const requestedCount = Number(req.body?.count);
    const count = Number.isFinite(requestedCount) && requestedCount > 0 ? Math.min(Math.floor(requestedCount), 100) : 20;
    const region = regionFromPlatform(user.platform);

    const matchIds = await riot.getMatchIdsByPUUID(user.puuid, region, { start: 0, count });
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return res.status(201).json({ synced: 0, requested: count, totalFetchedIds: 0, matches: [] });
    }

    const results = await Promise.allSettled(
      matchIds.map((matchId) => riot.getMatchById(matchId, region)),
    );

    const docsToUpsert = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map((result) => result.value);

    const itemIds = collectItemIds(docsToUpsert);
    const itemLookup = await buildItemLookupFromDb(itemIds);

    const mappedMatches = docsToUpsert.map((riotMatch) => toPlayedMatchFromRiotMatch(riotMatch, userPuuid, itemLookup));

    let synced = 0;
    await Promise.all(
      mappedMatches.map(async (payload) => {
        const update = { ...payload, userId };
        const result = await PlayedMatch.updateOne(
          { userId, matchId: payload.matchId },
          { $set: update },
          { upsert: true },
        );
        if (result.upsertedCount > 0 || result.modifiedCount > 0) synced += 1;
      }),
    );

    const matches = await PlayedMatch.find({ userId })
      .sort({ endedAt: -1, createdAt: -1 })
      .limit(count)
      .select('-__v')
      .lean();

    return res.status(201).json({
      synced,
      requested: count,
      totalFetchedIds: matchIds.length,
      matches,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'Failed to sync played matches from Riot API' });
  }
}

export async function getPlayedMatches(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const matches = await PlayedMatch.find({ userId })
      .sort({ endedAt: -1, createdAt: -1 })
      .select('-__v')
      .lean();

    return res.json({ matches });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load played matches' });
  }
}

export async function createCustomPlayedMatch(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      matchId,
      myTeamId = null,
      didWin = null,
      gameMode,
      queue = null,
      durationSeconds,
      startedAt = null,
      endedAt = null,
      winnerTeamId,
      teams,
    } = req.body || {};

    if (!gameMode || !winnerTeamId || !Array.isArray(teams)) {
      return res.status(400).json({ error: 'gameMode, winnerTeamId, and teams are required.' });
    }

    if (!Number.isFinite(Number(durationSeconds)) || Number(durationSeconds) < 0) {
      return res.status(400).json({ error: 'durationSeconds must be a non-negative number.' });
    }

    const created = await PlayedMatch.create({
      matchId: normalizeString(matchId) || `custom-${randomUUID()}`,
      userId,
      myTeamId: myTeamId == null ? null : String(myTeamId),
      didWin: typeof didWin === 'boolean' ? didWin : null,
      source: 'manual',
      gameMode: String(gameMode),
      queue: queue == null ? null : String(queue),
      durationSeconds: Math.floor(Number(durationSeconds)),
      startedAt: startedAt ? new Date(startedAt) : null,
      endedAt: endedAt ? new Date(endedAt) : null,
      winnerTeamId: String(winnerTeamId),
      teams,
    });

    return res.status(201).json({ match: created.toObject() });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'A match with this matchId already exists for this user.' });
    }
    return res.status(400).json({ error: error?.message || 'Failed to create custom match' });
  }
}
