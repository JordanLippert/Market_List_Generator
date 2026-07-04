# Mobile Expo App — Market List

**Date:** 2026-07-04
**Author:** Jordan Lippert (via Claude Code)
**Status:** Design approved, ready for implementation plan
**Depends on:** `2026-07-04-shared-catalog-and-web-variations-design.md` (produces `shared/catalog.json` consumed here)

## Summary

Build a personal-use Expo/React Native app that replicates the market-list web workflow on a phone: browse categories, mark items, pick a variation when one exists, send the list to WhatsApp. The app persists selection between launches, keeps a rolling history of previously sent lists, and supports a favorites list. It is a pure client — no backend, no auth, no sync.

The app lives at `mobile/` in this repo, alongside the .NET web project, and consumes `shared/catalog.json` directly. Visual identity mirrors the web (kraft paper background, black hairlines, WhatsApp green only on the send button), but adapts to mobile idioms (solid hairlines, animated custom checkbox, haptic feedback, safe-area-aware dock, bottom sheets for overlays).

## Motivation

- The web app works but requires a browser session on each phone. A native app removes that friction for the primary use case (in-store shopping).
- We already produced a single source of truth for the catalog. A companion mobile client validates that decision by consuming the same data end-to-end.
- The web has no persistence, so the shopper loses their progress if they navigate away or reload. A mobile-first app can save state locally by default.

## Non-goals

- Backend, remote sync, multi-device state, auth. Out of scope.
- App Store / Play Store publishing in this spec (local dev builds + internal TestFlight/APK are enough for now).
- Editing the catalog from the app.
- Camera, barcode scanning, price tracking, quantity inputs.
- Notifications, background tasks.
- Dark mode / theme switching.

## Design

### Repo layout

```
Market_List_Generator/               (repo root, unchanged .NET web at top)
├── Market_List_Generator/           (.NET web + web TS)
├── shared/
│   └── catalog.json                 (source of truth; already in place)
├── mobile/                          NEW
│   ├── package.json                 (pnpm; expo, react, react-native, sheet libs)
│   ├── app.json                     (Expo config: name, bundle id placeholders, icons)
│   ├── index.ts                     (registerRootComponent(App))
│   ├── tsconfig.json                (strict; paths @app/* @ui/*)
│   ├── metro.config.js              (watchFolders += ../shared)
│   ├── babel.config.js              (module-resolver for path aliases if needed)
│   └── src/
│       ├── app/                     (infra)
│       │   ├── config/env.ts        (Zod-validated; empty for now, reserved)
│       │   ├── contexts/
│       │   │   └── ListContext.tsx  (selection + favorites + history state)
│       │   ├── lib/
│       │   │   ├── storage.ts       (AsyncStorage getJSON / setJSON typed wrapper)
│       │   │   ├── catalog.ts       (imports ../../../../shared/catalog.json; helpers)
│       │   │   ├── whatsapp.ts      (formatMessage + openWhatsApp)
│       │   │   └── haptics.ts       (thin wrapper over expo-haptics)
│       │   └── types/
│       │       ├── catalog.ts       (Item, Variation, CategoryDescriptor types)
│       │       └── selection.ts     (SelectedItem, HistoryEntry types)
│       └── ui/                      (visual layer)
│           ├── App.tsx              (root component; wires everything up)
│           ├── screens/Home/
│           │   ├── index.tsx        (masthead + search + grid + dock + sheet triggers)
│           │   ├── styles.ts
│           │   └── components/
│           │       ├── Masthead.tsx
│           │       ├── SearchBar.tsx
│           │       ├── CategoryCard.tsx
│           │       ├── ItemRow.tsx  (checkbox + label + long-press to favorite)
│           │       └── Dock.tsx
│           ├── components/
│           │   ├── AppText.tsx      (adapted from foodiary)
│           │   ├── Button/          (adapted from foodiary; ghost + go variants)
│           │   ├── Sheet/           (thin wrapper around @gorhom/bottom-sheet)
│           │   ├── VariationSheet.tsx
│           │   ├── HistorySheet.tsx
│           │   └── FavoritesSheet.tsx
│           └── styles/
│               ├── theme/index.ts   (colors, fontFamily, fontSize, spacing)
│               └── utils/createVariants.ts
├── docs/superpowers/…
└── Dockerfile                       (web only; mobile is not deployed by Docker)
```

### Toolchain and versions

- **Expo SDK 57** (latest at time of writing).
- **React Native 0.86**.
- **React 19.2**.
- **TypeScript** strict; `noImplicitAny`, `strictNullChecks`, `resolveJsonModule: true` (so the catalog import compiles), path aliases `@app/*` → `./src/app/*`, `@ui/*` → `./src/ui/*`.
- **pnpm** as the package manager (init inside `mobile/`, its own `pnpm-lock.yaml`).

### Catalog loading

- `metro.config.js` includes `path.resolve(__dirname, '../shared')` in `watchFolders` so Metro watches the JSON for changes during development.
- `src/app/lib/catalog.ts` imports the JSON with a relative path: `import catalog from '../../../../shared/catalog.json'`. Metro bundles JSON natively.
- The module exposes:
  - `getCategories(): CategoryDescriptor[]` — sorted by `order`.
  - `getItems(): Item[]` — sorted by category order then item name.
  - `getItemById(id: number): Item | undefined`.
  - `groupItemsByCategory(): Map<CategoryKey, Item[]>`.
- Types are declared in `src/app/types/catalog.ts` and mirror the JSON schema (`Item`, `Variation`, `CategoryDescriptor`) with camelCase.

### State: `ListContext`

Single React context provides the whole app state and mutators. Backed by AsyncStorage.

```ts
type SelectedItem = { itemId: number; variationLabel: string | null };
type HistoryEntry = { sentAt: string /* ISO */; items: SelectedItem[] };

interface ListState {
  selection: SelectedItem[];
  favorites: SelectedItem[];
  history: HistoryEntry[];

  isSelected(itemId: number): boolean;
  getSelectedVariation(itemId: number): string | null | undefined;
  toggle(itemId: number, variationLabel?: string | null): void;
  clear(): void;

  isFavorite(itemId: number, variationLabel?: string | null): boolean;
  toggleFavorite(itemId: number, variationLabel?: string | null): void;
  addAllFavoritesToSelection(): void;

  send(): Promise<void>; // formats, opens WhatsApp, appends to history, clears selection
  restoreFromHistory(entry: HistoryEntry): void;

  isHydrated: boolean;
}
```

Behavior notes:

- On mount, the provider reads the three AsyncStorage keys and calls `setIsHydrated(true)`. UI shows the splash until hydration completes.
- Writes to `selection` and `favorites` are debounced to 300 ms before hitting AsyncStorage, batching rapid taps.
- `send()`:
  1. Builds the WhatsApp message from the current `selection` and the catalog (grouped by category, ordered by name, appends `(variation)` when set).
  2. Calls `openWhatsApp(message)` (see below).
  3. Only on successful `openURL` (or fallback), appends `{ sentAt: new Date().toISOString(), items: selection }` to `history`, cap at 20 (drop oldest), then calls `clear()`.

Storage keys:

- `@lista/current` → `SelectedItem[]`
- `@lista/history` → `HistoryEntry[]` (FIFO, max 20)
- `@lista/favorites` → `SelectedItem[]`

### AsyncStorage wrapper

`src/app/lib/storage.ts`:

```ts
export async function getJSON<T>(key: string, fallback: T): Promise<T>
export async function setJSON<T>(key: string, value: T): Promise<void>
export async function remove(key: string): Promise<void>
```

Catches JSON parse errors and returns the fallback (defensive against a corrupted write). No schema validation for now; the shape is controlled by our own writes.

### WhatsApp handoff

`src/app/lib/whatsapp.ts`:

```ts
export function formatMessage(items: SelectedItem[], catalog: Item[]): string
export async function openWhatsApp(text: string): Promise<'app' | 'web' | 'failed'>
```

- `formatMessage` produces the exact same output as the .NET `HomeController.FormatMessage`. Categories bolded (`*Grãos e Farinhas*`), items bulleted (`  - Arroz (5kg)` or `  - Arroz`).
- `openWhatsApp`:
  1. `encodeURIComponent(text)`.
  2. `Linking.canOpenURL('whatsapp://send?text=x')`.
  3. If true, `Linking.openURL('whatsapp://send?text=<encoded>')`, return `'app'`.
  4. If false, `Linking.openURL('https://wa.me/?text=<encoded>')`, return `'web'`.
  5. If both throw, log and return `'failed'` so the caller can show a toast (out of scope: toast lib; for now, silent fail is fine).

### Sheets

All three sheets use `@gorhom/bottom-sheet` v5 (supports New Architecture). A thin `Sheet` wrapper standardizes drag handle style (`var(--ink)` bar), backdrop (dimmed kraft), and animation config.

**VariationSheet:** appears when the user taps an item that has non-empty `variations`. Props: `{ item: Item; onPick(label: string): void; onCancel(): void }`. Renders the item name in mono utility text and a wrap of chip buttons for each variation label. No "sem variação" option (matches web decision — modal forces a choice). Snap: `['auto']`. On chip tap: haptic light + `onPick(label)` + close.

**HistorySheet:** props: `{ entries: HistoryEntry[]; onRestore(entry): void }`. Rows show `dd.MM · HH:mm` + item count. Tapping a row opens an inline confirmation ("Restaurar seleção? Isso substitui a lista atual.") with two buttons. Snap: `['50%', '90%']`. Empty state: mono text "sem histórico ainda".

**FavoritesSheet:** props: `{ favorites: SelectedItem[]; onAddAll(): void; onRemove(fav): void }`. Rows show item name + optional variation. Long-press removes with a haptic warning. Header has "adicionar tudo à lista". Snap: `['40%', '80%']`. Empty state: "sem favoritos — segure em um item pra favoritar".

Sheet triggers live inside the `Masthead` component as small icon buttons to the right of the wordmark: 🕐 opens history, ★ opens favorites. Both are `Pressable` with `hitSlop` and a subtle haptic on press.

### Home screen composition

`ui/screens/Home/index.tsx` composes:

- `Masthead` — wordmark `Lista.` (Space Grotesk 700, compact size on mobile ~48–56pt), date/day stamp on the right in mono, and the two sheet-trigger buttons.
- `SearchBar` — persistent below the masthead, mono placeholder `buscar > digite um produto…`. Filters items live (case-insensitive substring match on `label`). When a category has zero visible items, hide the whole card.
- `<FlatList>` of `CategoryCard` — sectioned by category, ordered by `descriptor.order`. Each card contains its title (lowercase, Space Grotesk 700), a mono `N/total` counter, and its `ItemRow`s.
- `ItemRow` — animated checkbox (Reanimated: opacity + scale on the fill), label, optional `(variation)` suffix in mono muted. `onPress`: if the item has variations, open `VariationSheet`; otherwise toggle. `onLongPress`: toggle favorite with `Haptics.impactAsync(Light)`.
- `Dock` — fixed at the bottom, black background, respects `useSafeAreaInsets().bottom`. Contains the big count (Space Grotesk 700), "itens marcados" label (mono uppercase), and three buttons: `Limpar`, `Marcar visíveis`, `Enviar →` (WhatsApp green, disabled when `selection.length === 0`).

### Theme

`ui/styles/theme/index.ts`:

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
    goInk:  '#062B14',
  },
  fontFamily: {
    display:      'SpaceGrotesk_700Bold',
    body:         'Inter_500Medium',
    bodyRegular:  'Inter_400Regular',
    mono:         'JetBrainsMono_500Medium',
  },
  fontSize: {
    xs: 11, sm: 13, base: 15, lg: 18, xl: 24, '2xl': 34, '3xl': 56,
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  hairline: StyleSheet.hairlineWidth,
} as const;
```

Font packages:

- `@expo-google-fonts/space-grotesk` (weights 500, 700)
- `@expo-google-fonts/inter` (weights 400, 500, 600)
- `@expo-google-fonts/jetbrains-mono` (weights 400, 500)
- `expo-font` for `useFonts`

`ui/styles/utils/createVariants.ts`: copied verbatim from foodiary and generalized where possible.

### `App.tsx`

```tsx
export default function App() {
  const [fontsLoaded] = useFonts({ /* Space Grotesk, Inter, JetBrains Mono */ });
  if (!fontsLoaded) return null; // splash covers this

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ListProvider>
            <StatusBar style="dark" />
            <HomeScreen />
          </ListProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Splash screen is kept visible until fonts are loaded AND `ListProvider.isHydrated === true`, then hidden with `SplashScreen.hideAsync()`.

### Haptics policy

- Selection tap / toggle → `Haptics.selectionAsync()`.
- Long-press favorite toggle → `Haptics.impactAsync(Light)`.
- Successful `send()` → `Haptics.notificationAsync(Success)`.
- Cancel dialog / cancel favorite removal → no haptic.

If the device has haptics disabled at the OS level, the calls are no-ops — no fallback needed.

### Accessibility

- All buttons are `Pressable` with `accessibilityRole="button"` and a meaningful `accessibilityLabel` (Portuguese).
- Checkbox uses `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}`.
- Text respects the OS font scaling by default (no `allowFontScaling={false}`).
- Reduced-motion: Reanimated respects `AccessibilityInfo.isReduceMotionEnabled()` — if true, the checkbox fill is instant, no scale bounce.

## Testing strategy

Given the app is a single-user utility with no backend, testing is intentionally minimal:

- `pnpm typecheck` (`tsc --noEmit`) in CI or pre-commit.
- Manual smoke: install to a real device via `expo run:android` or `expo run:ios`, tap through the golden path (open → mark items with and without variations → send → confirm WhatsApp draft → verify history entry → verify selection cleared), and the two edge paths (favorite via long-press → open favorites sheet → add all; open history → restore).
- No unit tests for the utility for now. If the state layer grows (e.g., sync one day), add Jest + Testing Library at that point.

## Rollout

- Not published to stores in this spec.
- Local dev via `pnpm start` in `mobile/`, scanned by Expo Go on a phone, or `expo run:ios` / `expo run:android` for a native dev build.
- Ad-hoc distribution (TestFlight internal / APK) is a follow-up when the app feels ready.

## Explicit decisions worth flagging

- **No "sem variação" chip in the sheet.** Matches the web decision.
- **One variation per item per list.** A single row represents a single item; there is no way to buy Arroz 5kg AND Arroz 1kg in the same trip without re-picking. Deferred as a future exploration.
- **No global search across categories.** Search is filter-in-place; category cards hide when they end up with zero visible items.
- **No push notifications, no background tasks.** The app is only useful in-app.
- **Metro watches `../shared`.** When the catalog changes, HMR picks it up. The catalog is a build-time import, not a runtime fetch, so a change requires an app reload — acceptable trade-off vs. bundling a fetch stack.

## Follow-ups (out of scope here)

- Multi-variation-per-item support if the shopping pattern ever requires it (would need a per-row multi-select model).
- Sharing a list to other apps besides WhatsApp (Share API).
- iCloud/Play Games Services-style backup of history and favorites.
- Publishing to stores.

## Open questions

None. Every decision resolved during brainstorm.
