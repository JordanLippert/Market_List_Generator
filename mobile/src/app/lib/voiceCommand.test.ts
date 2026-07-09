import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from './voiceCommand';
import type { Item } from '@app/types/catalog';

const items: Item[] = [
  { id: 1, name: 'Arroz', category: 'Grains', variations: [{ label: '5kg' }, { label: '1kg' }] },
  { id: 2, name: 'Feijão preto', category: 'Grains', variations: [] },
  { id: 3, name: 'Leite integral', category: 'DairyAndEggs', variations: [] }
];

describe('parseVoiceCommand', () => {
  it('matches multiple items separated by commas', () => {
    const result = parseVoiceCommand('arroz, feijão preto', items);
    expect(result.matched.map((i) => i.id)).toEqual([1, 2]);
    expect(result.unmatched).toEqual([]);
  });

  it('matches items separated by " e "', () => {
    const result = parseVoiceCommand('arroz e leite integral', items);
    expect(result.matched.map((i) => i.id)).toEqual([1, 3]);
  });

  it('reports unmatched fragments', () => {
    const result = parseVoiceCommand('arroz, xuxu', items);
    expect(result.matched.map((i) => i.id)).toEqual([1]);
    expect(result.unmatched).toEqual(['xuxu']);
  });

  it('is case-insensitive', () => {
    const result = parseVoiceCommand('ARROZ', items);
    expect(result.matched.map((i) => i.id)).toEqual([1]);
  });

  it('does not duplicate an item mentioned twice', () => {
    const result = parseVoiceCommand('arroz, arroz', items);
    expect(result.matched.map((i) => i.id)).toEqual([1]);
  });

  it('returns everything unmatched when nothing is found', () => {
    const result = parseVoiceCommand('produto inexistente', items);
    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual(['produto inexistente']);
  });

  it('ignores blank input', () => {
    const result = parseVoiceCommand('   ', items);
    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual([]);
  });
});
