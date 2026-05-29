type FuseSearchResult<T> = {
  item: T;
  refIndex: number;
  score?: number;
};

type FuseInstance<T> = {
  search: (pattern: string) => Array<FuseSearchResult<T>>;
};

type FuseConstructor = new <T>(list: readonly T[], options?: Record<string, unknown>) => FuseInstance<T>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Fuse = require('fuse.js') as FuseConstructor;

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTokenWindows(text: string, maxWindowSize = 4): string[] {
  const tokens = normalizeForMatch(text).split(' ').filter(Boolean);
  const windows: string[] = [];

  for (let size = 1; size <= Math.min(maxWindowSize, tokens.length); size += 1) {
    for (let start = 0; start <= tokens.length - size; start += 1) {
      windows.push(tokens.slice(start, start + size).join(' '));
    }
  }

  return windows;
}

export function createFuzzyMatcher(candidates: string[]) {
  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
  const normalizedCandidates = uniqueCandidates.map((candidate) => ({
    original: candidate,
    normalized: normalizeForMatch(candidate),
  }));

  const fuse = new Fuse(normalizedCandidates, {
    keys: ['normalized'],
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  function matchSingle(query: string): string | undefined {
    const normalizedQuery = normalizeForMatch(query);
    if (!normalizedQuery) {
      return undefined;
    }

    const exactMatch = normalizedCandidates.find((candidate) => candidate.normalized === normalizedQuery);
    if (exactMatch) {
      return exactMatch.original;
    }

    const result = fuse.search(normalizedQuery)[0];
    if (!result || (result.score ?? 1) > 0.35) {
      return undefined;
    }

    return result.item.original;
  }

  function matchWithinText(text: string): string | undefined {
    const windows = buildTokenWindows(text);

    for (const window of windows) {
      const match = matchSingle(window);
      if (match) {
        return match;
      }
    }

    return matchSingle(text);
  }

  return {
    matchSingle,
    matchWithinText,
  };
}

export function splitCandidatePhrases(text: string): string[] {
  return normalizeForMatch(text)
    .split(/\b(?:and|plus|then|also|with|,|&|\+)\b/gi)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

