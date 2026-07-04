export type CategoryKey =
  | 'Grains'
  | 'Bakery'
  | 'DairyAndEggs'
  | 'Meats'
  | 'Produce'
  | 'CondimentsAndSpices'
  | 'Beverages'
  | 'Snacks'
  | 'Frozen'
  | 'Alcoholic'
  | 'Cleaning'
  | 'PersonalHygiene'
  | 'Pets'
  | 'Utilities';

export interface Variation {
  label: string;
  unit?: string;
  qty?: number;
}

export interface Item {
  id: number;
  name: string;
  category: CategoryKey;
  variations: Variation[];
}

export interface CategoryDescriptor {
  key: CategoryKey;
  name: string;
  order: number;
}

export interface CatalogFile {
  categories: CategoryDescriptor[];
  items: Item[];
}
