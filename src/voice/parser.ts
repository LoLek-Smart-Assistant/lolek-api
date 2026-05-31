import { loadChampions } from './champions';
import { createFuzzyMatcher, splitCandidatePhrases } from './fuzzyMatcher';
import { loadItems } from './items';
import { normalizeTranscript } from './normalizer';
import { ParsedVoiceCommand, VoiceIntent } from './types';

const recommendationPatterns = [
  /\bwhat should i build\b/i,
  /\bwhat do i build\b/i,
  /\bwhat should i buy\b/i,
  /\bwhat (?:do|should) i (?:buy|build)\b/i,
  /\brecommend(?:ation)?\b/i,
  /\bsuggest (?:a )?build\b/i,
];

const enemyBuildPatterns = [
  /\b\w+\s+built\b/i,
  /\b\w+\s+has\s+/i,
  /\b\w+\s+got\s+/i,
  /\b\w+\s+with\s+/i,
  /\benemy\s+build\b/i,
];

const enemyBuildRemovePatterns = [
  /\b\w+\s+remove\b/i,
  /\bremove\s+\w+/i,
  /\b\w+\s+sell\b/i,
  /\bsell\s+\w+/i,
  /\bundo\b/i,
];

function detectIntent(transcript: string): VoiceIntent {
  if (recommendationPatterns.some((pattern) => pattern.test(transcript))) {
    return 'recommendation_request';
  }

  if (enemyBuildRemovePatterns.some((pattern) => pattern.test(transcript))) {
    return 'enemy_build_remove';
  }

  if (enemyBuildPatterns.some((pattern) => pattern.test(transcript))) {
    return 'enemy_build_update';
  }

  return 'enemy_build_update';
}

function stripIntentWords(transcript: string): string {
  return transcript
    .replace(/\b(?:built|buys|bought|has|have|got|gotten|with|remove|removed|sell|sold|undo)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractItemSection(transcript: string): string {
  const match = transcript.match(/\b(?:built|buys|bought|has|have|got|with|remove|removed|sell|sold|undo)\b(.*)$/i);
  if (!match) {
    return transcript;
  }

  return match[1].trim();
}

function extractChampionGuess(transcript: string): string {
  const match = transcript.match(/^(.*?)\b(?:built|buys|bought|has|have|got|with|remove|removed|sell|sold|undo)\b/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  return transcript;
}

export async function parseVoiceTranscript(rawTranscript: string): Promise<ParsedVoiceCommand> {
  const transcript = normalizeTranscript(rawTranscript);
  const intent = detectIntent(transcript);

  if (intent === 'recommendation_request') {
    return { intent };
  }

  const [champions, items] = await Promise.all([loadChampions(), loadItems()]);
  const championMatcher = createFuzzyMatcher(champions);
  const itemMatcher = createFuzzyMatcher(items);

  const championGuess = stripIntentWords(extractChampionGuess(transcript));
  const champion = championMatcher.matchWithinText(championGuess);

  const itemSection = stripIntentWords(extractItemSection(transcript));
  const segments = splitCandidatePhrases(itemSection);
  const parsedItems = segments
    .map((segment) => itemMatcher.matchWithinText(segment))
    .filter((item): item is string => Boolean(item));

  const uniqueItems = Array.from(new Set(parsedItems));

  const parsed: ParsedVoiceCommand = { intent };
  if (champion) {
    parsed.champion = champion;
  }
  if (uniqueItems.length > 0) {
    parsed.items = uniqueItems;
  }

  return parsed;
}

