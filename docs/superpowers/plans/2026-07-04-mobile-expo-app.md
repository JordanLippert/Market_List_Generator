# Mobile Expo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold and build a personal-use Expo/React Native app under `mobile/` that browses categories from `shared/catalog.json`, marks items, picks variations, sends the list to WhatsApp, persists state locally, and supports history + favorites through bottom sheets.

**Architecture:** Client-only. Metro bundles `shared/catalog.json` at build time via `watchFolders`. A single `ListContext` holds selection + favorites + history and hydrates from AsyncStorage on boot. Three bottom sheets (variation, history, favorites) handle overlays. Kraft/black aesthetic mirrors the web with mobile-idiomatic details (solid hairlines, Reanimated checkbox, haptics, safe-area dock).

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2, TypeScript strict, pnpm, `@gorhom/bottom-sheet` v5, `@react-native-async-storage/async-storage`, `expo-linking`, `expo-haptics`, `expo-font`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/inter`, `@expo-google-fonts/jetbrains-mono`.

---

## File Structure

**Create (all under `mobile/`):**

- `package.json` — pnpm-managed, expo scripts
- `app.json` — Expo config
- `index.ts` — entrypoint
- `tsconfig.json` — strict + resolveJsonModule + path aliases
- `metro.config.js` — watchFolders for `../shared`
- `babel.config.js` — expo default preset
- `src/app/config/env.ts` — reserved (empty for now)
- `src/app/types/catalog.ts` — Item, Variation, CategoryDescriptor
- `src/app/types/selection.ts` — SelectedItem, HistoryEntry
- `src/app/lib/storage.ts` — AsyncStorage wrapper
- `src/app/lib/catalog.ts` — imports JSON, helpers
- `src/app/lib/haptics.ts` — expo-haptics wrapper
- `src/app/lib/whatsapp.ts` — formatMessage + openWhatsApp
- `src/app/contexts/ListContext.tsx` — state provider
- `src/ui/App.tsx` — root component
- `src/ui/styles/theme/index.ts` — colors, fonts, spacing
- `src/ui/styles/utils/createVariants.ts` — variant helper
- `src/ui/components/AppText.tsx`
- `src/ui/components/Button/index.tsx`
- `src/ui/components/Button/styles.ts`
- `src/ui/components/Sheet/index.tsx` — wrapper around @gorhom/bottom-sheet
- `src/ui/components/VariationSheet.tsx`
- `src/ui/components/HistorySheet.tsx`
- `src/ui/components/FavoritesSheet.tsx`
- `src/ui/screens/Home/index.tsx`
- `src/ui/screens/Home/styles.ts`
- `src/ui/screens/Home/components/Masthead.tsx`
- `src/ui/screens/Home/components/SearchBar.tsx`
- `src/ui/screens/Home/components/CategoryCard.tsx`
- `src/ui/screens/Home/components/ItemRow.tsx`
- `src/ui/screens/Home/components/Dock.tsx`

Nothing outside `mobile/` is modified.

---

## Task 1: Scaffold Expo 57 app in `mobile/`

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/app.json`
- Create: `mobile/index.ts`
- Create: `mobile/babel.config.js`
- Create: `mobile/tsconfig.json`
- Create: `mobile/metro.config.js`
- Create: `mobile/.gitignore`

- [ ] **Step 1: Create the package.json**

Write `mobile/package.json`:

```json
{
  "name": "market-list-mobile",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~57.0.2",
    "expo-font": "~14.1.0",
    "expo-haptics": "~15.1.0",
    "expo-linking": "~9.1.0",
    "expo-splash-screen": "~32.0.0",
    "expo-status-bar": "~4.1.0",
    "react": "19.2.7",
    "react-native": "0.86.0",
    "react-native-gesture-handler": "~2.30.0",
    "react-native-reanimated": "~4.6.0",
    "react-native-safe-area-context": "5.9.0",
    "react-native-screens": "~4.20.0",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@gorhom/bottom-sheet": "^5.2.7",
    "@expo-google-fonts/space-grotesk": "^0.4.1",
    "@expo-google-fonts/inter": "^0.4.1",
    "@expo-google-fonts/jetbrains-mono": "^0.4.1"
  },
  "devDependencies": {
    "@babel/core": "^7.28.5",
    "@types/react": "~19.1.10",
    "typescript": "~5.9.3"
  }
}
```

Note: if `pnpm install` complains about specific version resolutions with Expo 57 (e.g., a peer expects a different `react-native-reanimated`), run `npx expo install --check` after `pnpm install` and let Expo pin the compatible versions. Commit the resulting `package.json` changes.

- [ ] **Step 2: Create the Expo config**

Write `mobile/app.json`:

```json
{
  "expo": {
    "name": "Lista",
    "slug": "market-list-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "backgroundColor": "#F5F1E8",
      "resizeMode": "contain"
    },
    "ios": {
      "bundleIdentifier": "com.jordanlippert.marketlist",
      "supportsTablet": false
    },
    "android": {
      "package": "com.jordanlippert.marketlist",
      "edgeToEdgeEnabled": true,
      "adaptiveIcon": {
        "backgroundColor": "#F5F1E8"
      }
    },
    "web": {
      "bundler": "metro"
    }
  }
}
```

Icon files aren't shipped in this plan (add later). Expo will use its default until custom assets are provided.

- [ ] **Step 3: Create the entrypoint**

Write `mobile/index.ts`:

```ts
import { registerRootComponent } from 'expo';
import App from './src/ui/App';

registerRootComponent(App);
```

- [ ] **Step 4: Create the Babel config**

Write `mobile/babel.config.js`:

```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin']
  };
};
```

Reanimated's plugin must be listed last.

- [ ] **Step 5: Create the tsconfig**

Write `mobile/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "./",
    "paths": {
      "@app/*": ["./src/app/*"],
      "@ui/*": ["./src/ui/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "index.ts", "app.json"]
}
```

- [ ] **Step 6: Create the Metro config**

Write `mobile/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the shared/ folder so Metro picks up catalog.json changes.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../shared')
];

module.exports = config;
```

- [ ] **Step 7: Create the mobile .gitignore**

Write `mobile/.gitignore`:

```
node_modules/
.expo/
dist/
web-build/
*.log
.env
.env.*
!/env.example
android/
ios/
```

- [ ] **Step 8: Install deps**

Run: `cd mobile && pnpm install`
Expected: dependencies resolved, `pnpm-lock.yaml` created, no errors.

If Expo prints a version mismatch warning, run: `pnpm dlx expo install --check` and accept the pins.

- [ ] **Step 9: Verify typecheck runs (there is nothing to typecheck yet — the sources come in later tasks)**

Run: `cd mobile && pnpm typecheck`
Expected: `error TS18003: No inputs were found`. That's fine — it confirms tsc is wired but there are no `.ts` files yet.

- [ ] **Step 10: Commit**

```bash
git add mobile/
git commit -m "feat(mobile): scaffold Expo 57 app with pnpm"
```

---

## Task 2: Types

**Files:**
- Create: `mobile/src/app/types/catalog.ts`
- Create: `mobile/src/app/types/selection.ts`

- [ ] **Step 1: Catalog types**

Write `mobile/src/app/types/catalog.ts`:

```ts
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
```

- [ ] **Step 2: Selection types**

Write `mobile/src/app/types/selection.ts`:

```ts
export interface SelectedItem {
  itemId: number;
  variationLabel: string | null;
}

export interface HistoryEntry {
  sentAt: string; // ISO
  items: SelectedItem[];
}
```

- [ ] **Step 3: Typecheck**

Run: `cd mobile && pnpm typecheck`
Expected: no output (types-only files pass).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/types/
git commit -m "feat(mobile): domain types for catalog and selection"
```

---

## Task 3: Theme tokens

**Files:**
- Create: `mobile/src/ui/styles/theme/index.ts`

- [ ] **Step 1: Write theme**

Write `mobile/src/ui/styles/theme/index.ts`:

```ts
import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
    paper:  '#F5F1E8',
    paper2: '#EDE7D8',
    ink:    '#0A0A0A',
    ink2:   '#2A2724',
    muted:  '#6B6357',
    go:     '#25D366',
    goInk:  '#062B14'
  },
  fontFamily: {
    display:     'SpaceGrotesk_700Bold',
    body:        'Inter_500Medium',
    bodyRegular: 'Inter_400Regular',
    mono:        'JetBrainsMono_500Medium'
  },
  fontSize: {
    xs: 11, sm: 13, base: 15, lg: 18, xl: 24, '2xl': 34, '3xl': 56
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  hairline: StyleSheet.hairlineWidth
} as const;

export type Theme = typeof theme;
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/styles/theme/
git commit -m "feat(mobile): kraft/black theme tokens"
```

---

## Task 4: `createVariants` utility

**Files:**
- Create: `mobile/src/ui/styles/utils/createVariants.ts`

- [ ] **Step 1: Write util**

Write `mobile/src/ui/styles/utils/createVariants.ts`:

```ts
import { StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;

interface VariantsConfig<V extends Record<string, Record<string, Style>>> {
  base?: Style;
  variants: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] };
}

type VariantProps<V extends Record<string, Record<string, Style>>> = {
  [K in keyof V]?: keyof V[K];
};

export function createVariants<V extends Record<string, Record<string, Style>>>(
  config: VariantsConfig<V>
) {
  return function styleFor(props: VariantProps<V> = {}): StyleProp<Style> {
    const merged: Style[] = [];
    if (config.base) merged.push(config.base);

    for (const key in config.variants) {
      const chosen = (props[key] ?? config.defaultVariants?.[key]) as keyof V[typeof key] | undefined;
      if (chosen && config.variants[key][chosen as string]) {
        merged.push(config.variants[key][chosen as string]);
      }
    }
    return merged;
  };
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/styles/utils/
git commit -m "feat(mobile): createVariants util"
```

---

## Task 5: `AppText` component

**Files:**
- Create: `mobile/src/ui/components/AppText.tsx`

- [ ] **Step 1: Write component**

Write `mobile/src/ui/components/AppText.tsx`:

```tsx
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { theme } from '@ui/styles/theme';

type Family = 'display' | 'body' | 'bodyRegular' | 'mono';
type Size = keyof typeof theme.fontSize;
type Color = keyof typeof theme.colors;

export interface AppTextProps extends TextProps {
  family?: Family;
  size?: Size;
  color?: Color;
  uppercase?: boolean;
}

export function AppText({
  family = 'bodyRegular',
  size = 'base',
  color = 'ink',
  uppercase,
  style,
  children,
  ...rest
}: AppTextProps) {
  const composed: TextStyle = {
    fontFamily: theme.fontFamily[family],
    fontSize: theme.fontSize[size],
    color: theme.colors[color],
    textTransform: uppercase ? 'uppercase' : 'none',
    letterSpacing: family === 'mono' ? 0.4 : family === 'display' ? -0.4 : 0
  };
  return (
    <Text {...rest} style={[composed, style]}>
      {children}
    </Text>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/components/AppText.tsx
git commit -m "feat(mobile): AppText typography wrapper"
```

---

## Task 6: `Button` component

**Files:**
- Create: `mobile/src/ui/components/Button/index.tsx`
- Create: `mobile/src/ui/components/Button/styles.ts`

- [ ] **Step 1: Styles**

Write `mobile/src/ui/components/Button/styles.ts`:

```ts
import { StyleSheet } from 'react-native';
import { theme } from '@ui/styles/theme';

export const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(245, 241, 232, 0.35)'
  },
  ghostDark: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.ink
  },
  go: {
    backgroundColor: theme.colors.go,
    borderColor: theme.colors.go
  },
  disabled: { opacity: 0.5 },
  labelGhost: { color: 'rgba(245, 241, 232, 0.85)' },
  labelGhostDark: { color: theme.colors.ink },
  labelGo: { color: theme.colors.goInk }
});
```

- [ ] **Step 2: Component**

Write `mobile/src/ui/components/Button/index.tsx`:

```tsx
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { styles } from './styles';

export type ButtonVariant = 'ghost' | 'ghostDark' | 'go';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, variant = 'ghost', disabled, style, ...rest }: ButtonProps) {
  const surface = variant === 'go' ? styles.go : variant === 'ghostDark' ? styles.ghostDark : styles.ghost;
  const labelStyle = variant === 'go' ? styles.labelGo : variant === 'ghostDark' ? styles.labelGhostDark : styles.labelGhost;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.base, surface, disabled && styles.disabled, style]}
      {...rest}
    >
      <AppText family="display" size="sm" style={labelStyle}>
        {label}
      </AppText>
    </Pressable>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/components/Button/
git commit -m "feat(mobile): Button with ghost/ghostDark/go variants"
```

---

## Task 7: Catalog lib

**Files:**
- Create: `mobile/src/app/lib/catalog.ts`

- [ ] **Step 1: Write lib**

Write `mobile/src/app/lib/catalog.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/app/lib/catalog.ts
git commit -m "feat(mobile): load shared catalog.json + helpers"
```

---

## Task 8: Storage lib

**Files:**
- Create: `mobile/src/app/lib/storage.ts`

- [ ] **Step 1: Write lib**

Write `mobile/src/app/lib/storage.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const StorageKeys = {
  current:   '@lista/current',
  history:   '@lista/history',
  favorites: '@lista/favorites'
} as const;
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/app/lib/storage.ts
git commit -m "feat(mobile): AsyncStorage JSON wrapper"
```

---

## Task 9: Haptics lib

**Files:**
- Create: `mobile/src/app/lib/haptics.ts`

- [ ] **Step 1: Write lib**

Write `mobile/src/app/lib/haptics.ts`:

```ts
import * as Haptics from 'expo-haptics';

export function selection(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function light(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/app/lib/haptics.ts
git commit -m "feat(mobile): haptics wrapper"
```

---

## Task 10: WhatsApp lib

**Files:**
- Create: `mobile/src/app/lib/whatsapp.ts`

- [ ] **Step 1: Write lib**

Write `mobile/src/app/lib/whatsapp.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/app/lib/whatsapp.ts
git commit -m "feat(mobile): WhatsApp formatMessage + openWhatsApp"
```

---

## Task 11: `ListContext` provider

**Files:**
- Create: `mobile/src/app/contexts/ListContext.tsx`

- [ ] **Step 1: Write provider**

Write `mobile/src/app/contexts/ListContext.tsx`:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SelectedItem, HistoryEntry } from '@app/types/selection';
import type { Item } from '@app/types/catalog';
import { getJSON, setJSON, StorageKeys } from '@app/lib/storage';
import { getItemById } from '@app/lib/catalog';
import { buildSelectionMessage, openWhatsApp } from '@app/lib/whatsapp';
import * as haptics from '@app/lib/haptics';

const HISTORY_LIMIT = 20;
const SAVE_DEBOUNCE_MS = 300;

interface ListState {
  selection: SelectedItem[];
  favorites: SelectedItem[];
  history: HistoryEntry[];
  isHydrated: boolean;

  isSelected(itemId: number): boolean;
  getSelectedVariation(itemId: number): string | null | undefined;
  toggle(itemId: number, variationLabel?: string | null): void;
  clear(): void;

  isFavorite(itemId: number, variationLabel?: string | null): boolean;
  toggleFavorite(itemId: number, variationLabel?: string | null): void;
  addAllFavoritesToSelection(): void;

  send(): Promise<void>;
  restoreFromHistory(entry: HistoryEntry): void;
}

const Context = createContext<ListState | null>(null);

function sameFav(a: SelectedItem, itemId: number, variationLabel?: string | null): boolean {
  return a.itemId === itemId && (a.variationLabel ?? null) === (variationLabel ?? null);
}

export function ListProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<SelectedItem[]>([]);
  const [favorites, setFavorites] = useState<SelectedItem[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from storage
  useEffect(() => {
    (async () => {
      const [current, favs, hist] = await Promise.all([
        getJSON<SelectedItem[]>(StorageKeys.current, []),
        getJSON<SelectedItem[]>(StorageKeys.favorites, []),
        getJSON<HistoryEntry[]>(StorageKeys.history, [])
      ]);
      setSelection(current);
      setFavorites(favs);
      setHistory(hist);
      setIsHydrated(true);
    })();
  }, []);

  // Debounced save of selection
  const selectionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isHydrated) return;
    if (selectionSaveTimer.current) clearTimeout(selectionSaveTimer.current);
    selectionSaveTimer.current = setTimeout(() => {
      setJSON(StorageKeys.current, selection).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (selectionSaveTimer.current) clearTimeout(selectionSaveTimer.current);
    };
  }, [selection, isHydrated]);

  // Debounced save of favorites
  const favSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isHydrated) return;
    if (favSaveTimer.current) clearTimeout(favSaveTimer.current);
    favSaveTimer.current = setTimeout(() => {
      setJSON(StorageKeys.favorites, favorites).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (favSaveTimer.current) clearTimeout(favSaveTimer.current);
    };
  }, [favorites, isHydrated]);

  // History persists immediately (small writes at send time only)
  useEffect(() => {
    if (!isHydrated) return;
    setJSON(StorageKeys.history, history).catch(() => {});
  }, [history, isHydrated]);

  const isSelected = useCallback(
    (itemId: number) => selection.some((s) => s.itemId === itemId),
    [selection]
  );
  const getSelectedVariation = useCallback(
    (itemId: number) => selection.find((s) => s.itemId === itemId)?.variationLabel,
    [selection]
  );

  const toggle = useCallback((itemId: number, variationLabel: string | null = null) => {
    haptics.selection();
    setSelection((prev) => {
      const idx = prev.findIndex((s) => s.itemId === itemId);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { itemId, variationLabel: variationLabel ?? null }];
    });
  }, []);

  const clear = useCallback(() => {
    setSelection([]);
  }, []);

  const isFavorite = useCallback(
    (itemId: number, variationLabel: string | null = null) =>
      favorites.some((f) => sameFav(f, itemId, variationLabel)),
    [favorites]
  );

  const toggleFavorite = useCallback((itemId: number, variationLabel: string | null = null) => {
    haptics.light();
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => sameFav(f, itemId, variationLabel));
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { itemId, variationLabel }];
    });
  }, []);

  const addAllFavoritesToSelection = useCallback(() => {
    setSelection((prev) => {
      const next = [...prev];
      for (const f of favorites) {
        if (!next.some((s) => s.itemId === f.itemId)) {
          next.push({ itemId: f.itemId, variationLabel: f.variationLabel });
        }
      }
      return next;
    });
  }, [favorites]);

  const restoreFromHistory = useCallback((entry: HistoryEntry) => {
    setSelection(entry.items);
  }, []);

  const send = useCallback(async () => {
    if (selection.length === 0) return;
    const itemsById = new Map<number, Item>();
    for (const s of selection) {
      const item = getItemById(s.itemId);
      if (item) itemsById.set(item.id, item);
    }
    const text = buildSelectionMessage(selection, itemsById);
    const result = await openWhatsApp(text);
    if (result === 'failed') return;

    haptics.success();
    setHistory((prev) => {
      const entry: HistoryEntry = { sentAt: new Date().toISOString(), items: selection };
      const next = [entry, ...prev];
      return next.slice(0, HISTORY_LIMIT);
    });
    setSelection([]);
  }, [selection]);

  const value = useMemo<ListState>(
    () => ({
      selection,
      favorites,
      history,
      isHydrated,
      isSelected,
      getSelectedVariation,
      toggle,
      clear,
      isFavorite,
      toggleFavorite,
      addAllFavoritesToSelection,
      send,
      restoreFromHistory
    }),
    [
      selection, favorites, history, isHydrated,
      isSelected, getSelectedVariation, toggle, clear,
      isFavorite, toggleFavorite, addAllFavoritesToSelection, send, restoreFromHistory
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useList(): ListState {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useList must be used inside <ListProvider>');
  return ctx;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/app/contexts/ListContext.tsx
git commit -m "feat(mobile): ListContext state + AsyncStorage hydration"
```

---

## Task 12: Sheet wrapper

**Files:**
- Create: `mobile/src/ui/components/Sheet/index.tsx`

- [ ] **Step 1: Write wrapper**

Write `mobile/src/ui/components/Sheet/index.tsx`:

```tsx
import React, { forwardRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps
} from '@gorhom/bottom-sheet';
import { theme } from '@ui/styles/theme';

interface SheetProps {
  snapPoints: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
}

export const Sheet = forwardRef<BottomSheet, SheetProps>(function Sheet({ snapPoints, children, onClose }, ref) {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
    ),
    []
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      onClose={onClose}
    >
      <BottomSheetView style={styles.body}>
        <View style={{ flex: 1 }}>{children}</View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  background: { backgroundColor: theme.colors.paper, borderRadius: 0 },
  handle: { backgroundColor: theme.colors.ink, width: 44, height: 4 },
  body: { flex: 1, paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[3] }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/components/Sheet/
git commit -m "feat(mobile): Sheet wrapper over @gorhom/bottom-sheet"
```

---

## Task 13: `VariationSheet`

**Files:**
- Create: `mobile/src/ui/components/VariationSheet.tsx`

- [ ] **Step 1: Write sheet**

Write `mobile/src/ui/components/VariationSheet.tsx`:

```tsx
import React, { forwardRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import type { Item } from '@app/types/catalog';
import * as haptics from '@app/lib/haptics';

interface VariationSheetProps {
  item: Item | null;
  onPick(label: string): void;
  onCancel(): void;
}

export const VariationSheet = forwardRef<BottomSheet, VariationSheetProps>(function VariationSheet(
  { item, onPick, onCancel },
  ref
) {
  return (
    <Sheet ref={ref} snapPoints={['auto']} onClose={onCancel}>
      <AppText family="display" size="lg" color="ink">Escolha a variação</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.item}>
        {item?.name ?? ''}
      </AppText>

      <View style={styles.chips}>
        {item?.variations.map((v) => (
          <Pressable
            key={v.label}
            accessibilityRole="button"
            accessibilityLabel={`Escolher ${v.label}`}
            onPress={() => {
              haptics.light();
              onPick(v.label);
            }}
            style={styles.chip}
          >
            <AppText family="display" size="sm" color="ink">{v.label}</AppText>
          </Pressable>
        )) ?? null}
      </View>

      <View style={styles.actions}>
        <Button label="Cancelar" variant="ghostDark" onPress={onCancel} />
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  item: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing[4] },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: theme.spacing[6] }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/components/VariationSheet.tsx
git commit -m "feat(mobile): VariationSheet with chip picker"
```

---

## Task 14: `HistorySheet`

**Files:**
- Create: `mobile/src/ui/components/HistorySheet.tsx`

- [ ] **Step 1: Write sheet**

Write `mobile/src/ui/components/HistorySheet.tsx`:

```tsx
import React, { forwardRef, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import type { HistoryEntry } from '@app/types/selection';

interface HistorySheetProps {
  entries: HistoryEntry[];
  onRestore(entry: HistoryEntry): void;
  onClose(): void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const HistorySheet = forwardRef<BottomSheet, HistorySheetProps>(function HistorySheet(
  { entries, onRestore, onClose },
  ref
) {
  const [confirming, setConfirming] = useState<HistoryEntry | null>(null);

  const handleRestore = (entry: HistoryEntry) => {
    onRestore(entry);
    setConfirming(null);
    onClose();
  };

  return (
    <Sheet ref={ref} snapPoints={['50%', '90%']} onClose={onClose}>
      <AppText family="display" size="lg" color="ink">Histórico</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.subtitle}>
        últimos envios
      </AppText>

      {entries.length === 0 ? (
        <AppText family="mono" size="sm" color="muted" style={styles.empty}>
          sem histórico ainda
        </AppText>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.sentAt}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Restaurar seleção de ${formatDate(item.sentAt)}`}
              onPress={() => setConfirming(item)}
              style={styles.row}
            >
              <AppText family="mono" size="sm" color="ink">{formatDate(item.sentAt)}</AppText>
              <AppText family="mono" size="xs" color="muted">{item.items.length} itens</AppText>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      {confirming && (
        <View style={styles.confirm}>
          <AppText family="body" size="sm" color="ink" style={styles.confirmText}>
            Restaurar seleção? Isso substitui a lista atual.
          </AppText>
          <View style={styles.confirmActions}>
            <Button label="Cancelar" variant="ghostDark" onPress={() => setConfirming(null)} />
            <Button label="Restaurar" variant="ghostDark" onPress={() => handleRestore(confirming)} />
          </View>
        </View>
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  subtitle: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  empty: { textAlign: 'center', marginTop: theme.spacing[8] },
  row: {
    paddingVertical: theme.spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  sep: { height: theme.hairline, backgroundColor: theme.colors.ink },
  confirm: {
    borderTopWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingTop: theme.spacing[4],
    marginTop: theme.spacing[4]
  },
  confirmText: { marginBottom: theme.spacing[3] },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/components/HistorySheet.tsx
git commit -m "feat(mobile): HistorySheet with restore confirmation"
```

---

## Task 15: `FavoritesSheet`

**Files:**
- Create: `mobile/src/ui/components/FavoritesSheet.tsx`

- [ ] **Step 1: Write sheet**

Write `mobile/src/ui/components/FavoritesSheet.tsx`:

```tsx
import React, { forwardRef } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import type { SelectedItem } from '@app/types/selection';
import { getItemById } from '@app/lib/catalog';
import * as haptics from '@app/lib/haptics';

interface FavoritesSheetProps {
  favorites: SelectedItem[];
  onAddAll(): void;
  onRemove(fav: SelectedItem): void;
  onClose(): void;
}

export const FavoritesSheet = forwardRef<BottomSheet, FavoritesSheetProps>(function FavoritesSheet(
  { favorites, onAddAll, onRemove, onClose },
  ref
) {
  return (
    <Sheet ref={ref} snapPoints={['40%', '80%']} onClose={onClose}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText family="display" size="lg" color="ink">Favoritos</AppText>
          <AppText family="mono" size="xs" color="muted">segure pra remover</AppText>
        </View>
        {favorites.length > 0 && (
          <Button
            label="Adicionar tudo"
            variant="ghostDark"
            onPress={() => {
              haptics.light();
              onAddAll();
              onClose();
            }}
          />
        )}
      </View>

      {favorites.length === 0 ? (
        <AppText family="mono" size="sm" color="muted" style={styles.empty}>
          sem favoritos — segure em um item pra favoritar
        </AppText>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(f) => `${f.itemId}:${f.variationLabel ?? ''}`}
          renderItem={({ item }) => {
            const catalogItem = getItemById(item.itemId);
            const label = catalogItem?.name ?? `#${item.itemId}`;
            const suffix = item.variationLabel ? ` (${item.variationLabel})` : '';
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover ${label}${suffix}`}
                onLongPress={() => {
                  haptics.light();
                  onRemove(item);
                }}
                style={styles.row}
              >
                <AppText family="body" size="base" color="ink">{label}{suffix}</AppText>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4]
  },
  empty: { textAlign: 'center', marginTop: theme.spacing[8] },
  row: { paddingVertical: theme.spacing[3] },
  sep: { height: theme.hairline, backgroundColor: theme.colors.ink }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/components/FavoritesSheet.tsx
git commit -m "feat(mobile): FavoritesSheet with long-press remove"
```

---

## Task 16: `Masthead` component

**Files:**
- Create: `mobile/src/ui/screens/Home/components/Masthead.tsx`

- [ ] **Step 1: Write component**

Write `mobile/src/ui/screens/Home/components/Masthead.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import * as haptics from '@app/lib/haptics';

interface MastheadProps {
  totalItems: number;
  onOpenHistory(): void;
  onOpenFavorites(): void;
}

function today(): { date: string; day: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
  const dayNames = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  return { date, day: dayNames[now.getDay()] };
}

export function Masthead({ totalItems, onOpenHistory, onOpenFavorites }: MastheadProps) {
  const { date, day } = today();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText family="display" size="3xl" color="ink" style={styles.wordmark}>Lista.</AppText>
        <View style={{ flex: 1 }} />
        <View style={styles.stampCol}>
          <AppText family="mono" size="xs" color="ink">{date}</AppText>
          <AppText family="mono" size="xs" color="muted">{day}</AppText>
        </View>
      </View>

      <View style={styles.subRow}>
        <AppText family="mono" size="xs" color="muted">
          compra da semana — <AppText family="mono" size="xs" color="ink2">{totalItems} produtos disponíveis</AppText>
        </AppText>

        <View style={styles.iconBtns}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir histórico"
            hitSlop={12}
            onPress={() => {
              haptics.light();
              onOpenHistory();
            }}
            style={styles.iconBtn}
          >
            <AppText family="mono" size="sm" color="ink">Hist</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir favoritos"
            hitSlop={12}
            onPress={() => {
              haptics.light();
              onOpenFavorites();
            }}
            style={styles.iconBtn}
          >
            <AppText family="mono" size="sm" color="ink">★</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingBottom: theme.spacing[4],
    marginBottom: theme.spacing[4]
  },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  wordmark: { lineHeight: 56 },
  stampCol: { alignItems: 'flex-end' },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing[2]
  },
  iconBtns: { flexDirection: 'row', gap: 12 },
  iconBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6
  }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/screens/Home/components/Masthead.tsx
git commit -m "feat(mobile): Masthead with wordmark + sheet triggers"
```

---

## Task 17: `SearchBar` component

**Files:**
- Create: `mobile/src/ui/screens/Home/components/SearchBar.tsx`

- [ ] **Step 1: Write component**

Write `mobile/src/ui/screens/Home/components/SearchBar.tsx`:

```tsx
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';

interface SearchBarProps {
  value: string;
  onChangeText(v: string): void;
}

export function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <AppText family="mono" size="xs" color="muted" uppercase>buscar &gt;</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="digite um produto..."
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Buscar produto"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: theme.spacing[4]
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink,
    padding: 0
  }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/screens/Home/components/SearchBar.tsx
git commit -m "feat(mobile): SearchBar filter input"
```

---

## Task 18: `ItemRow` component with Reanimated checkbox

**Files:**
- Create: `mobile/src/ui/screens/Home/components/ItemRow.tsx`

- [ ] **Step 1: Write component**

Write `mobile/src/ui/screens/Home/components/ItemRow.tsx`:

```tsx
import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import type { Item } from '@app/types/catalog';

interface ItemRowProps {
  item: Item;
  checked: boolean;
  variation: string | null;
  isFavorite: boolean;
  onPress(): void;
  onLongPress(): void;
}

export function ItemRow({ item, checked, variation, isFavorite, onPress, onLongPress }: ItemRowProps) {
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 140 });
  }, [checked, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: theme.colors.ink,
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }]
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={item.name + (variation ? ` (${variation})` : '')}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={styles.row}
    >
      <View style={styles.box}>
        <Animated.View style={[StyleSheet.absoluteFillObject, fillStyle]} />
      </View>
      <AppText family={checked ? 'body' : 'bodyRegular'} size="base" color={checked ? 'muted' : 'ink2'} style={styles.label}>
        {item.name}
      </AppText>
      {variation && (
        <AppText family="mono" size="xs" color="muted">({variation})</AppText>
      )}
      {isFavorite && (
        <AppText family="display" size="sm" color="ink" style={styles.fav}>★</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  box: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    overflow: 'hidden'
  },
  label: { flex: 1 },
  fav: { marginLeft: 6 }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/screens/Home/components/ItemRow.tsx
git commit -m "feat(mobile): ItemRow with animated checkbox"
```

---

## Task 19: `CategoryCard` component

**Files:**
- Create: `mobile/src/ui/screens/Home/components/CategoryCard.tsx`

- [ ] **Step 1: Write component**

Write `mobile/src/ui/screens/Home/components/CategoryCard.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import type { Item, CategoryDescriptor } from '@app/types/catalog';
import { ItemRow } from './ItemRow';
import { useList } from '@app/contexts/ListContext';

interface CategoryCardProps {
  descriptor: CategoryDescriptor;
  items: Item[];
  selectedCount: number;
  onItemPress(item: Item): void;
  onItemLongPress(item: Item): void;
}

export function CategoryCard({ descriptor, items, selectedCount, onItemPress, onItemLongPress }: CategoryCardProps) {
  const list = useList();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AppText family="display" size="xs" color="ink">●</AppText>
        <AppText family="display" size="lg" color="ink" style={styles.title}>
          {descriptor.name.toLowerCase()}
        </AppText>
        <AppText family="mono" size="xs" color="muted">
          <AppText family="mono" size="xs" color="ink">{selectedCount}</AppText>
          /{items.length}
        </AppText>
      </View>

      <View style={styles.rows}>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            checked={list.isSelected(item.id)}
            variation={list.getSelectedVariation(item.id) ?? null}
            isFavorite={list.isFavorite(item.id, list.getSelectedVariation(item.id) ?? null)}
            onPress={() => onItemPress(item)}
            onLongPress={() => onItemLongPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[4],
    marginBottom: -1.5 // hairline grid: overlap borders
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingBottom: theme.spacing[3],
    borderBottomWidth: theme.hairline,
    borderColor: theme.colors.ink
  },
  title: { flex: 1, textTransform: 'lowercase' },
  rows: { marginTop: theme.spacing[2] }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/screens/Home/components/CategoryCard.tsx
git commit -m "feat(mobile): CategoryCard listing items"
```

---

## Task 20: `Dock` component

**Files:**
- Create: `mobile/src/ui/screens/Home/components/Dock.tsx`

- [ ] **Step 1: Write component**

Write `mobile/src/ui/screens/Home/components/Dock.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';

interface DockProps {
  count: number;
  onClear(): void;
  onSelectVisible(): void;
  onSend(): void;
  disabled?: boolean;
}

export function Dock({ count, onClear, onSelectVisible, onSend, disabled }: DockProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
      <View style={styles.countCol}>
        <AppText family="display" size="2xl" color="paper">{count}</AppText>
        <AppText family="mono" size="xs" color="muted" uppercase>itens marcados</AppText>
      </View>
      <View style={styles.actions}>
        <Button label="Limpar" variant="ghost" onPress={onClear} />
        <Button label="Marcar visíveis" variant="ghost" onPress={onSelectVisible} />
        <Button label="Enviar →" variant="go" onPress={onSend} disabled={disabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: theme.colors.ink,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3]
  },
  countCol: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: theme.spacing[3] },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/screens/Home/components/Dock.tsx
git commit -m "feat(mobile): Dock with safe-area bottom"
```

---

## Task 21: `Home` screen composition

**Files:**
- Create: `mobile/src/ui/screens/Home/index.tsx`

- [ ] **Step 1: Write screen**

Write `mobile/src/ui/screens/Home/index.tsx`:

```tsx
import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type BottomSheet from '@gorhom/bottom-sheet';
import { theme } from '@ui/styles/theme';
import { Masthead } from './components/Masthead';
import { SearchBar } from './components/SearchBar';
import { CategoryCard } from './components/CategoryCard';
import { Dock } from './components/Dock';
import { VariationSheet } from '@ui/components/VariationSheet';
import { HistorySheet } from '@ui/components/HistorySheet';
import { FavoritesSheet } from '@ui/components/FavoritesSheet';
import { groupItemsByCategory, getItems } from '@app/lib/catalog';
import { useList } from '@app/contexts/ListContext';
import type { Item } from '@app/types/catalog';

export function HomeScreen() {
  const list = useList();
  const [query, setQuery] = useState('');
  const [variationTarget, setVariationTarget] = useState<Item | null>(null);

  const variationRef = useRef<BottomSheet>(null);
  const historyRef = useRef<BottomSheet>(null);
  const favoritesRef = useRef<BottomSheet>(null);

  const groups = useMemo(() => groupItemsByCategory(), []);
  const totalItems = useMemo(() => getItems().length, []);

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (q === '') return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const visibleItemIds = useMemo(
    () => new Set(filteredGroups.flatMap((g) => g.items.map((i) => i.id))),
    [filteredGroups]
  );

  const handleItemPress = (item: Item) => {
    if (item.variations.length > 0 && !list.isSelected(item.id)) {
      setVariationTarget(item);
      variationRef.current?.expand();
      return;
    }
    list.toggle(item.id);
  };

  const handleItemLongPress = (item: Item) => {
    list.toggleFavorite(item.id, list.getSelectedVariation(item.id) ?? null);
  };

  const handleVariationPick = (label: string) => {
    if (variationTarget) {
      list.toggle(variationTarget.id, label);
      variationRef.current?.close();
      setVariationTarget(null);
    }
  };

  const handleSelectVisible = () => {
    for (const g of filteredGroups) {
      for (const item of g.items) {
        if (item.variations.length > 0) continue; // skip items needing choice
        if (!list.isSelected(item.id)) {
          list.toggle(item.id);
        }
      }
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Masthead
          totalItems={totalItems}
          onOpenHistory={() => historyRef.current?.expand()}
          onOpenFavorites={() => favoritesRef.current?.expand()}
        />
        <SearchBar value={query} onChangeText={setQuery} />
        {filteredGroups.map((g) => {
          const selected = g.items.reduce((n, i) => (list.isSelected(i.id) ? n + 1 : n), 0);
          return (
            <CategoryCard
              key={g.descriptor.key}
              descriptor={g.descriptor}
              items={g.items}
              selectedCount={selected}
              onItemPress={handleItemPress}
              onItemLongPress={handleItemLongPress}
            />
          );
        })}
      </ScrollView>

      <Dock
        count={list.selection.length}
        onClear={list.clear}
        onSelectVisible={handleSelectVisible}
        onSend={list.send}
        disabled={list.selection.length === 0}
      />

      <VariationSheet
        ref={variationRef}
        item={variationTarget}
        onPick={handleVariationPick}
        onCancel={() => {
          variationRef.current?.close();
          setVariationTarget(null);
        }}
      />
      <HistorySheet
        ref={historyRef}
        entries={list.history}
        onRestore={(entry) => list.restoreFromHistory(entry)}
        onClose={() => historyRef.current?.close()}
      />
      <FavoritesSheet
        ref={favoritesRef}
        favorites={list.favorites}
        onAddAll={() => list.addAllFavoritesToSelection()}
        onRemove={(fav) => list.toggleFavorite(fav.itemId, fav.variationLabel)}
        onClose={() => favoritesRef.current?.close()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.paper },
  scroll: { padding: theme.spacing[4], paddingBottom: 200 }
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && pnpm typecheck
git add mobile/src/ui/screens/Home/index.tsx
git commit -m "feat(mobile): Home screen composition with sheets"
```

---

## Task 22: `App.tsx` root with fonts + providers

**Files:**
- Create: `mobile/src/ui/App.tsx`

- [ ] **Step 1: Write App**

Write `mobile/src/ui/App.tsx`:

```tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { ListProvider, useList } from '@app/contexts/ListContext';
import { HomeScreen } from '@ui/screens/Home';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const list = useList();

  useEffect(() => {
    if (fontsLoaded && list.isHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, list.isHydrated]);

  if (!fontsLoaded || !list.isHydrated) return null;
  return <HomeScreen />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ListProvider>
            <StatusBar style="dark" />
            <Gate fontsLoaded={fontsLoaded} />
          </ListProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Note: `@expo-google-fonts/*` packages export raw font maps that `useFonts` from `expo-font` consumes to register all families in one call.

- [ ] **Step 2: Typecheck**

Run: `cd mobile && pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/ui/App.tsx
git commit -m "feat(mobile): App root with providers + font gate"
```

---

## Task 23: Manual smoke test on a device

- [ ] **Step 1: Start the dev server**

Run: `cd mobile && pnpm start`
Expected: Metro bundler starts, QR code shown. If it complains about incompatible SDK versions in Expo Go, use a dev client instead: `pnpm dlx expo prebuild` then `pnpm ios` or `pnpm android`.

- [ ] **Step 2: Load on a device**

Scan the QR with Expo Go (iOS) or the Camera app (Android → opens Expo Go), or press `i` / `a` in the terminal to open a simulator.

- [ ] **Step 3: Smoke checklist**

Verify each on the device:

1. Splash disappears once fonts + storage are ready.
2. Wordmark `Lista.` renders, date + day of week correct.
3. Search filters live; empty categories hide.
4. Tap an item WITHOUT variations (e.g., Arroz integral) → checkbox fills with animation; counter increments; category count updates.
5. Tap an item WITH variations (Arroz) → sheet opens, three chips visible.
6. Pick a chip → sheet closes, item marked, `(5kg)` appears next to the name; counter increments; haptic tap felt.
7. Long-press an item → star appears next to it (favorite added), haptic light felt.
8. Open Favorites sheet from the header → the favorited item is listed. Tap "Adicionar tudo" → item enters selection.
9. Long-press an item in Favorites → item removed with haptic.
10. Tap `Enviar →` → WhatsApp opens (or wa.me web fallback if WA not installed) with the correctly formatted message including `(5kg)` where applicable. Success haptic felt.
11. Selection cleared, history entry added. Kill the app and reopen → previous state is remembered.
12. Open History sheet → the sent entry is shown with date + item count. Tap → confirmation appears. Confirm → selection restored.

- [ ] **Step 4: If any step fails**

Diagnose and fix. Don't proceed until the golden path is clean. If a fix touches the plan's task boundaries, commit with a `fix(mobile): …` message.

- [ ] **Step 5: Commit checklist notes if you made fixes**

Otherwise nothing to commit.

---

## Definition of Done

- `pnpm typecheck` passes cleanly in `mobile/`.
- `pnpm start` boots Metro without errors and the app runs on at least one platform (iOS simulator, Android emulator, or Expo Go).
- All twelve smoke-checklist items pass end-to-end.
- No changes to files outside `mobile/`.
- No new dependencies in the .NET web project.
- The catalog import path resolves; changing `shared/catalog.json` and reloading Metro reflects the new items.
- AsyncStorage keys behave as specified (state survives app restart).
- WhatsApp integration works: text message opens the app (or web fallback) with the correctly formatted list.
