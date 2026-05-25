import { IncomingMessage, Server as HttpServer } from 'http';
import { URL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import riot from '../lib/riotClient';
import { buildLiveGameSummary, LiveGameSummaryPayload, platformToRegion } from '../services/liveGameSummary';

const DEFAULT_INTERVAL_MS = 15000;
const MIN_INTERVAL_MS = 10000;
const LIVE_SUMMARY_CACHE_TTL_MS = 10000;

const liveSummaryCache = new Map<string, { expiresAt: number; payload: LiveGameSummaryPayload }>();
const pendingLiveSummaryRequests = new Map<string, Promise<LiveGameSummaryPayload>>();

function safeSend(socket: WebSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function parseRequestUrl(req: IncomingMessage) {
  return new URL(req.url ?? '', 'http://localhost');
}

async function getCachedLiveGameSummary(
  platform: string,
  puuid: string,
  playerSummonerName: string | null
): Promise<LiveGameSummaryPayload> {
  const cacheKey = `${platform}:${puuid}`;
  const cached = liveSummaryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const pending = pendingLiveSummaryRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = buildLiveGameSummary({ platform, puuid, playerSummonerName })
    .then((payload) => {
      liveSummaryCache.set(cacheKey, {
        expiresAt: Date.now() + LIVE_SUMMARY_CACHE_TTL_MS,
        payload,
      });
      return payload;
    })
    .finally(() => {
      pendingLiveSummaryRequests.delete(cacheKey);
    });

  pendingLiveSummaryRequests.set(cacheKey, request);
  return request;
}

async function resolvePuuidFromQuery(url: URL): Promise<{ platform: string; puuid: string; playerSummonerName: string | null } | null> {
  const platform = (url.searchParams.get('platform') ?? '').toUpperCase();
  const puuid = (url.searchParams.get('puuid') ?? '').trim();
  const gameName = (url.searchParams.get('gameName') ?? '').trim();
  const tagLine = (url.searchParams.get('tagLine') ?? '').trim();

  if (!platform) {
    return null;
  }

  if (puuid) {
    return { platform, puuid, playerSummonerName: null };
  }

  if (!gameName || !tagLine) {
    return null;
  }

  const region = platformToRegion(platform);
  const account: any = await riot.getAccount(gameName, tagLine, region);
  const resolvedPuuid = typeof account?.puuid === 'string' ? account.puuid.trim() : '';

  if (!resolvedPuuid) {
    return null;
  }

  const resolvedGameName = typeof account?.gameName === 'string' && account.gameName.trim() ? account.gameName.trim() : gameName;
  const resolvedTagLine = typeof account?.tagLine === 'string' && account.tagLine.trim() ? account.tagLine.trim() : tagLine;

  return { platform, puuid: resolvedPuuid, playerSummonerName: `${resolvedGameName}#${resolvedTagLine}` };
}

export function registerLiveGameSummarySocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/live-game-summary' });

  wss.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
    const url = parseRequestUrl(req);
    const intervalMs = Math.max(MIN_INTERVAL_MS, Number(url.searchParams.get('intervalMs') ?? String(DEFAULT_INTERVAL_MS)) || DEFAULT_INTERVAL_MS);

    let resolved: { platform: string; puuid: string; playerSummonerName: string | null } | null = null;
    try {
      resolved = await resolvePuuidFromQuery(url);
    } catch (error: any) {
      safeSend(socket, {
        type: 'error',
        message: error?.message || 'Failed to resolve Riot account',
        details: error?.response?.data || null,
      });
      socket.close(1008, 'Unable to resolve Riot account');
      return;
    }

    if (!resolved) {
      safeSend(socket, {
        type: 'error',
        message: 'platform is required and either puuid or gameName/tagLine must be provided',
      });
      socket.close(1008, 'Missing required query params');
      return;
    }

    const { platform, puuid, playerSummonerName } = resolved;
    let active = true;
    let interval: NodeJS.Timeout | undefined;

    const emitSnapshot = async () => {
      if (!active) return;

      try {
        const summary = await getCachedLiveGameSummary(platform, puuid, playerSummonerName);
        safeSend(socket, {
          type: 'live-game-summary',
          status: 'live',
          data: summary,
        });
      } catch (error: any) {
        const statusCode = error?.response?.status;
        if (statusCode === 404) {
          safeSend(socket, {
            type: 'live-game-summary',
            status: 'waiting',
            message: 'No active game found yet',
          });
          return;
        }
        if (statusCode === 429) {
          safeSend(socket, {
            type: 'live-game-summary',
            status: 'rate_limited',
            message: 'Riot API rate limit reached. Waiting before the next refresh.',
          });
          return;
        }

        safeSend(socket, {
          type: 'error',
          message: error?.message || 'Failed to fetch live game summary',
          details: error?.response?.data || null,
        });
      }
    };

    safeSend(socket, {
      type: 'connected',
      message: 'Subscribed to live game summary',
      platform,
      intervalMs,
    });

    await emitSnapshot();
    interval = setInterval(emitSnapshot, intervalMs);

    const cleanup = () => {
      active = false;
      if (interval) {
        clearInterval(interval);
      }
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  });

  return wss;
}

