import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from './voiceCommand';
import type { Item } from '@app/types/catalog';

const items: Item[] = [
  { id: 1, name: 'Arroz', category: 'Grains', variations: [{ label: '5kg' }, { label: '1kg' }] },
  { id: 2, name: 'Arroz integral', category: 'Grains', variations: [] },
  { id: 3, name: 'Feijão preto', category: 'Grains', variations: [] },
  { id: 4, name: 'Leite integral', category: 'DairyAndEggs', variations: [] },
  { id: 5, name: 'Mel', category: 'CondimentsAndSpices', variations: [] },
  { id: 6, name: 'Sal', category: 'CondimentsAndSpices', variations: [] },
  { id: 7, name: 'Café', category: 'Beverages', variations: [] }
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

  it('does not match a short item name embedded inside an unrelated word', () => {
    const result = parseVoiceCommand('acho melhor comprar arroz e leite integral', items);
    expect(result.matched.map((i) => i.id)).toEqual([1, 4]);
  });

  it('still matches a short item name when it appears as a standalone word', () => {
    const result = parseVoiceCommand('quero mel e arroz', items);
    expect(result.matched.map((i) => i.id)).toEqual([5, 1]);
  });

  it('finds a standalone mention even when an earlier embedded occurrence of the same name is invalid', () => {
    const result = parseVoiceCommand('salada de sal', items);
    expect(result.matched.map((i) => i.id)).toEqual([6]);
  });

  it('treats accented letters as word characters for boundary checks', () => {
    const result = parseVoiceCommand('quero café gelado', items);
    expect(result.matched.map((i) => i.id)).toEqual([7]);
  });
});
