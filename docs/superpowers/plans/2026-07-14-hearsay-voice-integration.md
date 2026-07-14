# Hearsay-pwa Voice Recording Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second, real-audio-recording voice input (Whisper transcription via the `hearsay-pwa` library) alongside the existing OS-dictation voice feature, styled in Pracomprá's own visual language.

**Architecture:** `hearsay-pwa` is vendored as a git submodule and folded into the mobile app's pnpm workspace (it isn't published to npm). A new `VoiceRecordSheet` wraps the library's headless `useVoiceCommand` hook + `VoiceButton` component with Pracomprá-styled UI (square borders, mono labels, a receipt-style waveform strip). The transcribed text flows through the same `parseVoiceCommand` + toast logic the existing dictation sheet already uses — no duplicated matching logic.

**Tech Stack:** `@hearsay-pwa/react` + `@hearsay-pwa/core` (git submodule, pnpm workspace), existing `Sheet`/`Button`/`AppText`/`Toast` components, `@react-native-async-storage/async-storage` (first-download acknowledgement flag).

Spec: `docs/superpowers/specs/2026-07-14-hearsay-voice-integration-design.md`

---

### Task 1: Vendor hearsay-pwa via git submodule, wire pnpm workspace, prove it resolves

**Files:**
- Create (submodule): `mobile/vendor/hearsay-pwa` (pinned to tag `v1.1.2`)
- Create: `mobile/pnpm-workspace.yaml`
- Modify: `mobile/package.json`
- Create: `mobile/src/ui/components/VoiceRecordSheet/index.tsx` (stub, replaced fully in Task 4)

`@hearsay-pwa/react` depends on `@hearsay-pwa/core` via `workspace:*`, and the repo isn't on npm. This task proves the submodule + pnpm-workspace approach actually resolves and bundles before any real component work is built on top of it.

- [ ] **Step 1: Add the submodule, pinned to the latest release tag**

Run from `mobile/`:
```bash
git submodule add https://github.com/JordanLippert/hearsay-pwa.git vendor/hearsay-pwa
cd vendor/hearsay-pwa
git checkout v1.1.2
cd ../..
```
`v1.1.2` already includes the `loading-model` status fix and the `whisper-tiny` default — no unreleased commits needed.

- [ ] **Step 2: Create the pnpm workspace file**

Create `mobile/pnpm-workspace.yaml`:
```yaml
packages:
  - "."
  - "vendor/hearsay-pwa/packages/*"
```

- [ ] **Step 3: Add the dependency**

In `mobile/package.json`, in `"dependencies"`, add `"@hearsay-pwa/react": "workspace:*"` right after `"@gorhom/bottom-sheet": "^5.2.7",`:
```json
    "@gorhom/bottom-sheet": "^5.2.7",
    "@hearsay-pwa/react": "workspace:*",
    "@react-native-async-storage/async-storage": "2.2.0",
```

- [ ] **Step 4: Install and verify workspace resolution**

Run from `mobile/`:
```bash
pnpm install
```
Expected: completes with no errors; output includes `@hearsay-pwa/react` and `@hearsay-pwa/core` linked from `vendor/hearsay-pwa/packages/*` (no npm registry lookup for either).

- [ ] **Step 5: Create a minimal stub that actually imports the library**

Create `mobile/src/ui/components/VoiceRecordSheet/index.tsx`:
```tsx
import React, { forwardRef } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useVoiceCommand } from '@hearsay-pwa/react';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';

interface VoiceRecordSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
  onError(message: string): void;
}

export const VoiceRecordSheet = forwardRef<BottomSheet, VoiceRecordSheetProps>(function VoiceRecordSheet(
  { onClose },
  ref
) {
  useVoiceCommand({ intents: [] });

  return (
    <Sheet ref={ref} snapPoints={['50%']} onClose={onClose}>
      <AppText family="display" size="lg" color="ink">Gravar por voz</AppText>
    </Sheet>
  );
});
```

- [ ] **Step 6: Prove it typechecks and bundles**

Run from `mobile/`:
```bash
pnpm run typecheck
pnpm run build:web
```
Expected: both succeed with no resolution errors for `@hearsay-pwa/react` or `@hearsay-pwa/core`. If `build:web` fails on resolving the workspace package, stop and fix the `pnpm-workspace.yaml`/Metro resolution before continuing to Task 2 — every later task assumes this works.

- [ ] **Step 7: Commit**

Run from the repo root:
```bash
git add .gitmodules mobile/vendor/hearsay-pwa mobile/pnpm-workspace.yaml mobile/package.json mobile/pnpm-lock.yaml mobile/src/ui/components/VoiceRecordSheet/index.tsx
git commit -m "feat(mobile): vendor hearsay-pwa via submodule, prove pnpm workspace resolves it"
```

---

### Task 2: Web button reset for `VoiceButton`

**Files:**
- Create: `mobile/src/ui/components/VoiceRecordSheet/webButtonReset.ts`

`VoiceButton` renders a raw DOM `<button>` and only accepts a `className` (no `style` prop). Without a reset, the browser's default button chrome (border, padding, background) would show around our custom-styled children.

- [ ] **Step 1: Create the reset helper**

Create `mobile/src/ui/components/VoiceRecordSheet/webButtonReset.ts`:
```ts
const STYLE_ID = 'hearsay-voice-btn-reset';

export function ensureVoiceButtonReset(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '.hearsay-voice-btn { all: unset; cursor: pointer; display: block; width: 100%; }';
  document.head.appendChild(style);
}
```
The `typeof document === 'undefined'` guard keeps this safe to import from a vitest (node) environment. The `display: block; width: 100%;` after `all: unset` intentionally wins over `all`'s own reset of `display` — order inside the rule matters here.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/webButtonReset.ts
git commit -m "feat(mobile): add DOM button reset for the voice record button"
```

---

### Task 3: First-download acknowledgement storage helper

**Files:**
- Modify: `mobile/src/app/lib/storage.ts`
- Create: `mobile/src/app/lib/voiceModelAck.ts`

- [ ] **Step 1: Add the storage key**

In `mobile/src/app/lib/storage.ts`, change:
```ts
export const StorageKeys = {
  current:   '@lista/current',
  history:   '@lista/history',
  favorites: '@lista/favorites'
} as const;
```
to:
```ts
export const StorageKeys = {
  current:       '@lista/current',
  history:       '@lista/history',
  favorites:     '@lista/favorites',
  voiceModelAck: '@lista/voiceModelAck'
} as const;
```

- [ ] **Step 2: Create the helper**

Create `mobile/src/app/lib/voiceModelAck.ts`:
```ts
import { getJSON, setJSON, StorageKeys } from './storage';

export async function hasAcknowledgedVoiceModelDownload(): Promise<boolean> {
  return getJSON<boolean>(StorageKeys.voiceModelAck, false);
}

export async function acknowledgeVoiceModelDownload(): Promise<void> {
  await setJSON(StorageKeys.voiceModelAck, true);
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/lib/storage.ts mobile/src/app/lib/voiceModelAck.ts
git commit -m "feat(mobile): add first-download acknowledgement storage for voice model"
```

---

### Task 4: Waveform display component

**Files:**
- Create: `mobile/src/ui/components/VoiceRecordSheet/Waveform.tsx`

A row of 18 rounded bars. While `active`, bars animate off a fixed base pattern modulated by the hook's live `level` (0-1 amplitude), each bar phase-offset so it reads as a wave, not a flat meter. When not active, it shows the post-recording static `waveform` data if present, otherwise the resting base pattern.

- [ ] **Step 1: Create the component**

Create `mobile/src/ui/components/VoiceRecordSheet/Waveform.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@ui/styles/theme';

const BASE_HEIGHTS = [6, 14, 22, 30, 18, 10, 16, 26, 32, 20, 12, 8, 14, 24, 30, 22, 14, 10];
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 32;

interface WaveformProps {
  active: boolean;
  level: number;
  waveform: number[] | null;
}

export function Waveform({ active, level, waveform }: WaveformProps) {
  const [heights, setHeights] = useState<number[]>(BASE_HEIGHTS);
  const levelRef = useRef(level);
  levelRef.current = level;
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      setHeights(
        waveform
          ? waveform.map((v) => MIN_HEIGHT + Math.round(v * (MAX_HEIGHT - MIN_HEIGHT)))
          : BASE_HEIGHTS
      );
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = (Date.now() - start) / 200;
      const lvl = levelRef.current;
      setHeights(
        BASE_HEIGHTS.map((base, idx) => {
          const wave = Math.abs(Math.sin(t + idx * 0.5));
          const amplitude = MIN_HEIGHT + (base - MIN_HEIGHT) * wave * (0.3 + lvl);
          return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(amplitude)));
        })
      );
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, waveform]);

  return (
    <View style={styles.row}>
      {heights.map((h, idx) => (
        <View key={idx} style={[styles.bar, { height: h }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: MAX_HEIGHT,
    flex: 1,
    justifyContent: 'center'
  },
  bar: { width: 3.5, borderRadius: 2, backgroundColor: theme.colors.ink }
});
```

- [ ] **Step 2: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/Waveform.tsx
git commit -m "feat(mobile): add animated waveform display for voice recording"
```

---

### Task 5: First-download modal

**Files:**
- Create: `mobile/src/ui/components/VoiceRecordSheet/FirstDownloadModal.tsx`

- [ ] **Step 1: Create the component**

Create `mobile/src/ui/components/VoiceRecordSheet/FirstDownloadModal.tsx`:
```tsx
import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';

interface FirstDownloadModalProps {
  visible: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function FirstDownloadModal({ visible, onConfirm, onCancel }: FirstDownloadModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppText family="display" size="lg" color="ink">Primeiro uso</AppText>
          <AppText family="mono" size="xs" color="muted" style={styles.body}>
            vamos baixar ~40mb pra reconhecer sua voz. precisa de internet agora, depois funciona offline.
          </AppText>
          <View style={styles.actions}>
            <Button label="Agora não" variant="ghostDark" onPress={onCancel} style={styles.actionBtn} />
            <Button label="Entendi" variant="go" onPress={onConfirm} style={styles.actionBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[5]
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.paper,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[4]
  },
  body: { marginTop: theme.spacing[2], marginBottom: theme.spacing[4] },
  actions: { flexDirection: 'row', gap: theme.spacing[2], justifyContent: 'flex-end' },
  actionBtn: { minWidth: 96 }
});
```

- [ ] **Step 2: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/FirstDownloadModal.tsx
git commit -m "feat(mobile): add first-download explanation modal for voice model"
```

---

### Task 6: `VoiceRecordSheet` full implementation

**Files:**
- Modify: `mobile/src/ui/components/VoiceRecordSheet/index.tsx` (replaces the Task 1 stub)

Wires `useVoiceCommand` + `VoiceButton` (mode `press-drag-lock`) to the waveform, lock badge, first-download modal, and status label. On `status === "done"`, hands `result.text` to the parent's `onSubmit` (the same handler the dictation sheet uses). Errors surface through `onError` so the parent can show them in the existing `Toast`.

- [ ] **Step 1: Replace the stub with the full component**

Replace the entire contents of `mobile/src/ui/components/VoiceRecordSheet/index.tsx`:
```tsx
import React, { forwardRef, useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useVoiceCommand, VoiceButton } from '@hearsay-pwa/react';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Waveform } from './Waveform';
import { FirstDownloadModal } from './FirstDownloadModal';
import { ensureVoiceButtonReset } from './webButtonReset';
import { hasAcknowledgedVoiceModelDownload, acknowledgeVoiceModelDownload } from '@app/lib/voiceModelAck';
import { theme } from '@ui/styles/theme';
import * as haptics from '@app/lib/haptics';

ensureVoiceButtonReset();

interface VoiceRecordSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
  onError(message: string): void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'segure pra gravar',
  'loading-model': 'preparando reconhecimento de voz...',
  recording: 'gravando — solte pra transcrever',
  transcribing: 'transcrevendo...',
  done: 'pronto'
};

export const VoiceRecordSheet = forwardRef<BottomSheet, VoiceRecordSheetProps>(function VoiceRecordSheet(
  { onSubmit, onClose, onError },
  ref
) {
  const { start, stop, cancel, status, result, error, level, waveform } = useVoiceCommand({
    intents: [],
    language: 'portuguese',
    waveformBars: 18
  });
  const [locked, setLocked] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    if (status !== 'done' || !result) return;
    if (result.status === 'no_match' || result.status === 'matched') {
      onSubmit(result.text);
    }
  }, [status, result, onSubmit]);

  useEffect(() => {
    if (!error) return;
    if (error.name === 'MicPermissionError') {
      onError('Permita o microfone pra gravar');
    } else if (error.name === 'ModelLoadError') {
      onError('Não deu pra carregar o reconhecimento de voz, tenta o ditado');
    }
  }, [error, onError]);

  const handleSheetChange = (index: number) => {
    if (index < 0) return;
    hasAcknowledgedVoiceModelDownload().then((ack) => {
      if (!ack) setShowDownloadModal(true);
    });
  };

  const handleConfirmDownload = async () => {
    await acknowledgeVoiceModelDownload();
    setShowDownloadModal(false);
  };

  const handleStop = () => {
    setLocked(false);
    stop();
  };

  const active = status === 'recording';
  const micLabel =
    status === 'loading-model' ? 'aguarde' : active ? 'gravando' : status === 'transcribing' ? 'processando' : 'gravar';

  return (
    <Sheet ref={ref} snapPoints={['50%']} onClose={() => { cancel(); onClose(); }} onChange={handleSheetChange}>
      <AppText family="display" size="lg" color="ink">Gravar por voz</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.subtitle}>
        segure o botão e fale os itens naturalmente
      </AppText>

      <AppText family="mono" size="xs" color="muted" uppercase style={styles.statusLabel}>
        {locked ? 'gravando — travado' : STATUS_LABEL[status] ?? ''}
      </AppText>

      <View style={styles.panel}>
        <View style={[styles.dot, active && styles.dotActive]} />
        <Waveform active={active} level={level} waveform={waveform} />
        {locked && (
          <Pressable
            onPress={handleStop}
            style={styles.lockBadge}
            accessibilityRole="button"
            accessibilityLabel="Parar gravação travada"
          >
            <AppText family="mono" size="xs" uppercase style={styles.lockBadgeText}>travado ×</AppText>
          </Pressable>
        )}
      </View>

      <VoiceButton
        mode="press-drag-lock"
        className="hearsay-voice-btn"
        onStart={() => { haptics.light(); start(); }}
        onStop={handleStop}
        onLockChange={setLocked}
      >
        <View style={[styles.micBtn, active && styles.micBtnActive]}>
          <View style={styles.micIconRow}>
            {[4, 9, 7, 4].map((h, idx) => (
              <View key={idx} style={[styles.micIconBar, { height: h }, active && styles.micIconBarActive]} />
            ))}
          </View>
          <AppText family="mono" size="xs" uppercase style={active ? styles.micLabelActive : styles.micLabel}>
            {micLabel}
          </AppText>
        </View>
      </VoiceButton>

      <AppText family="mono" size="xs" color="muted" style={styles.hint}>
        arraste para cima trava sem precisar segurar
      </AppText>

      <FirstDownloadModal
        visible={showDownloadModal}
        onConfirm={handleConfirmDownload}
        onCancel={() => setShowDownloadModal(false)}
      />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  subtitle: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  statusLabel: { textAlign: 'center', marginBottom: theme.spacing[3] },
  panel: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4]
  },
  dot: { width: 8, height: 8, backgroundColor: theme.colors.ink },
  dotActive: { backgroundColor: theme.colors.go },
  lockBadge: {
    backgroundColor: theme.colors.go,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  lockBadgeText: { color: theme.colors.goInk },
  micBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.go,
    borderRadius: 4,
    backgroundColor: theme.colors.go,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2]
  },
  micBtnActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  micIconRow: { flexDirection: 'row', alignItems: 'center', gap: 2.5 },
  micIconBar: { width: 3, borderRadius: 2, backgroundColor: theme.colors.goInk },
  micIconBarActive: { backgroundColor: theme.colors.go },
  micLabel: { color: theme.colors.goInk },
  micLabelActive: { color: theme.colors.go },
  hint: { textAlign: 'center', marginTop: theme.spacing[2] }
});
```

- [ ] **Step 2: Verify it typechecks and bundles**

Run from `mobile/`:
```bash
pnpm run typecheck
pnpm run build:web
```
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/index.tsx
git commit -m "feat(mobile): implement VoiceRecordSheet with hearsay-pwa recording"
```

---

### Task 7: Masthead icon

**Files:**
- Modify: `mobile/src/ui/screens/Home/components/Masthead.tsx`

Adds a second mic-family icon next to the existing dictation mic: a 30×30 square chip with a 4-bar mini-waveform glyph (same visual language as the recording panel), not a microphone icon.

- [ ] **Step 1: Add the new prop**

In `mobile/src/ui/screens/Home/components/Masthead.tsx`, change:
```tsx
interface MastheadProps {
  totalItems: number;
  onOpenHistory(): void;
  onOpenFavorites(): void;
  onOpenVoice(): void;
}
```
to:
```tsx
interface MastheadProps {
  totalItems: number;
  onOpenHistory(): void;
  onOpenFavorites(): void;
  onOpenVoice(): void;
  onOpenVoiceRecord(): void;
}
```
and change the function signature:
```tsx
export function Masthead({ totalItems, onOpenHistory, onOpenFavorites, onOpenVoice }: MastheadProps) {
```
to:
```tsx
export function Masthead({ totalItems, onOpenHistory, onOpenFavorites, onOpenVoice, onOpenVoiceRecord }: MastheadProps) {
```

- [ ] **Step 2: Add the new icon button**

Immediately after the existing "Adicionar por voz" `Pressable` (the one with `<Feather name="mic" ... />`), add:
```tsx
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gravar comando de voz"
            hitSlop={12}
            onPress={() => {
              haptics.light();
              onOpenVoiceRecord();
            }}
            style={styles.waveIconBtn}
          >
            <View style={styles.waveIconRow}>
              {[3, 7, 5, 3].map((h, idx) => (
                <View key={idx} style={[styles.waveIconBar, { height: h }]} />
              ))}
            </View>
          </Pressable>
```

- [ ] **Step 3: Add the new styles**

In the `StyleSheet.create` call at the bottom of the file, add after `iconBtn`:
```ts
  waveIconBtn: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  waveIconRow: { flexDirection: 'row', alignItems: 'center', gap: 1.5 },
  waveIconBar: { width: 2, borderRadius: 1, backgroundColor: theme.colors.ink }
```

- [ ] **Step 4: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: fails until Task 8 updates the `Masthead` call site in `Home/index.tsx` — confirm the only error is the missing `onOpenVoiceRecord` prop at that call site, nothing else.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/ui/screens/Home/components/Masthead.tsx
git commit -m "feat(mobile): add voice-record icon to Masthead"
```

---

### Task 8: Wire `VoiceRecordSheet` into `HomeScreen`

**Files:**
- Modify: `mobile/src/ui/screens/Home/index.tsx`

Reuses the existing `handleVoiceSubmit` (no duplicated matching logic) and the existing `Toast` for errors.

- [ ] **Step 1: Add the import**

In `mobile/src/ui/screens/Home/index.tsx`, add after the `VoiceCommandSheet` import:
```tsx
import { VoiceRecordSheet } from '@ui/components/VoiceRecordSheet';
```

- [ ] **Step 2: Add the ref**

Change:
```tsx
  const voiceRef = useRef<BottomSheet>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
```
to:
```tsx
  const voiceRef = useRef<BottomSheet>(null);
  const voiceRecordRef = useRef<BottomSheet>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
```

- [ ] **Step 3: Pass the new prop to `Masthead`**

Change:
```tsx
        <Masthead
          totalItems={totalItems}
          onOpenHistory={() => historyRef.current?.expand()}
          onOpenFavorites={() => favoritesRef.current?.expand()}
          onOpenVoice={() => voiceRef.current?.expand()}
        />
```
to:
```tsx
        <Masthead
          totalItems={totalItems}
          onOpenHistory={() => historyRef.current?.expand()}
          onOpenFavorites={() => favoritesRef.current?.expand()}
          onOpenVoice={() => voiceRef.current?.expand()}
          onOpenVoiceRecord={() => voiceRecordRef.current?.expand()}
        />
```

- [ ] **Step 4: Render `VoiceRecordSheet`**

Change:
```tsx
      <VoiceCommandSheet
        ref={voiceRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRef.current?.close()}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
```
to:
```tsx
      <VoiceCommandSheet
        ref={voiceRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRef.current?.close()}
      />
      <VoiceRecordSheet
        ref={voiceRecordRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRecordRef.current?.close()}
        onError={(message) => setToastMessage(message)}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
```

- [ ] **Step 5: Verify it typechecks, builds, and existing tests still pass**

Run from `mobile/`:
```bash
pnpm run typecheck
pnpm test
pnpm run build:web
```
Expected: all three succeed — `pnpm test` still shows the same 12 passing `voiceCommand.test.ts` tests (untouched by this feature).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/ui/screens/Home/index.tsx
git commit -m "feat(mobile): wire VoiceRecordSheet into HomeScreen"
```

---

### Task 9: Manual device verification

No new automated tests are added beyond what already exists — this feature is UI wiring on top of an already-tested matcher (`parseVoiceCommand`) and an external library. Verify on a real device (same practice used for the dictation feature and the offline PWA work):

- [ ] **Step 1: Local dev smoke test**

Run from `mobile/`: `pnpm start`, press `w` for web. Open the new mic icon in the Masthead, confirm the first-download modal appears, confirm it, hold the button, speak a few catalog item names, release, confirm the transcript gets parsed and toggled into the list with a toast — same as the dictation flow.

- [ ] **Step 2: Deploy a preview build**

This worktree has no `.vercel/` folder (it's gitignored, so a fresh worktree checkout doesn't carry it). Copy the project link from the main checkout, then deploy from the repo root:
```bash
mkdir -p .vercel
cp ../../.vercel/project.json .vercel/project.json
vercel
```
(non-`--prod`, from repo root since `vercel.json`'s `buildCommand` runs `cd mobile && ...`). Confirm the build succeeds with the git submodule present — Vercel needs to actually clone `mobile/vendor/hearsay-pwa`; if the build fails to find the submodule, enable "Automatically install Git submodules" (or equivalent) in the Vercel project's Git settings before retrying.

- [ ] **Step 3: Real-device checklist**

On an iOS Safari (and, if available, Android Chrome) device, added to the home screen as a PWA:
- [ ] Mic permission prompt appears on first recording attempt; denying it shows the "permita o microfone" toast and the sheet stays open.
- [ ] Press-and-hold records, waveform animates, releasing stops and transcribes; matched items get added with the usual toast.
- [ ] Press-and-drag-up locks; the "travado ×" badge appears and tapping it stops the recording.
- [ ] First-download modal only appears once; after confirming, later recordings skip straight to the `loading-model` (if any) → `recording` flow.
- [ ] After the model is cached, turn off wifi/data entirely and confirm recording + transcription still works offline, consistent with the rest of the PWA.
- [ ] The OS-dictation mic icon still opens `VoiceCommandSheet` and works exactly as before — this feature is additive, not a replacement.

- [ ] **Step 4: Report back**

Once verified, report results back before merging — this is a manual gate, not something to mark done from typecheck/build output alone.
