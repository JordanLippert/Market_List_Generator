# Mobile SDK 57 → 54 Downgrade

**Date:** 2026-07-05
**Author:** Jordan Lippert (via Claude Code)
**Status:** Ready for plan
**Depends on:** `2026-07-04-mobile-expo-app-design.md` (produced the SDK 57 baseline being downgraded)

## Summary

Downgrade the `mobile/` Expo project from SDK 57 to SDK 54 without changing any user-facing behavior or design. The single motivation is unblocking Expo Go on iPhone: the App Store version of Expo Go is stuck on SDK 54, and the current SDK 57 bundle fails with `Project is incompatible with this version of Expo Go`. A dev-build alternative was ruled out (requires paid Apple Developer account or an Android device the developer does not own).

The downgrade is a pure dependency migration. All existing code paths, UI components, storage keys, and WhatsApp integration remain untouched except for one Reanimated-3 API adjustment (`'worklet'` directive inside `useAnimatedStyle`).

## Motivation

- SDK 57 blocks the primary manual smoke test path (physical iPhone via Expo Go).
- Expo Go iOS on SDK 57 is not shipping soon enough to unblock the current smoke test cycle.
- Feature parity between SDK 54 and SDK 57 for this app's stack is complete — every module we use has stable APIs on both SDKs.
- Cost trade-off: 15–30 min mechanical downgrade beats waiting weeks for App Store approval, buying an Apple Developer account, or acquiring an Android device.

## Non-goals

- **No behavior changes.** Same screens, same wordmark, same sheets, same haptics, same WhatsApp flow.
- **No design changes.** Same theme tokens, same Feather icon set, same L. app icon.
- **No feature additions.**
- **No new persistence keys or storage migration.** AsyncStorage keys stay `@lista/current`, `@lista/history`, `@lista/favorites`.
- **No commit history rewrite.** Downgrade is additive commits on top of `feat/mobile-app`.
- **No return path to SDK 57 planned.** When Expo Go iOS ships SDK 57 later, upgrading back is out of scope here.

## Constraints

- Downgrade must land on branch `feat/mobile-app` (current working branch).
- Must preserve the recent uncommitted fixes: dynamic Sheet sizing, Feather icons in Masthead + ItemRow, `assets/icon.png`, web-preview deps (`react-dom`, `react-native-web`, `@expo/vector-icons`). These get committed **before** the downgrade so they are reachable in git if the downgrade needs a rollback.
- Typecheck (`pnpm typecheck`) must stay clean after downgrade.
- Web preview (`pnpm expo start --web`) must still boot Home without crash after downgrade — same acceptance as pre-downgrade.

## Target versions (SDK 54 baseline)

Anchored to Expo SDK 54's tested matrix. Exact patch versions get pinned by `pnpm expo install --check` — the plan does not hard-code them and does not fight the resolver.

| Package | Current (SDK 57) | Target (SDK 54) |
|---|---|---|
| `expo` | `~57.0.2` | `~54.0.0` |
| `react` | `19.2.3` | `19.1.0` (SDK 54 baseline) |
| `react-dom` | `19.2.3` | `19.1.0` |
| `react-native` | `0.86.0` | `0.81.x` |
| `react-native-reanimated` | `4.5.0` | `~4.1.0` (SDK 54 line still uses Reanimated 4; if `expo install --check` pins Reanimated 3, adjust) |
| `react-native-gesture-handler` | `~2.32.0` | `~2.28.0` |
| `react-native-safe-area-context` | `~5.7.0` | `~5.6.0` |
| `react-native-screens` | `~4.25.0` | `~4.16.0` |
| `react-native-web` | `^0.21.2` | `^0.21.0` |
| `expo-font` | `~57.0.0` | `~14.0.0` (SDK 54 renumbering) |
| `expo-haptics` | `~57.0.0` | `~15.0.0` |
| `expo-linking` | `~57.0.1` | `~8.0.0` |
| `expo-splash-screen` | `~57.0.2` | `~31.0.0` |
| `expo-status-bar` | `~57.0.0` | `~3.0.0` |
| `@expo/vector-icons` | `^15.1.1` | `^15.0.0` |
| `@expo-google-fonts/*` | `^0.4.x` | `^0.4.x` (font packages are SDK-agnostic) |
| `@gorhom/bottom-sheet` | `^5.2.7` | `^5.2.x` (SDK-agnostic; keep) |
| `@react-native-async-storage/async-storage` | `2.2.0` | `2.2.0` (kept — matched by SDK 54 too) |
| `@types/react` | `~19.2.4` | `~19.1.0` |
| `typescript` | `~6.0.3` | `~5.9.0` (SDK 54 baseline — TS 6 not needed) |
| `@babel/core` | `^7.28.5` | `^7.25.0` |

**Version discovery contract:** the plan trusts `pnpm expo install --check` and `pnpm expo install <pkg>` as the source of truth for exact pins. The table above documents intent, not literal locks — if Expo's resolver picks a different patch, that patch wins (same policy that the SDK 57 install used).

## Code changes required

Only one code change is required beyond dependency version updates:

**Reanimated worklet directive.** SDK 54 ships Reanimated 4 (or possibly Reanimated 3 depending on point release). If the resolver pins Reanimated 3.x, `useAnimatedStyle` callbacks need `'worklet';` as the first statement inside the arrow function body. If the resolver pins Reanimated 4.x, the automatic worklet transformation still applies and no directive is needed. Task instructions must handle both cases.

The affected callsite is exactly one:

```
mobile/src/ui/screens/Home/components/ItemRow.tsx:29-33
```

No other code changes.

## Config changes required

- `mobile/tsconfig.json` — the `"ignoreDeprecations": "6.0"` flag was added for TS 6 only. If TS is downgraded to 5.9, this flag becomes invalid (TS 5.9 does not know that key). Remove it in the same commit as the dep downgrade.
- `mobile/app.json` — `newArchEnabled: true` stays. New Architecture is default in SDK 54 too.

## Acceptance criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm expo start --web` boots Home without runtime error
- [ ] `pnpm expo start` produces a QR code that Expo Go on iOS (SDK 54, current App Store) accepts without `Project is incompatible` error
- [ ] All pre-downgrade uncommitted fixes are in git history (icon, Feather icons, dynamic Sheet, web preview deps) at commits earlier than the downgrade commit
- [ ] `mobile/assets/icon.png` still resolves (no missing asset warning)
- [ ] Feather icons still render in Masthead + ItemRow
- [ ] VariationSheet still opens without the `snap point 'auto' is invalid` runtime error

## Out of scope for this plan (existing bugs surfaced during web preview)

These stay for a future pass — surfacing them here so they are visible, but not part of the downgrade contract:

1. `Using src/app as the root directory for Expo Router` warning — Metro treats `src/app/` as Expo Router root by folder convention. The project does not use Expo Router. Harmless warning; no crash.
2. `props.pointerEvents is deprecated. Use style.pointerEvents` warning — comes from `@gorhom/bottom-sheet` internals on RN Web. Third-party, not our code.
3. WhatsApp `formatMessage` in `mobile/src/app/lib/whatsapp.ts` sorts categories lexicographically; the design spec is silent on order but `shared/catalog.json` has an `order` field the web respects. Consider aligning later.
4. `visibleItemIds` computed in `mobile/src/ui/screens/Home/index.tsx` is dead code inherited verbatim from the original plan.
5. `mobile/src/ui/screens/Home/styles.ts` is listed in the original file structure but never populated. Currently harmless (nothing imports it).

## Rollback

If the downgrade goes sideways:

```
git log --oneline feat/mobile-app -20
# find the last commit BEFORE the downgrade series
git reset --hard <that-sha>
rm -rf mobile/node_modules mobile/pnpm-lock.yaml
cd mobile && pnpm install
```

Because the pre-downgrade fixes ship as their own commits (before the downgrade series), reverting the downgrade preserves the icon + Feather + dynamic Sheet fixes.
