import { aliases } from './aliases';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyAliases(input: string): string {
  const entries = Object.entries(aliases).sort((a, b) => b[0].length - a[0].length);
  return entries.reduce((output, [from, to]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(from.toLowerCase())}\\b`, 'gi');
    return output.replace(pattern, to);
  }, input);
}

export function normalizeTranscript(transcript: string): string {
  const lowered = transcript.toLowerCase();
  const aliasApplied = applyAliases(lowered);
  return aliasApplied.replace(/\s+/g, ' ').trim();
}

