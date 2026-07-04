import raw from '../../../../shared/catalog.json';
import type { CatalogFile, CategoryDescriptor, Item, CategoryKey } from '@app/types/catalog';

const catalog = raw as CatalogFile;

const categoriesSorted = [...catalog.categories].sort((a, b) => a.order - b.order);
const categoryOrder = new Map<CategoryKey, number>(
  categoriesSorted.map((c) => [c.key, c.order])
);
const itemsById = new Map<number, Item>(catalog.items.map((i) => [i.id, i]));

export function getCategories(): CategoryDescriptor[] {
  return categoriesSorted;
}

export function getCategoryName(key: CategoryKey): string {
  return categoriesSorted.find((c) => c.key === key)?.name ?? key;
}

export function getItems(): Item[] {
  return catalog.items;
}

export function getItemById(id: number): Item | undefined {
  return itemsById.get(id);
}

export function groupItemsByCategory(): Array<{ descriptor: CategoryDescriptor; items: Item[] }> {
  const groups = new Map<CategoryKey, Item[]>();
  for (const item of catalog.items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return categoriesSorted
    .map((descriptor) => {
      const items = (groups.get(descriptor.key) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      return { descriptor, items };
    })
    .filter((g) => g.items.length > 0)
    .sort((a, b) => (categoryOrder.get(a.descriptor.key) ?? 0) - (categoryOrder.get(b.descriptor.key) ?? 0));
}
