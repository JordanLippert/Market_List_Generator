# Shared Catalog + Web Variations

**Date:** 2026-07-04
**Author:** Jordan Lippert (via Claude Code)
**Status:** Design approved, ready for implementation plan

## Summary

Move the item catalog out of the C# `ItemRepository` into a single JSON file at the repo root (`shared/catalog.json`) that will later be consumed by a companion Expo mobile app. Extend the item model with an optional list of variations (e.g. Arroz 5kg / 2kg / 1kg) and let the web pick a variation via a modal when the user checks such an item. The chosen variation is included in the WhatsApp message.

This spec is scoped to the web + shared catalog only. The mobile app is a follow-up spec that will consume the same `shared/catalog.json` without any further schema changes.

## Motivation

- The catalog is currently hardcoded in `Market_List_Generator/src/Infrastructure/Repositories/ItemRepository.cs`. A future Expo mobile app will need the same data, and duplicating ~180 items in two languages is a synchronization hazard.
- The user already wants variations for grocery items (typical Fort Atacadista use case: 5kg vs 1kg rice). A modal for variations was pre-decided when we first added the catalog.
- Migrating the web now — before the mobile app exists — keeps a single consumer of the schema during the risky first iteration, so schema changes are cheap.

## Non-goals

- Building the mobile app. That is a separate follow-up spec.
- Multi-language support, prices, barcodes, inventory tracking. Out of scope.
- Backend persistence, sync across devices, user accounts. Out of scope.
- Editing the catalog from the UI. Catalog is a static JSON file, edited by developer.

## Design

### Repository layout

```
Market_List_Generator/               (repo root)
├── Market_List_Generator/           existing .NET web (untouched top-level)
│   ├── Market_List_Generator.csproj
│   ├── Program.cs
│   ├── src/…                        Item, Variation, ItemRepository
│   └── Presentation/WebApp/…        Views, wwwroot, controllers
├── shared/
│   └── catalog.json                 single source of truth for items & categories
├── docs/superpowers/specs/…
└── Dockerfile
```

### Catalog schema

`shared/catalog.json` uses one top-level object with `categories` and `items`. Field names are lowercase for language-agnostic parsing.

```json
{
  "categories": [
    { "key": "Grains",              "name": "Grãos e Farinhas",       "order": 1 },
    { "key": "Bakery",              "name": "Padaria e Massas",       "order": 2 },
    { "key": "DairyAndEggs",        "name": "Laticínios e Ovos",      "order": 3 },
    { "key": "Meats",               "name": "Carnes e Frios",         "order": 4 },
    { "key": "Produce",             "name": "Hortifruti",             "order": 5 },
    { "key": "CondimentsAndSpices", "name": "Condimentos e Temperos", "order": 6 },
    { "key": "Beverages",           "name": "Bebidas",                "order": 7 },
    { "key": "Snacks",              "name": "Doces e Lanches",        "order": 8 },
    { "key": "Frozen",              "name": "Congelados",             "order": 9 },
    { "key": "Alcoholic",           "name": "Bebidas Alcoólicas",     "order": 10 },
    { "key": "Cleaning",            "name": "Limpeza",                "order": 11 },
    { "key": "PersonalHygiene",     "name": "Higiene Pessoal",        "order": 12 },
    { "key": "Pets",                "name": "Pet Shop",               "order": 13 },
    { "key": "Utilities",           "name": "Utilidades e Bazar",     "order": 14 }
  ],
  "items": [
    {
      "id": 100,
      "name": "Arroz",
      "category": "Grains",
      "variations": [
        { "label": "5kg", "unit": "kg", "qty": 5 },
        { "label": "2kg", "unit": "kg", "qty": 2 },
        { "label": "1kg", "unit": "kg", "qty": 1 }
      ]
    },
    { "id": 101, "name": "Arroz integral", "category": "Grains", "variations": [] }
  ]
}
```

Rules:

- **`categories[].key`** matches the `CategoryType` C# enum name exactly. New categories require adding both here and in `CategoryType.cs`.
- **`categories[].order`** drives display order in web and (later) mobile. Independent of enum ordinal.
- **`items[].id`** stays in the 100-per-category ranges established in the current repository (100–199 Grains, 200–299 Bakery, …, 1400–1499 Utilities). Unique across the catalog.
- **`items[].variations`** is always present. Empty array means "single variant, no modal". Non-empty means the client shows a chooser.
- **`variations[].label`** is what shows in the UI and in the WhatsApp message.
- **`variations[].unit` and `variations[].qty`** are optional today; reserved for future features (sort by size, aggregate quantities, price per unit). Clients ignore them for now.

### Web model changes

- `Variation` becomes a new record in `src/Domain/Entities`:
  ```csharp
  public sealed record Variation(string Label, string? Unit, decimal? Qty);
  ```
- `Item` gains `IReadOnlyList<Variation> Variations`. Its existing positional constructor is kept, plus a new one that accepts variations.
- The `CategoryType` enum is unchanged (the JSON `category` string is parsed back to the enum).

### Catalog loading

- New class `src/Infrastructure/Catalog/CatalogLoader.cs` reads `shared/catalog.json` on startup:
  - Path resolution: always `Path.Combine(AppContext.BaseDirectory, "shared", "catalog.json")`. The csproj puts the file there in both `dotnet build` (dev) and `dotnet publish` (prod), so a single path works everywhere.
  - Deserialize with `System.Text.Json` and case-insensitive property matching.
  - Parse `category` string to `CategoryType` via `Enum.Parse<CategoryType>`. Throws on unknown category so misconfigurations fail loudly at boot.
  - Returns two collections: ordered `List<CategoryDescriptor>` (key, display name, order) and `List<Item>`.
- `ItemRepository` becomes a thin wrapper that consumes `CatalogLoader` in its constructor and caches results in `IReadOnlyList<Item>`.
- A new `ICategoryRepository` (or method on the existing `IItemRepository`) exposes ordered category descriptors so the view stops hardcoding names/order in a switch expression.

### Publish + Docker

- `Market_List_Generator.csproj` includes the shared catalog as a copied content file:
  ```xml
  <ItemGroup>
    <Content Include="..\shared\catalog.json"
             Link="shared\catalog.json"
             CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
  ```
  This places the file at `bin/**/shared/catalog.json` during `dotnet build` (so `dotnet run` reads it in dev) and at `out/shared/catalog.json` during `dotnet publish` (so the Docker runtime reads it in prod). No target/copy-hook needed.
- `Dockerfile` build stage must copy the `shared/` directory before `dotnet restore`/`dotnet publish` so the include path resolves. Add a `COPY shared/ /app/shared/` line above the existing `COPY Market_List_Generator/…`.
- Verify locally with `dotnet publish -c Release -o out` and inspect that `out/shared/catalog.json` exists.

### View + client behavior

- `Index.cshtml` stops using inline `switch` expressions for category name/order. Iterates the category descriptors returned by the repository. Icons for now stay hardcoded in the view (they aren't part of the schema); a future task can move them into JSON if desired.
- Each item's `<li>` gets `data-variations` attribute encoding a JSON array (empty when the item has no variations) so the client can decide whether to open the modal without a round-trip.
- New `<dialog id="variationDialog">` element appended once to the layout. Uses the native HTML `<dialog>` API (already supported in modern evergreen browsers; falls back gracefully to open-as-modal by pattern).
- `site.ts` behavior on item click:
  1. If `data-variations` is empty, current behavior (toggle checkbox) stands.
  2. If non-empty and the item is being **checked**, prevent-default, open the modal with chips for each variation label and a "sem variação" option, and focus the first chip.
  3. On chip selection, mark the checkbox checked, stash the chosen variation on `dataset.chosenVariation`, close the modal.
  4. On unchecking, clear `dataset.chosenVariation`.
- Chip layout in the dialog reuses the existing type/color tokens (kraft/black), no new theme.

### WhatsApp message formatting

- `HomeController.GenerateWhatsAppLink` accepts `List<SelectedItemDto>` instead of `List<int>`. `SelectedItemDto { int Id; string? VariationLabel; }`.
- `site.ts` posts the enriched payload built from checkbox state + `dataset.chosenVariation`.
- `FormatMessage` renders `- Arroz (5kg)` when a variation is chosen, `- Arroz` otherwise. Grouping by category unchanged.

### Backwards compatibility

- The endpoint is only consumed by the web itself; no external clients, so the payload change is safe.
- Existing published item IDs match the JSON, so users bookmarking or copying a link don't lose anything (there is nothing to lose — no shareable list state exists yet).

## Data migration

The current `ItemRepository.cs` will be the source for the first version of `shared/catalog.json`. Migration steps:

1. Author `shared/catalog.json` by transcribing each item currently listed in `ItemRepository.cs`, preserving IDs and category assignments.
2. Add empty `variations` arrays for every item; do **not** invent variations in this migration — the user will add them as needed after the modal is live.
3. Delete the hardcoded item list from `ItemRepository.cs`.

## Testing

Given the app is a personal utility with no test infrastructure today, testing is intentionally minimal:

- Add one xUnit test project (`Market_List_Generator.Tests`) with a single test: `CatalogLoader_LoadsAllItemsWithoutError()`. Loads the actual `shared/catalog.json`, asserts categories and items count > 0, and that every item's `category` parses to a valid `CategoryType`. Runs in CI on `dotnet test` (or manually via `dotnet test` until CI exists).
- Manual smoke: click an item with variations, confirm modal opens, choose a chip, send to WhatsApp, verify the message text.

## Rollout

1. Merge to `master`; Render redeploys automatically via existing Docker pipeline.
2. Verify live site loads, all categories render, WhatsApp send still works for items without variations.
3. Introduce a first real variation set in `shared/catalog.json` (Arroz is a natural first target). Redeploy. Verify modal behavior end-to-end.

## Follow-up (out of scope here)

- **Mobile Expo app** consuming the same `shared/catalog.json`. Decisions already agreed for the follow-up spec (do not lose):
  - Repo layout: A — new `mobile/` folder at repo root.
  - Feature set: B + C — local persistence, history of previous lists, favorites.
  - Navigation shape: single Home screen + bottom sheets for variations, history, and favorites (no tab bar).
  - Aesthetic: kraft/black identity of the web, adapted for mobile idioms (solid hairlines, Reanimated checkbox, haptics, safe-area-aware dock).
  - Reuse from `C:\Users\User\Desktop\jstack\foodiary\foodiaryapp`: `createVariants` styling helper, `AppText`, `Button`, font-loading pattern, SafeAreaProvider + GestureHandlerRootView setup. Skip AuthContext, services, and TanStack Query (no backend).
  - Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (utility) via `@expo-google-fonts/*`.
- **Category icons in JSON.** Currently kept in the view. Move once the catalog format has settled.
- **Unit/qty utilization.** Sort variations by descending qty, aggregate quantities in the WhatsApp message, or expose a quick-pick "large size" filter.

## Explicit decisions worth flagging

- **One variation per item per list.** A single checkbox represents a single item; selecting Arroz picks one variation. To buy "Arroz 5kg and Arroz 1kg" in the same trip, the user picks one, sends the list, then adds the second — or opens the modal again and switches. Supporting multiple simultaneous variations of the same item would require rethinking the checkbox model and is deferred.
- **No "sem variação" for items whose `variations` array is non-empty.** If the user checks Arroz, the modal forces a choice. This matches the intent: variations exist because the size matters. If the user wants ambiguity, they can add an empty-label variation manually. (This differs from the earlier verbal mention of a "sem variação" chip in the modal; explicitly resolving here in the modal's favor of a decisive pick.)

## Open questions

None at the time of writing. All decisions were resolved during brainstorming.
