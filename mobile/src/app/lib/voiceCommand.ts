import type { Item } from '@app/types/catalog';

export interface VoiceCommandResult {
  matched: Item[];
}

interface Candidate {
  item: Item;
  start: number;
  end: number;
}

const LETTER = /\p{L}/u;

function isBoundary(text: string, index: number): boolean {
  if (index < 0 || index >= text.length) return true;
  return !LETTER.test(text[index]);
}

function findWordBoundedOccurrences(haystack: string, needle: string): number[] {
  const positions: number[] = [];
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    const startBoundary = isBoundary(haystack, idx - 1);
    const endBoundary = isBoundary(haystack, idx + needle.length);
    if (startBoundary && endBoundary) {
      positions.push(idx);
    }
    from = idx + 1;
  }
  return positions;
}

export function parseVoiceCommand(text: string, items: Item[]): VoiceCommandResult {
  const normalized = text.toLowerCase();
  if (normalized.trim().length === 0) return { matched: [] };

  const candidates: Candidate[] = [];
  for (const item of items) {
    const name = item.name.toLowerCase();
    for (const start of findWordBoundedOccurrences(normalized, name)) {
      candidates.push({ item, start, end: start + name.length });
    }
  }

  // Longer (more specific) names win overlapping spans; ties keep earlier position first.
  candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);

  const winners: Candidate[] = [];
  const consumedSpans: Array<[number, number]> = [];
  const seenIds = new Set<number>();

  for (const candidate of candidates) {
    if (seenIds.has(candidate.item.id)) continue;
    const overlaps = consumedSpans.some(([s, e]) => candidate.start < e && candidate.end > s);
    if (overlaps) continue;
    winners.push(candidate);
    consumedSpans.push([candidate.start, candidate.end]);
    seenIds.add(candidate.item.id);
  }

  winners.sort((a, b) => a.start - b.start);

  return { matched: winners.map((w) => w.item) };
}
