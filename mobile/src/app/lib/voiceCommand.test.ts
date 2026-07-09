import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from './voiceCommand';
import type { Item } from '@app/types/catalog';

const items: Item[] = [
  { id: 1, name: 'Arroz', category: 'Grains', variations: [{ label: '5kg' }, { label: '1kg' }] },
  { id: 2, name: 'Arroz integral', category: 'Grains', variations: [] },
  { id: 3, name: 'Feijão preto', category: 'Grains', variations: [] },
  { id: 4, name: 'Leite integral', category: 'DairyAndEggs', variations: [] }
];

describe('parseVoiceCommand', () => {
  it('matches multiple items in a phrase with no delimiters (real dictation case)', () => {
    const result = parseVoiceCommand('arroz feijão preto e leite integral', items);
    expect(result.matched.map((i) => i.id)).toEqual([1, 3, 4]);
  });

  it('still works when the user does say commas', () => {
    const result = parseVoiceCommand('arroz, feijão preto, leite integral', items);
    expect(result.matched.map((i) => i.id)).toEqual([1, 3, 4]);
  });

  it('prefers the longer/more specific name on overlap', () => {
    const result = parseVoiceCommand('quero arroz integral', items);
    expect(result.matched.map((i) => i.id)).toEqual([2]);
  });

  it('is case-insensitive', () => {
    const result = parseVoiceCommand('ARROZ', items);
    expect(result.matched.map((i) => i.id)).toEqual([1]);
  });

  it('does not duplicate an item mentioned twice', () => {
    const result = parseVoiceCommand('arroz e arroz', items);
    expect(result.matched.map((i) => i.id)).toEqual([1]);
  });

  it('returns matches ordered by where they appear in the text, not catalog order', () => {
    const result = parseVoiceCommand('leite integral e arroz', items);
    expect(result.matched.map((i) => i.id)).toEqual([4, 1]);
  });

  it('returns empty when nothing matches', () => {
    const result = parseVoiceCommand('produto inexistente', items);
    expect(result.matched).toEqual([]);
  });

  it('ignores blank input', () => {
    const result = parseVoiceCommand('   ', items);
    expect(result.matched).toEqual([]);
  });
});
