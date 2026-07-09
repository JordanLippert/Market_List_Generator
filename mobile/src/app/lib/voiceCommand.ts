import type { Item } from '@app/types/catalog';

export interface VoiceCommandResult {
  matched: Item[];
  unmatched: string[];
}

const SPLIT_PATTERN = /,| e | and |\n/gi;

export function parseVoiceCommand(text: string, items: Item[]): VoiceCommandResult {
  const fragments = text
    .split(SPLIT_PATTERN)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);

  const matched: Item[] = [];
  const unmatched: string[] = [];
  const seenIds = new Set<number>();

  for (const fragment of fragments) {
    const query = fragment.toLowerCase();
    const found = items.find((item) => item.name.toLowerCase().includes(query));
    if (!found) {
      unmatched.push(fragment);
      continue;
    }
    if (!seenIds.has(found.id)) {
      matched.push(found);
      seenIds.add(found.id);
    }
  }

  return { matched, unmatched };
}
