import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import PlayedMatch, { type PlayedMatchSource } from '../models/PlayedMatch';

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSource(value: unknown): PlayedMatchSource {
  return value === 'live' ? 'live' : 'manual';
}

function parseDurationSeconds(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }

  return 0;
}

function normalizeTeams(payload: any) {
  if (!Array.isArray(payload?.teams)) {
    return [];
  }

  return payload.teams.map((team: any, teamIndex: number) => ({
    teamId: normalizeString(team?.teamId) || String(team?.side ?? teamIndex),
    name: normalizeString(team?.name) || null,
    won: Boolean(team?.won),
    players: Array.isArray(team?.players)
      ? team.players.map((player: any) => ({
          summonerName: normalizeString(player?.summonerName),
          riotId: normalizeString(player?.riotId) || null,
          championName: normalizeString(player?.championName),
          championId: player?.championId ?? null,
          role: normalizeString(player?.role) || null,
          teamPosition: normalizeString(player?.teamPosition) || null,
          items: Array.isArray(player?.items)
            ? player.items.map((item: any, slotIndex: number) => ({
                itemId: normalizeString(item?.itemId) || normalizeString(item?.itemName) || String(slotIndex),
                itemName: normalizeString(item?.itemName) || normalizeString(item?.itemId),
                image: normalizeString(item?.image) || null,
                customTags: Array.isArray(item?.customTags) ? item.customTags.map(String) : [],
                slot: typeof item?.slot === 'number' ? item.slot : slotIndex,
              }))
            : [],
          kills: typeof player?.kills === 'number' ? player.kills : null,
          deaths: typeof player?.deaths === 'number' ? player.deaths : null,
          assists: typeof player?.assists === 'number' ? player.assists : null,
          level: typeof player?.level === 'number' ? player.level : null,
        }))
      : [],
  }));
}

function validatePayload(body: any) {
  const matchId = normalizeString(body?.matchId) || randomUUID();
  const gameMode = normalizeString(body?.gameMode);
  const winnerTeamId = normalizeString(body?.winnerTeamId);

  if (!gameMode) {
    throw new Error('gameMode is required.');
  }

  if (!winnerTeamId) {
    throw new Error('winnerTeamId is required.');
  }

  return {
    matchId,
    source: normalizeSource(body?.source),
    gameMode,
    queue: normalizeString(body?.queue) || null,
    durationSeconds: parseDurationSeconds(body?.durationSeconds),
    startedAt: body?.startedAt ? new Date(body.startedAt) : null,
    endedAt: body?.endedAt ? new Date(body.endedAt) : null,
    winnerTeamId,
    teams: normalizeTeams(body),
  };
}

export async function savePlayedMatch(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const payload = validatePayload(req.body);

    const match = await PlayedMatch.findOneAndUpdate(
      { userId, matchId: payload.matchId },
      {
        $set: {
          ...payload,
          userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).select('-__v');

    return res.status(201).json({ match });
  } catch (error: any) {
    const message = error?.message || 'Failed to save played match';
    return res.status(400).json({ error: message });
  }
}

export async function getPlayedMatches(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const matches = await PlayedMatch.find({ userId }).sort({ endedAt: -1, createdAt: -1 }).select('-__v').lean();

    return res.json({ matches });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load played matches' });
  }
}

export async function getPlayedMatchById(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { matchId } = req.params;
    const match = await PlayedMatch.findOne({ userId, matchId }).select('-__v').lean();

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    return res.json({ match });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load played match' });
  }
}