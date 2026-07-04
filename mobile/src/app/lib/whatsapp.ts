import * as Linking from 'expo-linking';
import type { SelectedItem } from '@app/types/selection';
import type { Item } from '@app/types/catalog';
import { getCategoryName } from '@app/lib/catalog';

export function formatMessage(picked: Array<{ item: Item; variation: string | null }>): string {
  const grouped = new Map<string, Array<{ name: string; variation: string | null }>>();
  for (const p of picked) {
    const list = grouped.get(p.item.category) ?? [];
    list.push({ name: p.item.name, variation: p.variation });
    grouped.set(p.item.category, list);
  }

  const parts: string[] = ['*LISTA DE COMPRAS*', ''];
  const categories = Array.from(grouped.keys()).sort();

  for (const cat of categories) {
    parts.push(`*${getCategoryName(cat as any)}*`);
    const rows = (grouped.get(cat) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    for (const r of rows) {
      const suffix = r.variation ? ` (${r.variation})` : '';
      parts.push(`  - ${r.name}${suffix}`);
    }
    parts.push('');
  }

  return parts.join('\n').trimEnd();
}

export async function openWhatsApp(text: string): Promise<'app' | 'web' | 'failed'> {
  const encoded = encodeURIComponent(text);
  const deep = `whatsapp://send?text=${encoded}`;
  const web = `https://wa.me/?text=${encoded}`;

  try {
    if (await Linking.canOpenURL(deep)) {
      await Linking.openURL(deep);
      return 'app';
    }
  } catch { /* fall through to web */ }

  try {
    await Linking.openURL(web);
    return 'web';
  } catch {
    return 'failed';
  }
}

export function buildSelectionMessage(
  selection: SelectedItem[],
  itemsById: Map<number, Item>
): string {
  const picked = selection
    .map((s) => {
      const item = itemsById.get(s.itemId);
      return item ? { item, variation: s.variationLabel } : null;
    })
    .filter((v): v is { item: Item; variation: string | null } => v !== null);
  return formatMessage(picked);
}
