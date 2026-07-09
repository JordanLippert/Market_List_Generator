# Voice command selection — design

## Goal

Let a user add multiple items to the list by dictating a phrase (e.g. "arroz, feijão e leite"), instead of scrolling/typing to find and tap each one individually.

## Platform constraint

The Web Speech API (`SpeechRecognition`) — live, continuous browser speech recognition — is not implemented in iOS Safari. It works in Chrome/Android but is absent on the app's primary target (iPhone PWA). This is a WebKit gap, not a library limitation, and can't be worked around client-side without either:
- a paid cloud transcription API (adds cost, requires a backend to hide the API key, requires network — breaks the app's offline-first design), or
- shipping a native app (reopens the Apple Developer Program fee the project already chose to avoid by going PWA).

Decision: use the OS keyboard's built-in dictation (the mic button every iOS/Android text input already has). This is free, works fully offline once the phrase is typed, and requires no permissions code or third-party API. The trade-off: the user dictates the whole phrase, then confirms, then items get marked — not live word-by-word marking as they speak.

## Components

- **`VoiceCommandButton`** — mic icon button, placed in `Masthead` (near the history/favorites icons).
- **`VoiceCommandSheet`** — new bottom sheet (follows the existing `Sheet` component pattern used by `VariationSheet`/`HistorySheet`/`FavoritesSheet`). Contains a single multiline `TextInput` and a confirm button. The user taps the field, uses the keyboard's dictation mic, then taps confirm.
- **`parseVoiceCommand(text: string, items: Item[]): { matched: Item[]; unmatched: string[] }`** — pure function in `mobile/src/app/lib/voiceCommand.ts`.
- **`Toast`** — new small, auto-dismissing (~3s) banner component. Doesn't exist yet; first use is this feature, but written generically enough for reuse.

## Data flow

1. User opens `VoiceCommandSheet` via `VoiceCommandButton`, dictates or types a phrase, taps confirm.
2. `parseVoiceCommand` splits the phrase on commas, " e ", " and ", and newlines. Each fragment is trimmed and lowercased.
3. For each fragment, search the full catalog (`getItems()`, not just visible/filtered items) for items whose `name.toLowerCase()` includes the fragment — same substring rule the existing search bar uses (no fuzzy matching, per decision below).
4. If a fragment matches one or more items, the first match in catalog order is taken (deterministic, no ambiguity prompt). If a fragment matches nothing, it's added to `unmatched`.
5. Caller (`HomeScreen`) applies side effects for each matched item:
   - If already selected (`list.isSelected(item.id)`), skip it (avoid accidentally deselecting).
   - If the item has variations, select the first/default variation: `list.toggle(item.id, item.variations[0].label)`.
   - Otherwise: `list.toggle(item.id)`.
6. Sheet closes. `Toast` shows a summary: `"3 adicionados: arroz, feijão, leite"`. If some fragments were unmatched: append `"· não reconhecido: xuxu"`. If nothing matched at all: `"Nenhum item reconhecido, tenta de novo"`.

## Matching tolerance

Exact substring match, same rule as the current search bar (case-insensitive, no accent-stripping, no fuzzy/typo tolerance). Keeps behavior consistent and predictable with existing search; revisit only if real usage shows dictation mishears are a frequent problem.

## Variation handling

Voice-selected items with variations always get the first/default variation with no interruption to confirm a size. The user can still open the item's variation sheet afterward (existing tap interaction) to change it.

## Error handling / edge cases

- Empty/blank dictation → confirm button does nothing (or is disabled while text is empty).
- No fragments recognized → toast tells the user to try again; sheet still closes.
- Ambiguous fragment (matches multiple items) → first catalog-order match wins silently, no disambiguation prompt (keeps the flow non-blocking).

## Testing

- `parseVoiceCommand` is a pure function — unit test directly: multi-item phrases, single item, no matches, mixed matches/unmatches, repeated item in the same phrase (should not double-add).
- Manual verification: dictate on an actual iOS device (Safari PWA) since dictation behavior can't be simulated in the web preview.
