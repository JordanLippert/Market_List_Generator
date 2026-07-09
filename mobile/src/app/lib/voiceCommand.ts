import type { Item } from '@app/types/catalog';

export interface VoiceCommandResult {
  matched: Item[];
}

interface Candidate {
  item: Item;
  start: number;
  end: number;
}

export function parseVoiceCommand(text: string, items: Item[]): VoiceCommandResult {
  const normalized = text.toLowerCase();
  if (normalized.trim().length === 0) return { matched: [] };

  const candidates: Candidate[] = [];
  for (const item of items) {
    const name = item.name.toLowerCase();
    const start = normalized.indexOf(name);
    if (start !== -1) {
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
