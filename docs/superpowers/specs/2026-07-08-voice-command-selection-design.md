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
- **`parseVoiceCommand(text: string, items: Item[]): { matched: Item[] }`** — pure function in `mobile/src/app/lib/voiceCommand.ts`.
- **`Toast`** — new small, auto-dismissing (~3s) banner component. Doesn't exist yet; first use is this feature, but written generically enough for reuse.

## Data flow

1. User opens `VoiceCommandSheet` via `VoiceCommandButton`, dictates or types a phrase, taps confirm.
2. **Revised after real-device testing:** iOS dictation doesn't insert commas between spoken items unless the user explicitly says "vírgula" — a natural phrase like "arroz feijão e leite integral" arrives with no separator between "arroz" and "feijão". Splitting on commas/" e " left "arroz feijão" as one unsplittable fragment that matched nothing. `parseVoiceCommand` no longer splits the phrase at all — instead it scans the whole lowercased text for every catalog item name that appears anywhere in it as a substring, using the full catalog (`getItems()`, not just visible/filtered items).
3. Overlapping matches are resolved by preferring the longer (more specific) item name — e.g. if both "Arroz" and "Arroz integral" would match inside "quero arroz integral", "Arroz integral" wins and consumes that text span, so "Arroz" doesn't also fire redundantly. Matches are deduplicated by item id and returned in the order they appear in the spoken text (left to right), not catalog order — reads naturally in the toast ("you said X then Y").
4. Caller (`HomeScreen`) applies side effects for each matched item:
   - If already selected (`list.isSelected(item.id)`), skip it (avoid accidentally deselecting).
   - If the item has variations, select the first/default variation: `list.toggle(item.id, item.variations[0].label)`.
   - Otherwise: `list.toggle(item.id)`.
5. Sheet closes. `Toast` shows a summary: `"3 adicionados: arroz, feijão, leite"`. If nothing matched at all: `"Nenhum item reconhecido, tenta de novo"`.

**Trade-off accepted:** without delimiters to anchor fragment boundaries, there's no reliable way to report which specific words in the phrase weren't recognized — so unmatched-fragment reporting was dropped entirely (the toast either lists what got added, or says nothing was recognized). This was a deliberate simplification, not an oversight — precision here isn't achievable without re-introducing the delimiter dependency that caused the original bug.

## Matching tolerance

Exact substring match against the full dictated text (case-insensitive, no accent-stripping, no fuzzy/typo tolerance) — same rule as the existing search bar, just applied to the whole phrase instead of a comma-delimited fragment. Keeps behavior consistent and predictable; revisit only if real usage shows dictation mishears are a frequent problem.

## Variation handling

Voice-selected items with variations always get the first/default variation with no interruption to confirm a size. The user can still open the item's variation sheet afterward (existing tap interaction) to change it.

## Error handling / edge cases

- Empty/blank dictation → confirm button does nothing (or is disabled while text is empty).
- Nothing recognized anywhere in the text → toast tells the user to try again; sheet still closes.
- Overlapping item names in the same text (e.g. "Arroz" inside "Arroz integral") → longer/more specific name wins, shorter one is suppressed for that span, no disambiguation prompt (keeps the flow non-blocking).

## Testing

- `parseVoiceCommand` is a pure function — unit test directly: multi-item phrases with no delimiters (the real dictation case), items separated by commas/" e " (still works, delimiters are just ordinary characters now), no matches, overlapping/substring item names (longest wins), repeated item mentioned twice (should not double-add).
- Manual verification: dictate on an actual iOS device (Safari PWA) since dictation behavior can't be simulated in the web preview.
