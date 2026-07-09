# Voice Command Item Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user dictate a phrase (e.g. "arroz, feijão e leite") via a dedicated voice-entry sheet, and have the app mark all recognized items in the list at once.

**Architecture:** OS keyboard dictation types into a plain `TextInput` inside a new bottom sheet (no Web Speech API — unsupported on iOS Safari). On submit, a pure `parseVoiceCommand` function splits the phrase into fragments and substring-matches each against the full catalog. Matched items get toggled into the selection (skipping already-selected ones, defaulting to the first variation where applicable); a `Toast` banner reports what was added.

**Tech Stack:** React Native (Expo web), existing `ListContext`/`catalog` libs, `@gorhom/bottom-sheet` (`Sheet` component), vitest (new devDependency, for testing the pure parser).

Spec: `docs/superpowers/specs/2026-07-08-voice-command-selection-design.md`

---

### Task 1: Add vitest test tooling

**Files:**
- Modify: `mobile/package.json`
- Create: `mobile/vitest.config.ts`

- [ ] **Step 1: Install vitest as a dev dependency**

Run (from `mobile/`):
```bash
pnpm add -D vitest
```

- [ ] **Step 2: Add the test script**

In `mobile/package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 3: Create the vitest config with path aliases**

Create `mobile/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'src/app'),
      '@ui': resolve(__dirname, 'src/ui')
    }
  }
});
```

- [ ] **Step 4: Verify vitest runs with zero test files**

Run: `pnpm test`
Expected: `No test files found` (non-zero exit is fine here — no tests exist yet)

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts pnpm-lock.yaml
git commit -m "chore(mobile): add vitest for testing pure logic modules"
```

---

### Task 2: `parseVoiceCommand` pure function

**Files:**
- Create: `mobile/src/app/lib/voiceCommand.ts`
- Test: `mobile/src/app/lib/voiceCommand.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/app/lib/voiceCommand.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './voiceCommand'` (file doesn't exist yet)

- [ ] **Step 3: Write the implementation**

Create `mobile/src/app/lib/voiceCommand.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/voiceCommand.ts src/app/lib/voiceCommand.test.ts
git commit -m "feat(mobile): add parseVoiceCommand for multi-item voice phrases"
```

---

### Task 3: `Toast` component

**Files:**
- Create: `mobile/src/ui/components/Toast.tsx`

- [ ] **Step 1: Implement the component**

Create `mobile/src/ui/components/Toast.tsx`:
```tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';

interface ToastProps {
  message: string | null;
  onDismiss(): void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + theme.spacing[3] }]} pointerEvents="none">
      <AppText family="mono" size="xs" color="paper" style={styles.text}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: theme.spacing[4],
    right: theme.spacing[4],
    backgroundColor: theme.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  text: { textAlign: 'center' }
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/Toast.tsx
git commit -m "feat(mobile): add Toast banner component"
```

---

### Task 4: `VoiceCommandSheet` component

**Files:**
- Create: `mobile/src/ui/components/VoiceCommandSheet.tsx`

- [ ] **Step 1: Implement the component**

Create `mobile/src/ui/components/VoiceCommandSheet.tsx`:
```tsx
import React, { forwardRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';

interface VoiceCommandSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
}

export const VoiceCommandSheet = forwardRef<BottomSheet, VoiceCommandSheetProps>(function VoiceCommandSheet(
  { onSubmit, onClose },
  ref
) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <Sheet ref={ref} snapPoints={['45%']} onClose={onClose}>
      <AppText family="display" size="lg" color="ink">Adicionar por voz</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.subtitle}>
        toque no campo, use o microfone do teclado, dite os itens separados por vírgula ou "e"
      </AppText>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="arroz, feijão, leite..."
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
        multiline
        autoFocus
        accessibilityLabel="Ditar itens da lista"
      />

      <Button label="Adicionar" variant="go" onPress={handleSubmit} style={styles.confirm} />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  subtitle: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[3],
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  confirm: { marginTop: theme.spacing[4], alignSelf: 'flex-end' }
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/VoiceCommandSheet.tsx
git commit -m "feat(mobile): add VoiceCommandSheet for dictating item phrases"
```

---

### Task 5: Mic button in `Masthead`

**Files:**
- Modify: `mobile/src/ui/screens/Home/components/Masthead.tsx`

- [ ] **Step 1: Add the `onOpenVoice` prop and mic button**

In `mobile/src/ui/screens/Home/components/Masthead.tsx`, change the props interface (currently at line 8):
```tsx
interface MastheadProps {
  totalItems: number;
  onOpenHistory(): void;
  onOpenFavorites(): void;
  onOpenVoice(): void;
}
```

Update the function signature (currently at line 22):
```tsx
export function Masthead({ totalItems, onOpenHistory, onOpenFavorites, onOpenVoice }: MastheadProps) {
```

Add a third icon button inside `styles.iconBtns` (after the favorites `Pressable`, currently ending at line 65):
```tsx
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar por voz"
            hitSlop={12}
            onPress={() => {
              haptics.light();
              onOpenVoice();
            }}
            style={styles.iconBtn}
          >
            <Feather name="mic" size={18} color={theme.colors.ink} />
          </Pressable>
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: error — `HomeScreen` doesn't pass `onOpenVoice` yet (expected; fixed in Task 6)

- [ ] **Step 3: Commit**

```bash
git add src/ui/screens/Home/components/Masthead.tsx
git commit -m "feat(mobile): add mic button to Masthead"
```

---

### Task 6: Wire voice flow into `HomeScreen`

**Files:**
- Modify: `mobile/src/ui/screens/Home/index.tsx`

- [ ] **Step 1: Add imports**

At the top of `mobile/src/ui/screens/Home/index.tsx` (after the existing imports, currently ending at line 15):
```tsx
import { VoiceCommandSheet } from '@ui/components/VoiceCommandSheet';
import { Toast } from '@ui/components/Toast';
import { parseVoiceCommand } from '@app/lib/voiceCommand';
```

- [ ] **Step 2: Add state and ref**

After the existing `variationRef`/`historyRef`/`favoritesRef` declarations (currently lines 23-25):
```tsx
  const voiceRef = useRef<BottomSheet>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
```

- [ ] **Step 3: Add the submit handler**

After `handleSelectVisible` (currently ending at line 73):
```tsx
  const handleVoiceSubmit = (text: string) => {
    const { matched, unmatched } = parseVoiceCommand(text, getItems());
    const added: string[] = [];

    for (const item of matched) {
      if (list.isSelected(item.id)) continue;
      const variationLabel = item.variations.length > 0 ? item.variations[0].label : undefined;
      list.toggle(item.id, variationLabel);
      added.push(item.name);
    }

    voiceRef.current?.close();

    if (added.length === 0 && unmatched.length === 0) return;
    if (added.length === 0) {
      setToastMessage('Nenhum item reconhecido, tenta de novo');
      return;
    }
    let message = `${added.length} adicionado${added.length > 1 ? 's' : ''}: ${added.join(', ')}`;
    if (unmatched.length > 0) {
      message += ` · não reconhecido: ${unmatched.join(', ')}`;
    }
    setToastMessage(message);
  };
```

- [ ] **Step 4: Pass `onOpenVoice` to `Masthead`**

Update the `<Masthead>` element (currently lines 81-85):
```tsx
        <Masthead
          totalItems={totalItems}
          onOpenHistory={() => historyRef.current?.expand()}
          onOpenFavorites={() => favoritesRef.current?.expand()}
          onOpenVoice={() => voiceRef.current?.expand()}
        />
```

- [ ] **Step 5: Render the sheet and toast**

After the `<FavoritesSheet>` element (currently ending at line 131, right before the closing `</View>` of root at line 132):
```tsx
      <VoiceCommandSheet
        ref={voiceRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRef.current?.close()}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/ui/screens/Home/index.tsx
git commit -m "feat(mobile): wire voice command sheet into HomeScreen"
```

---

### Task 7: Manual device verification

**Files:** none (verification only)

- [ ] **Step 1: Build and preview**

Run (from `mobile/`):
```bash
pnpm run build:web
```
Then serve `dist/` (e.g. `npx serve dist`) or deploy to a preview URL, and open on an iPhone.

- [ ] **Step 2: Verify the golden path**

Tap the mic icon in the masthead → sheet opens → tap the text field → tap the keyboard's dictation mic → say "arroz, feijão preto e leite integral" → tap "Adicionar". Expected: sheet closes, all three items show as checked in their category cards, toast reads "3 adicionados: Arroz, Feijão preto, Leite integral" (or similar; exact names depend on catalog casing) and disappears after ~3s.

- [ ] **Step 3: Verify edge cases**

- Dictate/type an item that doesn't exist (e.g. "xablau") → toast reads "Nenhum item reconhecido, tenta de novo".
- Dictate a mix of a real item and a fake one (e.g. "arroz, xablau") → arroz gets marked, toast mentions both the addition and the unrecognized fragment.
- Dictate an item already marked → it's not re-toggled off; toast still reports it if re-mentioned only if genuinely re-added (should not double count already-selected items — only unselected ones count toward "added").
- Dictate an item with variations (e.g. "arroz") → check it lands on the first/default variation without opening the variation sheet.

- [ ] **Step 4: Report back**

Confirm results to the user before this branch is merged.
