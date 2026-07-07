# Mobile SDK 57 → 54 Downgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Downgrade the `mobile/` Expo project from SDK 57 to SDK 54 with zero behavior/design changes so the physical iPhone can run the app through the current App Store version of Expo Go.

**Architecture:** Dep-version migration on top of the existing `feat/mobile-app` branch. Uncommitted fixes (dynamic Sheet sizing, Feather icons, `L.` app icon, web-preview deps) get committed first as their own atomic commits to serve as rollback anchors. Then Expo's `expo install --check` is used as the source of truth for pinning the SDK 54 dep matrix (never fight the resolver). One code adjustment — the `useAnimatedStyle` worklet directive in `ItemRow.tsx` — is applied only if the resolver downgrades Reanimated to 3.x. TypeScript is rolled back from 6.0 to 5.9 and the `ignoreDeprecations` shim is removed.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19.1, TypeScript 5.9, pnpm 11, `@gorhom/bottom-sheet` v5, `@expo/vector-icons` Feather set, `react-native-reanimated`, AsyncStorage.

---

## Preconditions

Before starting, confirm:

- Current branch: `feat/mobile-app`
- `git status --short` shows 4 modified files + 1 untracked file + `mobile/package.json` + `mobile/pnpm-lock.yaml` changes
- Working directory: repo root `C:\Users\User\Desktop\Market_List_Generator`
- Windows shell (PowerShell 7 or CMD both work for the pnpm commands here)

---

### Task 1: Commit dynamic Sheet sizing fix

**Files:**
- Stage: `mobile/src/ui/components/Sheet/index.tsx`
- Stage: `mobile/src/ui/components/VariationSheet.tsx`

**Rationale:** These two files fix the `Snap point 'auto' is invalid` runtime crash. They belong together — Sheet exposes the dynamic mode contract, VariationSheet consumes it. A single commit keeps the fix atomic and greppable.

- [ ] **Step 1: Verify only these two files are staged**

```
git add mobile/src/ui/components/Sheet/index.tsx mobile/src/ui/components/VariationSheet.tsx
git status --short
```

Expected: two `M` lines matching the paths above, nothing else in green (other uncommitted files still showing red `M`/`??`).

- [ ] **Step 2: Commit**

```
git commit -m "fix(mobile): dynamic sheet sizing for VariationSheet

Sheet now accepts optional snapPoints. When omitted, enableDynamicSizing
is set to true and snapPoints is passed as undefined, letting
@gorhom/bottom-sheet v5 auto-size to content. VariationSheet drops the
invalid snapPoints={['auto']} — 'auto' is not a valid snap point value
in v5 and was crashing the Home screen on mount with
'Snap point auto is invalid'."
```

- [ ] **Step 3: Verify commit landed**

```
git log --oneline -1
```

Expected: single line starting with `fix(mobile): dynamic sheet sizing for VariationSheet`.

---

### Task 2: Commit app icon and Feather icon set

**Files:**
- Stage: `mobile/assets/icon.png` (new)
- Stage: `mobile/src/ui/screens/Home/components/Masthead.tsx`
- Stage: `mobile/src/ui/screens/Home/components/ItemRow.tsx`

**Rationale:** The `L.` app icon and the Feather swap in Masthead/ItemRow are one visual pass — they land together so a bisect points to the visual change as one unit.

Note: `@expo/vector-icons` and `react-dom` + `react-native-web` were installed by `pnpm expo install` and are already reflected in `mobile/package.json` + `mobile/pnpm-lock.yaml`. Those two dep files ship with Task 3, not here — this task is code + asset only. Do not stage `package.json` or `pnpm-lock.yaml` in this commit.

- [ ] **Step 1: Stage the three files**

```
git add mobile/assets/icon.png mobile/src/ui/screens/Home/components/Masthead.tsx mobile/src/ui/screens/Home/components/ItemRow.tsx
git status --short
```

Expected: one `A` (icon.png) and two `M` (Masthead.tsx, ItemRow.tsx). `package.json`, `pnpm-lock.yaml` should still show as `M` in red (unstaged).

- [ ] **Step 2: Commit**

```
git commit -m "feat(mobile): app icon and monochromatic Feather icons

Add mobile/assets/icon.png — 1024x1024 wordmark 'L.' in Space Grotesk
Bold, dark ink on paper background, mirroring the Masthead wordmark's
terminal period. Fixes the 'Unable to resolve asset ./assets/icon.png'
warning in app.json.

Swap the 'Hist' text label and Unicode star glyph in Masthead + ItemRow
for @expo/vector-icons Feather 'clock' and 'star' — consistent
monochromatic ink glyphs that don't fall back to colored system emoji
on web or iOS."
```

- [ ] **Step 3: Verify commit landed**

```
git log --oneline -2
```

Expected: two commits — the new `feat(mobile): app icon and monochromatic Feather icons` on top of the Task 1 `fix(mobile): dynamic sheet sizing` commit.

---

### Task 3: Commit web preview + vector-icons dep additions

**Files:**
- Stage: `mobile/package.json`
- Stage: `mobile/pnpm-lock.yaml`

**Rationale:** `react-dom`, `react-native-web`, `@expo/vector-icons` were installed to make `pnpm expo start --web` work and to power the Feather icons committed in Task 2. Committing them separately keeps dep additions distinct from code changes — makes future audits cleaner.

- [ ] **Step 1: Stage the two files**

```
git add mobile/package.json mobile/pnpm-lock.yaml
git status --short
```

Expected: two `M` lines. Working tree should now be clean (`git status` says "working tree clean" after committing).

- [ ] **Step 2: Commit**

```
git commit -m "chore(mobile): add web preview and Feather icon deps

Add react-dom, react-native-web, and @expo/vector-icons pinned by
pnpm expo install to SDK 57's tested matrix. react-dom + react-native-web
enable 'pnpm expo start --web' as a smoke-test path on Windows without
a physical device. @expo/vector-icons powers the Feather clock and star
glyphs added in the previous commit."
```

- [ ] **Step 3: Verify clean working tree**

```
git status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 4: Verify baseline still works before downgrade**

```
cd mobile
pnpm typecheck
```

Expected: exits 0 (no output beyond the `$ tsc --noEmit` line).

This is the last known-good SDK 57 commit. If the downgrade needs to be aborted, this SHA is the rollback target.

- [ ] **Step 5: Record rollback SHA**

```
git log --oneline -1
```

Copy the SHA. Paste it into the terminal scrollback or a scratchpad — you will not touch it again unless rollback is triggered.

---

### Task 4: Pin the SDK 54 core dep — `expo@~54`

**Files:**
- Modify: `mobile/package.json` (via pnpm, not by hand)

**Rationale:** `expo@~54` is the anchor. Installing it first — before any other version bumps — lets `pnpm expo install --check` in Task 5 read the correct SDK 54 target and pin every companion dep accordingly.

- [ ] **Step 1: Install expo at SDK 54 line**

From `mobile/`:

```
pnpm add expo@~54.0.0
```

Expected output snippet:

```
+ expo ~54.0.0
```

pnpm may warn about incompatible peer deps (react 19.2 vs expo 54 peer). Warnings are expected — the resolver has not yet been asked to align the other packages. Do not react to the warnings.

- [ ] **Step 2: Verify expo is now on 54**

```
pnpm list expo --depth 0
```

Expected: `expo <some-54-version>` (a `54.0.x` string).

- [ ] **Step 3: Do NOT commit yet**

`package.json` is dirty. Leave it dirty until Task 6 wraps up the full dep migration. This intermediate state is not shippable.

---

### Task 5: Let Expo align every companion dep

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/pnpm-lock.yaml`

**Rationale:** Rather than hand-editing every `~57.x` to a guessed SDK 54 pin, use Expo's own tooling. `expo install --check` reads the installed `expo` package's SDK version, cross-references the known-good matrix, and prints exactly which packages are out of alignment. The follow-up `expo install --fix` applies those pins.

- [ ] **Step 1: Run the check**

From `mobile/`:

```
pnpm expo install --check
```

Expected: a table listing every Expo-managed dep (`expo-font`, `expo-haptics`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `react`, `react-native`, `react-native-*`, `@expo/vector-icons`) with the current version and the recommended SDK 54 version.

Read the table. Do not fix anything by hand yet.

- [ ] **Step 2: Apply the fixes**

```
pnpm expo install --fix
```

Expected: pnpm installs the SDK 54-compatible pins listed in the check. `package.json` and `pnpm-lock.yaml` are both updated.

If the fix step reports "Nothing to fix", the check output listed no misalignments — proceed regardless.

- [ ] **Step 3: Re-run check to confirm alignment**

```
pnpm expo install --check
```

Expected: `Dependencies are up to date`.

If a package is still misaligned, install it explicitly:

```
pnpm expo install <package-name>
```

Repeat until `--check` reports up to date.

- [ ] **Step 4: Snapshot the new version of Reanimated**

```
pnpm list react-native-reanimated --depth 0
```

Copy the version string. Two branches follow:

- If the major is **3.x**: Task 7 must apply the `'worklet';` directive in `ItemRow.tsx`.
- If the major is **4.x**: Task 7 is a no-op verification.

Do not decide anything else based on this — the decision is scoped only to Task 7.

---

### Task 6: Downgrade TypeScript and remove the deprecation shim

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/tsconfig.json`
- Modify: `mobile/pnpm-lock.yaml`

**Rationale:** SDK 54 baseline is TypeScript 5.9. The current `tsconfig.json` has `"ignoreDeprecations": "6.0"`, which is only recognized by TS 6+. Leaving it in place under TS 5.9 produces a `TS5023: Unknown compiler option 'ignoreDeprecations'` error at typecheck. Downgrade TS and strip the shim in the same commit.

- [ ] **Step 1: Downgrade TypeScript**

From `mobile/`:

```
pnpm add -D typescript@~5.9.0
```

Expected: pnpm reports `typescript ~5.9.x` installed as devDependency.

- [ ] **Step 2: Verify installed TS version**

```
pnpm list typescript --depth 0
```

Expected: a `5.9.x` string.

- [ ] **Step 3: Downgrade @types/react to match React 19.1**

```
pnpm add -D "@types/react@~19.1.0"
```

Expected: `@types/react ~19.1.x` reported.

- [ ] **Step 4: Read current tsconfig.json**

Cat the file to confirm the shim is present.

```
cat mobile/tsconfig.json
```

Expected: the `"ignoreDeprecations": "6.0"` line under `compilerOptions`.

- [ ] **Step 5: Remove the `ignoreDeprecations` line**

Edit `mobile/tsconfig.json`. Locate:

```json
    "ignoreDeprecations": "6.0",
```

Delete the entire line, including the trailing newline. Preserve every other `compilerOptions` field verbatim.

- [ ] **Step 6: Typecheck**

From `mobile/`:

```
pnpm typecheck
```

Expected: exits 0 with only the `$ tsc --noEmit` line. No `TS5023` and no `TS6046`.

If typecheck fails, do NOT edit `tsconfig.json` to work around it. Instead: read the error, and if it points at a legitimate incompatibility introduced by the downgrade (not a shim leftover), stop and escalate — the plan expects a clean pass here.

---

### Task 7: Apply Reanimated worklet directive if required

**Files:**
- Modify (conditional): `mobile/src/ui/screens/Home/components/ItemRow.tsx`

**Rationale:** Reanimated 3 requires an explicit `'worklet';` directive as the first statement of any callback consumed by hooks like `useAnimatedStyle`. Reanimated 4 introduces automatic worklet transformation via the Babel plugin and no directive is needed. The version pinned in Task 5 dictates which branch applies.

- [ ] **Step 1: Confirm which branch to take**

Recall the Reanimated major from Task 5, Step 4.

- **If 4.x:** skip to Step 4 (verification only).
- **If 3.x:** proceed with Step 2.

- [ ] **Step 2 (only if Reanimated 3.x): Read the current callback**

```
cat mobile/src/ui/screens/Home/components/ItemRow.tsx
```

Locate lines 29–33:

```tsx
  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: theme.colors.ink,
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }]
  }));
```

- [ ] **Step 3 (only if Reanimated 3.x): Rewrite the callback with a body and directive**

Replace those lines with:

```tsx
  const fillStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      backgroundColor: theme.colors.ink,
      opacity: progress.value,
      transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }]
    };
  });
```

Semantics are identical — the arrow function was implicit-return of an object literal; now it is a block body that returns the same object literal after declaring itself as a worklet.

- [ ] **Step 4: Typecheck**

From `mobile/`:

```
pnpm typecheck
```

Expected: exits 0.

---

### Task 8: Nuke and reinstall node_modules for a clean lockfile

**Files:**
- Delete: `mobile/node_modules/`
- Regenerate: `mobile/pnpm-lock.yaml`

**Rationale:** After multiple `pnpm add` + `pnpm expo install` calls that crossed a major SDK boundary, the pnpm store may have stale symlinks or leftover `.pnpm` entries pointing at SDK 57 versions of transitive deps. A clean install guarantees the lockfile reflects only SDK 54's dep graph.

- [ ] **Step 1: Delete node_modules**

From `mobile/`:

PowerShell:
```
Remove-Item -Recurse -Force node_modules
```

CMD:
```
rmdir /s /q node_modules
```

Expected: node_modules is gone. Do NOT delete the lockfile — pnpm needs it as a hint for the reinstall.

- [ ] **Step 2: Clean install**

```
pnpm install
```

Expected: pnpm reports `Progress: resolved N, ... done` and prints the top-level dep tree ending with `Done in <time> using pnpm v11.x`.

- [ ] **Step 3: Verify installed SDK is 54**

```
pnpm list expo react react-native --depth 0
```

Expected:

- `expo 54.x.x`
- `react 19.1.x`
- `react-native 0.81.x`

If any of those still show a 57/19.2/0.86 pin, the resolver did not honor the `package.json` bumps — stop and escalate.

- [ ] **Step 4: Typecheck once more against the fresh install**

```
pnpm typecheck
```

Expected: exits 0.

---

### Task 9: Smoke-test the downgraded bundle

**Files:** none (verification only)

**Rationale:** The plan's acceptance criteria include booting the app on web and getting a QR that Expo Go iOS accepts. Both are quick sanity checks that catch anything the typecheck missed — for example a runtime API divergence in a downgraded lib.

- [ ] **Step 1: Boot web preview with a cache clear**

From `mobile/`:

```
pnpm expo start --web --clear
```

Expected:

- Metro bundles without an error.
- Browser opens `http://localhost:8081`.
- Home screen renders: Masthead with wordmark `Lista.` + date stamp + clock icon + star icon; SearchBar; category cards; Dock at bottom.
- Console shows the pre-existing warnings noted in the spec's "Out of scope" section (`Using src/app as the root directory for Expo Router`, `props.pointerEvents is deprecated`) but no red error.
- Tapping an item with variations opens the VariationSheet (dynamic-sized) without crashing.

- [ ] **Step 2: Stop the server, boot the mobile-targeted start**

Ctrl+C. Then:

```
pnpm expo start --clear
```

Expected: QR code prints. `Metro: exp://192.168.x.x:8081` line appears.

- [ ] **Step 3: Scan on iPhone with the App Store version of Expo Go**

Open the iPhone camera, scan the QR. Expo Go should open the project without the `Project is incompatible with this version of Expo Go` error. Bundle downloads, splash shows the `#F5F1E8` background, then the Home screen appears.

If Expo Go still rejects the project as incompatible, stop and escalate — this means either (a) the resolver pinned an SDK version that Expo Go on iOS does not support yet, or (b) `app.json` needs an `sdkVersion` field. Neither is expected on SDK 54, but is possible.

- [ ] **Step 4: Walk the golden path once on-device**

On the iPhone:

1. Wordmark `Lista.` renders. Clock icon visible in the Masthead.
2. Tap an item without variations — checkbox animates in, counter increments.
3. Tap an item with variations — sheet opens, chip picker shows.
4. Pick a chip — item marks, `(label)` shows, small haptic tap.
5. Long-press an item — star appears next to the row, small haptic light.
6. Tap the star icon in the Masthead — Favorites sheet opens.
7. Tap the clock icon in the Masthead — History sheet opens.
8. Tap the Enviar button — WhatsApp opens with a formatted message.
9. Kill the app, reopen — selection persists.

Any of these failing on-device but working on web preview is a Reanimated-3-vs-4 or native-module issue that the downgrade introduced — stop and escalate.

- [ ] **Step 5: Stop the server**

Ctrl+C.

---

### Task 10: Commit the downgrade

**Files:**
- Stage: `mobile/package.json`
- Stage: `mobile/pnpm-lock.yaml`
- Stage: `mobile/tsconfig.json`
- Stage (only if edited in Task 7 Step 3): `mobile/src/ui/screens/Home/components/ItemRow.tsx`

**Rationale:** Single atomic commit for the downgrade — reversible with one `git revert`. The scope is narrowly defined by the touched files above.

- [ ] **Step 1: Stage the required files**

Base set (always):

```
git add mobile/package.json mobile/pnpm-lock.yaml mobile/tsconfig.json
```

If Task 7 Step 3 applied:

```
git add mobile/src/ui/screens/Home/components/ItemRow.tsx
```

- [ ] **Step 2: Verify staged set**

```
git status --short
```

Expected: only the files above show `M` (staged). Nothing else. If `assets/icon.png` or any component file other than the ItemRow (conditional case) shows up as staged, unstage it — those belong to earlier commits.

- [ ] **Step 3: Commit**

If Task 7 Step 3 was applied, use this message:

```
git commit -m "chore(mobile): downgrade to Expo SDK 54 for iOS Expo Go

App Store Expo Go is stuck on SDK 54; the SDK 57 bundle was rejected
with 'Project is incompatible with this version of Expo Go'.

Downgrade is pure dep migration:
- expo, react, react-native, react-native-*, expo-*, @expo/vector-icons
  pinned to SDK 54's tested matrix (via 'pnpm expo install --check')
- typescript 6.0.3 -> 5.9; @types/react 19.2 -> 19.1
- tsconfig.json: remove ignoreDeprecations shim (was TS 6-only)
- ItemRow useAnimatedStyle rewritten with explicit 'worklet' directive
  and block body — required by Reanimated 3 pinned at SDK 54

All UI, state, storage, and WhatsApp flow untouched. Verified via
typecheck, 'expo start --web' smoke, and physical iPhone Expo Go boot.

Rollback: revert this commit and run 'pnpm install' from mobile/."
```

Otherwise (Reanimated 4 pinned, no ItemRow change), drop the `ItemRow` bullet:

```
git commit -m "chore(mobile): downgrade to Expo SDK 54 for iOS Expo Go

App Store Expo Go is stuck on SDK 54; the SDK 57 bundle was rejected
with 'Project is incompatible with this version of Expo Go'.

Downgrade is pure dep migration:
- expo, react, react-native, react-native-*, expo-*, @expo/vector-icons
  pinned to SDK 54's tested matrix (via 'pnpm expo install --check')
- typescript 6.0.3 -> 5.9; @types/react 19.2 -> 19.1
- tsconfig.json: remove ignoreDeprecations shim (was TS 6-only)

All UI, state, storage, and WhatsApp flow untouched. Verified via
typecheck, 'expo start --web' smoke, and physical iPhone Expo Go boot.

Rollback: revert this commit and run 'pnpm install' from mobile/."
```

- [ ] **Step 4: Verify commit landed and working tree is clean**

```
git status
git log --oneline -5
```

Expected: `working tree clean`. Last five commits, top to bottom:

1. `chore(mobile): downgrade to Expo SDK 54 for iOS Expo Go`
2. `chore(mobile): add web preview and Feather icon deps`
3. `feat(mobile): app icon and monochromatic Feather icons`
4. `fix(mobile): dynamic sheet sizing for VariationSheet`
5. `feat(mobile): App root with providers + font gate` (pre-existing tip of branch before this plan)

---

## Post-plan acceptance verification

Run this final checklist against the spec's acceptance criteria:

- [ ] `pnpm typecheck` from `mobile/` exits 0
- [ ] `pnpm expo start --web` boots Home without runtime error
- [ ] Physical iPhone with App Store Expo Go loaded the app past the compatibility check
- [ ] Golden path (mark item, pick variation, favorite, send to WhatsApp, restore from history) all worked on-device
- [ ] `mobile/assets/icon.png` still shows as the app icon (no missing-asset warning in Metro logs)
- [ ] Feather clock + star still render in Masthead
- [ ] Feather star still renders on favorited items in ItemRow
- [ ] VariationSheet still opens without the `Snap point 'auto' is invalid` error
- [ ] `git log --oneline` shows the four expected new commits on `feat/mobile-app` in the order specified in Task 10 Step 4

If every box checks: the plan is done. Report status DONE with the four new SHAs.
