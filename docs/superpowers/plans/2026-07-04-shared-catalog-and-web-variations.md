# Shared Catalog + Web Variations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the item catalog out of C# code into `shared/catalog.json`, extend items with variations (e.g. Arroz 5kg/2kg/1kg), and let the web pick a variation via a modal that flows into the WhatsApp message.

**Architecture:** A `CatalogLoader` reads `shared/catalog.json` at boot into in-memory records. `ItemRepository` and a new `CategoryRepository` wrap that data behind existing interfaces. The Razor view drives category names/order from the repository (icons stay in the view). Each `<li>` carries a `data-variations` JSON attribute; when the user checks an item with variations, `site.ts` opens a native `<dialog>` with chips and stashes the chosen label. The Home controller now accepts `{id, variationLabel?}` per selected item and appends the label to the WhatsApp text.

**Tech Stack:** ASP.NET Core 10, C# 12/13 records, `System.Text.Json`, xUnit (new test project), native HTML `<dialog>`, TypeScript (already compiled via `Microsoft.TypeScript.MSBuild`).

---

## File Structure

**Create:**
- `shared/catalog.json` — source of truth for categories + items
- `Market_List_Generator/src/Domain/Entities/Variation.cs`
- `Market_List_Generator/src/Domain/Entities/CategoryDescriptor.cs`
- `Market_List_Generator/src/Domain/Interfaces/ICategoryRepository.cs`
- `Market_List_Generator/src/Infrastructure/Catalog/CatalogLoader.cs`
- `Market_List_Generator/src/Infrastructure/Catalog/CatalogFileDto.cs` (JSON DTOs, `internal`)
- `Market_List_Generator/src/Infrastructure/Repositories/CategoryRepository.cs`
- `Market_List_Generator/src/Application/DTOs/SelectedItemDto.cs`
- `Market_List_Generator.Tests/Market_List_Generator.Tests.csproj`
- `Market_List_Generator.Tests/CatalogLoaderTests.cs`

**Modify:**
- `Market_List_Generator/src/Domain/Entities/Item.cs` — add `Variations`
- `Market_List_Generator/src/Infrastructure/Repositories/ItemRepository.cs` — consume `CatalogLoader`
- `Market_List_Generator/Market_List_Generator.csproj` — include `shared/catalog.json` as `Content`
- `Market_List_Generator/Program.cs` — register `CatalogLoader`, `ICategoryRepository`
- `Market_List_Generator/Presentation/WebApp/Controllers/HomeController.cs` — new payload, use `ICategoryRepository` for names
- `Market_List_Generator/Presentation/WebApp/Views/Home/Index.cshtml` — descriptors from repository, `data-variations`
- `Market_List_Generator/Presentation/WebApp/Views/Shared/_Layout.cshtml` — `<dialog>` markup + register JS bindings
- `Market_List_Generator/Presentation/WebApp/wwwroot/ts/site.ts` — modal open, chip pick, enriched payload
- `Market_List_Generator/Presentation/WebApp/wwwroot/css/site.css` — dialog styling
- `Dockerfile` — `COPY shared/`

---

## Task 1: Author `shared/catalog.json` from current repository data

**Files:**
- Create: `shared/catalog.json`

- [ ] **Step 1: Create the file**

Write the full catalog (all 14 categories, all items currently in `ItemRepository.cs`). Every item gets an empty `variations: []`; real variations are added in the last task.

Save this exact content to `shared/catalog.json`:

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
    { "id": 100, "name": "Arroz",                        "category": "Grains", "variations": [] },
    { "id": 101, "name": "Arroz integral",               "category": "Grains", "variations": [] },
    { "id": 102, "name": "Feijão preto",                 "category": "Grains", "variations": [] },
    { "id": 103, "name": "Feijão carioca",               "category": "Grains", "variations": [] },
    { "id": 104, "name": "Lentilha",                     "category": "Grains", "variations": [] },
    { "id": 105, "name": "Grão-de-bico",                 "category": "Grains", "variations": [] },
    { "id": 106, "name": "Ervilha seca",                 "category": "Grains", "variations": [] },
    { "id": 107, "name": "Milho de pipoca",              "category": "Grains", "variations": [] },
    { "id": 108, "name": "Farinha de trigo",             "category": "Grains", "variations": [] },
    { "id": 109, "name": "Farinha de mandioca",          "category": "Grains", "variations": [] },
    { "id": 110, "name": "Farinha de rosca",             "category": "Grains", "variations": [] },
    { "id": 111, "name": "Fubá",                         "category": "Grains", "variations": [] },
    { "id": 112, "name": "Maizena",                      "category": "Grains", "variations": [] },
    { "id": 113, "name": "Aveia",                        "category": "Grains", "variations": [] },
    { "id": 114, "name": "Granola",                      "category": "Grains", "variations": [] },
    { "id": 115, "name": "Quinoa",                       "category": "Grains", "variations": [] },
    { "id": 116, "name": "Chia",                         "category": "Grains", "variations": [] },
    { "id": 117, "name": "Linhaça",                      "category": "Grains", "variations": [] },
    { "id": 118, "name": "Tapioca",                      "category": "Grains", "variations": [] },

    { "id": 200, "name": "Pão francês",                  "category": "Bakery", "variations": [] },
    { "id": 201, "name": "Pão de forma",                 "category": "Bakery", "variations": [] },
    { "id": 202, "name": "Pão integral",                 "category": "Bakery", "variations": [] },
    { "id": 203, "name": "Pão de hambúrguer",            "category": "Bakery", "variations": [] },
    { "id": 204, "name": "Pão de hot dog",               "category": "Bakery", "variations": [] },
    { "id": 205, "name": "Bisnaguinha",                  "category": "Bakery", "variations": [] },
    { "id": 206, "name": "Torradas",                     "category": "Bakery", "variations": [] },
    { "id": 207, "name": "Biscoito salgado (cream cracker)", "category": "Bakery", "variations": [] },
    { "id": 208, "name": "Biscoito água e sal",          "category": "Bakery", "variations": [] },
    { "id": 209, "name": "Biscoito doce (maisena)",      "category": "Bakery", "variations": [] },
    { "id": 210, "name": "Biscoito recheado",            "category": "Bakery", "variations": [] },
    { "id": 211, "name": "Wafer",                        "category": "Bakery", "variations": [] },
    { "id": 212, "name": "Rosquinha",                    "category": "Bakery", "variations": [] },
    { "id": 213, "name": "Bolo pronto",                  "category": "Bakery", "variations": [] },
    { "id": 214, "name": "Massa de pastel",              "category": "Bakery", "variations": [] },
    { "id": 215, "name": "Massa de lasanha",             "category": "Bakery", "variations": [] },
    { "id": 216, "name": "Macarrão espaguete",           "category": "Bakery", "variations": [] },
    { "id": 217, "name": "Macarrão parafuso",            "category": "Bakery", "variations": [] },
    { "id": 218, "name": "Macarrão instantâneo",         "category": "Bakery", "variations": [] },

    { "id": 300, "name": "Leite integral",               "category": "DairyAndEggs", "variations": [] },
    { "id": 301, "name": "Leite desnatado",              "category": "DairyAndEggs", "variations": [] },
    { "id": 302, "name": "Leite em pó",                  "category": "DairyAndEggs", "variations": [] },
    { "id": 303, "name": "Leite condensado",             "category": "DairyAndEggs", "variations": [] },
    { "id": 304, "name": "Creme de leite",               "category": "DairyAndEggs", "variations": [] },
    { "id": 305, "name": "Nata",                         "category": "DairyAndEggs", "variations": [] },
    { "id": 306, "name": "Manteiga",                     "category": "DairyAndEggs", "variations": [] },
    { "id": 307, "name": "Margarina",                    "category": "DairyAndEggs", "variations": [] },
    { "id": 308, "name": "Iogurte natural",              "category": "DairyAndEggs", "variations": [] },
    { "id": 309, "name": "Iogurte com sabor",            "category": "DairyAndEggs", "variations": [] },
    { "id": 310, "name": "Queijo mussarela",             "category": "DairyAndEggs", "variations": [] },
    { "id": 311, "name": "Queijo prato",                 "category": "DairyAndEggs", "variations": [] },
    { "id": 312, "name": "Queijo minas",                 "category": "DairyAndEggs", "variations": [] },
    { "id": 313, "name": "Queijo parmesão ralado",       "category": "DairyAndEggs", "variations": [] },
    { "id": 314, "name": "Requeijão",                    "category": "DairyAndEggs", "variations": [] },
    { "id": 315, "name": "Cream cheese",                 "category": "DairyAndEggs", "variations": [] },
    { "id": 316, "name": "Doce de leite",                "category": "DairyAndEggs", "variations": [] },
    { "id": 317, "name": "Ovos",                         "category": "DairyAndEggs", "variations": [] },

    { "id": 400, "name": "Peito de frango",              "category": "Meats", "variations": [] },
    { "id": 401, "name": "Coxa e sobrecoxa",             "category": "Meats", "variations": [] },
    { "id": 402, "name": "Asa de frango",                "category": "Meats", "variations": [] },
    { "id": 403, "name": "Frango inteiro",               "category": "Meats", "variations": [] },
    { "id": 404, "name": "Carne moída",                  "category": "Meats", "variations": [] },
    { "id": 405, "name": "Alcatra",                      "category": "Meats", "variations": [] },
    { "id": 406, "name": "Patinho",                      "category": "Meats", "variations": [] },
    { "id": 407, "name": "Contra filé",                  "category": "Meats", "variations": [] },
    { "id": 408, "name": "Costela",                      "category": "Meats", "variations": [] },
    { "id": 409, "name": "Picanha",                      "category": "Meats", "variations": [] },
    { "id": 410, "name": "Carne de porco (lombo)",       "category": "Meats", "variations": [] },
    { "id": 411, "name": "Bisteca suína",                "category": "Meats", "variations": [] },
    { "id": 412, "name": "Linguiça toscana",             "category": "Meats", "variations": [] },
    { "id": 413, "name": "Linguiça calabresa",           "category": "Meats", "variations": [] },
    { "id": 414, "name": "Salsicha",                     "category": "Meats", "variations": [] },
    { "id": 415, "name": "Bacon",                        "category": "Meats", "variations": [] },
    { "id": 416, "name": "Presunto",                     "category": "Meats", "variations": [] },
    { "id": 417, "name": "Peito de peru",                "category": "Meats", "variations": [] },
    { "id": 418, "name": "Mortadela",                    "category": "Meats", "variations": [] },
    { "id": 419, "name": "Salame",                       "category": "Meats", "variations": [] },
    { "id": 420, "name": "Peixe (filé)",                 "category": "Meats", "variations": [] },
    { "id": 421, "name": "Salmão",                       "category": "Meats", "variations": [] },
    { "id": 422, "name": "Atum em lata",                 "category": "Meats", "variations": [] },
    { "id": 423, "name": "Sardinha em lata",             "category": "Meats", "variations": [] },

    { "id": 500, "name": "Alface",                       "category": "Produce", "variations": [] },
    { "id": 501, "name": "Rúcula",                       "category": "Produce", "variations": [] },
    { "id": 502, "name": "Tomate",                       "category": "Produce", "variations": [] },
    { "id": 503, "name": "Cebola",                       "category": "Produce", "variations": [] },
    { "id": 504, "name": "Alho",                         "category": "Produce", "variations": [] },
    { "id": 505, "name": "Batata",                       "category": "Produce", "variations": [] },
    { "id": 506, "name": "Batata doce",                  "category": "Produce", "variations": [] },
    { "id": 507, "name": "Cenoura",                      "category": "Produce", "variations": [] },
    { "id": 508, "name": "Beterraba",                    "category": "Produce", "variations": [] },
    { "id": 509, "name": "Chuchu",                       "category": "Produce", "variations": [] },
    { "id": 510, "name": "Abobrinha",                    "category": "Produce", "variations": [] },
    { "id": 511, "name": "Abóbora",                      "category": "Produce", "variations": [] },
    { "id": 512, "name": "Pepino",                       "category": "Produce", "variations": [] },
    { "id": 513, "name": "Pimentão",                     "category": "Produce", "variations": [] },
    { "id": 514, "name": "Brócolis",                     "category": "Produce", "variations": [] },
    { "id": 515, "name": "Couve",                        "category": "Produce", "variations": [] },
    { "id": 516, "name": "Repolho",                      "category": "Produce", "variations": [] },
    { "id": 517, "name": "Couve-flor",                   "category": "Produce", "variations": [] },
    { "id": 518, "name": "Berinjela",                    "category": "Produce", "variations": [] },
    { "id": 519, "name": "Mandioca (Aipim)",             "category": "Produce", "variations": [] },
    { "id": 520, "name": "Inhame",                       "category": "Produce", "variations": [] },
    { "id": 521, "name": "Milho verde",                  "category": "Produce", "variations": [] },
    { "id": 522, "name": "Cheiro verde",                 "category": "Produce", "variations": [] },
    { "id": 523, "name": "Gengibre",                     "category": "Produce", "variations": [] },
    { "id": 524, "name": "Banana",                       "category": "Produce", "variations": [] },
    { "id": 525, "name": "Maçã",                         "category": "Produce", "variations": [] },
    { "id": 526, "name": "Laranja",                      "category": "Produce", "variations": [] },
    { "id": 527, "name": "Limão",                        "category": "Produce", "variations": [] },
    { "id": 528, "name": "Mamão",                        "category": "Produce", "variations": [] },
    { "id": 529, "name": "Melancia",                     "category": "Produce", "variations": [] },
    { "id": 530, "name": "Melão",                        "category": "Produce", "variations": [] },
    { "id": 531, "name": "Abacaxi",                      "category": "Produce", "variations": [] },
    { "id": 532, "name": "Uva",                          "category": "Produce", "variations": [] },
    { "id": 533, "name": "Morango",                      "category": "Produce", "variations": [] },
    { "id": 534, "name": "Manga",                        "category": "Produce", "variations": [] },
    { "id": 535, "name": "Pera",                         "category": "Produce", "variations": [] },
    { "id": 536, "name": "Goiaba",                       "category": "Produce", "variations": [] },
    { "id": 537, "name": "Tangerina",                    "category": "Produce", "variations": [] },
    { "id": 538, "name": "Abacate",                      "category": "Produce", "variations": [] },
    { "id": 539, "name": "Coco",                         "category": "Produce", "variations": [] },

    { "id": 600, "name": "Sal",                          "category": "CondimentsAndSpices", "variations": [] },
    { "id": 601, "name": "Sal grosso",                   "category": "CondimentsAndSpices", "variations": [] },
    { "id": 602, "name": "Açúcar refinado",              "category": "CondimentsAndSpices", "variations": [] },
    { "id": 603, "name": "Açúcar mascavo",               "category": "CondimentsAndSpices", "variations": [] },
    { "id": 604, "name": "Adoçante",                     "category": "CondimentsAndSpices", "variations": [] },
    { "id": 605, "name": "Óleo de soja",                 "category": "CondimentsAndSpices", "variations": [] },
    { "id": 606, "name": "Óleo de girassol",             "category": "CondimentsAndSpices", "variations": [] },
    { "id": 607, "name": "Azeite de oliva",              "category": "CondimentsAndSpices", "variations": [] },
    { "id": 608, "name": "Vinagre",                      "category": "CondimentsAndSpices", "variations": [] },
    { "id": 609, "name": "Molho de tomate",              "category": "CondimentsAndSpices", "variations": [] },
    { "id": 610, "name": "Extrato de tomate",            "category": "CondimentsAndSpices", "variations": [] },
    { "id": 611, "name": "Ketchup",                      "category": "CondimentsAndSpices", "variations": [] },
    { "id": 612, "name": "Mostarda",                     "category": "CondimentsAndSpices", "variations": [] },
    { "id": 613, "name": "Maionese",                     "category": "CondimentsAndSpices", "variations": [] },
    { "id": 614, "name": "Molho inglês",                 "category": "CondimentsAndSpices", "variations": [] },
    { "id": 615, "name": "Molho shoyu",                  "category": "CondimentsAndSpices", "variations": [] },
    { "id": 616, "name": "Molho barbecue",               "category": "CondimentsAndSpices", "variations": [] },
    { "id": 617, "name": "Pimenta em molho",             "category": "CondimentsAndSpices", "variations": [] },
    { "id": 618, "name": "Tempero completo",             "category": "CondimentsAndSpices", "variations": [] },
    { "id": 619, "name": "Colorau",                      "category": "CondimentsAndSpices", "variations": [] },
    { "id": 620, "name": "Cominho",                      "category": "CondimentsAndSpices", "variations": [] },
    { "id": 621, "name": "Orégano",                      "category": "CondimentsAndSpices", "variations": [] },
    { "id": 622, "name": "Pimenta do reino",             "category": "CondimentsAndSpices", "variations": [] },
    { "id": 623, "name": "Alho em pó",                   "category": "CondimentsAndSpices", "variations": [] },
    { "id": 624, "name": "Louro (folhas)",               "category": "CondimentsAndSpices", "variations": [] },
    { "id": 625, "name": "Canela",                       "category": "CondimentsAndSpices", "variations": [] },
    { "id": 626, "name": "Páprica",                      "category": "CondimentsAndSpices", "variations": [] },
    { "id": 627, "name": "Caldo de galinha",             "category": "CondimentsAndSpices", "variations": [] },
    { "id": 628, "name": "Caldo de carne",               "category": "CondimentsAndSpices", "variations": [] },
    { "id": 629, "name": "Caldo de legumes",             "category": "CondimentsAndSpices", "variations": [] },
    { "id": 630, "name": "Fermento em pó",               "category": "CondimentsAndSpices", "variations": [] },
    { "id": 631, "name": "Fermento biológico",           "category": "CondimentsAndSpices", "variations": [] },
    { "id": 632, "name": "Mel",                          "category": "CondimentsAndSpices", "variations": [] },

    { "id": 700, "name": "Café em pó",                   "category": "Beverages", "variations": [] },
    { "id": 701, "name": "Café em cápsula",              "category": "Beverages", "variations": [] },
    { "id": 702, "name": "Café solúvel",                 "category": "Beverages", "variations": [] },
    { "id": 703, "name": "Achocolatado em pó",           "category": "Beverages", "variations": [] },
    { "id": 704, "name": "Chocolate quente",             "category": "Beverages", "variations": [] },
    { "id": 705, "name": "Suco de caixinha",             "category": "Beverages", "variations": [] },
    { "id": 706, "name": "Suco em pó",                   "category": "Beverages", "variations": [] },
    { "id": 707, "name": "Suco concentrado",             "category": "Beverages", "variations": [] },
    { "id": 708, "name": "Refrigerante cola",            "category": "Beverages", "variations": [] },
    { "id": 709, "name": "Refrigerante guaraná",         "category": "Beverages", "variations": [] },
    { "id": 710, "name": "Refrigerante limão",           "category": "Beverages", "variations": [] },
    { "id": 711, "name": "Água mineral",                 "category": "Beverages", "variations": [] },
    { "id": 712, "name": "Água com gás",                 "category": "Beverages", "variations": [] },
    { "id": 713, "name": "Água de coco",                 "category": "Beverages", "variations": [] },
    { "id": 714, "name": "Chá em sachê",                 "category": "Beverages", "variations": [] },
    { "id": 715, "name": "Chá gelado",                   "category": "Beverages", "variations": [] },
    { "id": 716, "name": "Energético",                   "category": "Beverages", "variations": [] },
    { "id": 717, "name": "Isotônico",                    "category": "Beverages", "variations": [] },

    { "id": 800, "name": "Chocolate em barra",           "category": "Snacks", "variations": [] },
    { "id": 801, "name": "Bombom",                       "category": "Snacks", "variations": [] },
    { "id": 802, "name": "Bala",                         "category": "Snacks", "variations": [] },
    { "id": 803, "name": "Chiclete",                     "category": "Snacks", "variations": [] },
    { "id": 804, "name": "Gelatina",                     "category": "Snacks", "variations": [] },
    { "id": 805, "name": "Pudim pronto",                 "category": "Snacks", "variations": [] },
    { "id": 806, "name": "Salgadinho",                   "category": "Snacks", "variations": [] },
    { "id": 807, "name": "Batata chips",                 "category": "Snacks", "variations": [] },
    { "id": 808, "name": "Amendoim",                     "category": "Snacks", "variations": [] },
    { "id": 809, "name": "Castanha de caju",             "category": "Snacks", "variations": [] },
    { "id": 810, "name": "Castanha do Pará",             "category": "Snacks", "variations": [] },
    { "id": 811, "name": "Mix de nuts",                  "category": "Snacks", "variations": [] },
    { "id": 812, "name": "Barra de cereal",              "category": "Snacks", "variations": [] },
    { "id": 813, "name": "Paçoca",                       "category": "Snacks", "variations": [] },
    { "id": 814, "name": "Pé-de-moleque",                "category": "Snacks", "variations": [] },
    { "id": 815, "name": "Geléia",                       "category": "Snacks", "variations": [] },

    { "id": 900, "name": "Sorvete pote",                 "category": "Frozen", "variations": [] },
    { "id": 901, "name": "Picolé",                       "category": "Frozen", "variations": [] },
    { "id": 902, "name": "Pizza congelada",              "category": "Frozen", "variations": [] },
    { "id": 903, "name": "Lasanha congelada",            "category": "Frozen", "variations": [] },
    { "id": 904, "name": "Batata pré-frita",             "category": "Frozen", "variations": [] },
    { "id": 905, "name": "Nuggets",                      "category": "Frozen", "variations": [] },
    { "id": 906, "name": "Hambúrguer congelado",         "category": "Frozen", "variations": [] },
    { "id": 907, "name": "Kibe congelado",               "category": "Frozen", "variations": [] },
    { "id": 908, "name": "Pão de queijo congelado",      "category": "Frozen", "variations": [] },
    { "id": 909, "name": "Legumes congelados",           "category": "Frozen", "variations": [] },
    { "id": 910, "name": "Polpa de fruta",               "category": "Frozen", "variations": [] },
    { "id": 911, "name": "Peixe congelado",              "category": "Frozen", "variations": [] },

    { "id": 1000, "name": "Cerveja lata",                "category": "Alcoholic", "variations": [] },
    { "id": 1001, "name": "Cerveja long neck",           "category": "Alcoholic", "variations": [] },
    { "id": 1002, "name": "Cerveja garrafa",             "category": "Alcoholic", "variations": [] },
    { "id": 1003, "name": "Vinho tinto",                 "category": "Alcoholic", "variations": [] },
    { "id": 1004, "name": "Vinho branco",                "category": "Alcoholic", "variations": [] },
    { "id": 1005, "name": "Espumante",                   "category": "Alcoholic", "variations": [] },
    { "id": 1006, "name": "Cachaça",                     "category": "Alcoholic", "variations": [] },
    { "id": 1007, "name": "Vodka",                       "category": "Alcoholic", "variations": [] },
    { "id": 1008, "name": "Whisky",                      "category": "Alcoholic", "variations": [] },
    { "id": 1009, "name": "Gin",                         "category": "Alcoholic", "variations": [] },
    { "id": 1010, "name": "Rum",                         "category": "Alcoholic", "variations": [] },
    { "id": 1011, "name": "Licor",                       "category": "Alcoholic", "variations": [] },

    { "id": 1100, "name": "Sabão em pó",                 "category": "Cleaning", "variations": [] },
    { "id": 1101, "name": "Sabão líquido",               "category": "Cleaning", "variations": [] },
    { "id": 1102, "name": "Sabão em barra",              "category": "Cleaning", "variations": [] },
    { "id": 1103, "name": "Amaciante",                   "category": "Cleaning", "variations": [] },
    { "id": 1104, "name": "Alvejante",                   "category": "Cleaning", "variations": [] },
    { "id": 1105, "name": "Detergente",                  "category": "Cleaning", "variations": [] },
    { "id": 1106, "name": "Esponja de louça",            "category": "Cleaning", "variations": [] },
    { "id": 1107, "name": "Palha de aço",                "category": "Cleaning", "variations": [] },
    { "id": 1108, "name": "Água sanitária",              "category": "Cleaning", "variations": [] },
    { "id": 1109, "name": "Desinfetante",                "category": "Cleaning", "variations": [] },
    { "id": 1110, "name": "Limpador multiuso",           "category": "Cleaning", "variations": [] },
    { "id": 1111, "name": "Desengordurante",             "category": "Cleaning", "variations": [] },
    { "id": 1112, "name": "Limpa vidros",                "category": "Cleaning", "variations": [] },
    { "id": 1113, "name": "Limpador de piso",            "category": "Cleaning", "variations": [] },
    { "id": 1114, "name": "Lustra móveis",               "category": "Cleaning", "variations": [] },
    { "id": 1115, "name": "Limpador de banheiro",        "category": "Cleaning", "variations": [] },
    { "id": 1116, "name": "Saco de lixo",                "category": "Cleaning", "variations": [] },
    { "id": 1117, "name": "Pano de chão",                "category": "Cleaning", "variations": [] },
    { "id": 1118, "name": "Pano multiuso",               "category": "Cleaning", "variations": [] },
    { "id": 1119, "name": "Vassoura",                    "category": "Cleaning", "variations": [] },
    { "id": 1120, "name": "Rodo",                        "category": "Cleaning", "variations": [] },
    { "id": 1121, "name": "Luva de limpeza",             "category": "Cleaning", "variations": [] },

    { "id": 1200, "name": "Sabonete em barra",           "category": "PersonalHygiene", "variations": [] },
    { "id": 1201, "name": "Sabonete líquido",            "category": "PersonalHygiene", "variations": [] },
    { "id": 1202, "name": "Shampoo",                     "category": "PersonalHygiene", "variations": [] },
    { "id": 1203, "name": "Condicionador",               "category": "PersonalHygiene", "variations": [] },
    { "id": 1204, "name": "Creme de pentear",            "category": "PersonalHygiene", "variations": [] },
    { "id": 1205, "name": "Desodorante",                 "category": "PersonalHygiene", "variations": [] },
    { "id": 1206, "name": "Pasta de dente",              "category": "PersonalHygiene", "variations": [] },
    { "id": 1207, "name": "Escova de dente",             "category": "PersonalHygiene", "variations": [] },
    { "id": 1208, "name": "Fio dental",                  "category": "PersonalHygiene", "variations": [] },
    { "id": 1209, "name": "Enxaguante bucal",            "category": "PersonalHygiene", "variations": [] },
    { "id": 1210, "name": "Papel higiênico",             "category": "PersonalHygiene", "variations": [] },
    { "id": 1211, "name": "Absorvente",                  "category": "PersonalHygiene", "variations": [] },
    { "id": 1212, "name": "Fralda descartável",          "category": "PersonalHygiene", "variations": [] },
    { "id": 1213, "name": "Lenço umedecido",             "category": "PersonalHygiene", "variations": [] },
    { "id": 1214, "name": "Creme hidratante",            "category": "PersonalHygiene", "variations": [] },
    { "id": 1215, "name": "Protetor solar",              "category": "PersonalHygiene", "variations": [] },
    { "id": 1216, "name": "Repelente",                   "category": "PersonalHygiene", "variations": [] },
    { "id": 1217, "name": "Aparelho de barbear",         "category": "PersonalHygiene", "variations": [] },
    { "id": 1218, "name": "Creme de barbear",            "category": "PersonalHygiene", "variations": [] },
    { "id": 1219, "name": "Cotonete",                    "category": "PersonalHygiene", "variations": [] },
    { "id": 1220, "name": "Algodão",                     "category": "PersonalHygiene", "variations": [] },
    { "id": 1221, "name": "Perfume",                     "category": "PersonalHygiene", "variations": [] },

    { "id": 1300, "name": "Ração para cachorro",         "category": "Pets", "variations": [] },
    { "id": 1301, "name": "Ração para gato",             "category": "Pets", "variations": [] },
    { "id": 1302, "name": "Ração úmida (sachê)",         "category": "Pets", "variations": [] },
    { "id": 1303, "name": "Petisco pet",                 "category": "Pets", "variations": [] },
    { "id": 1304, "name": "Osso para cachorro",          "category": "Pets", "variations": [] },
    { "id": 1305, "name": "Areia para gato",             "category": "Pets", "variations": [] },
    { "id": 1306, "name": "Tapete higiênico",            "category": "Pets", "variations": [] },
    { "id": 1307, "name": "Shampoo pet",                 "category": "Pets", "variations": [] },
    { "id": 1308, "name": "Antipulgas",                  "category": "Pets", "variations": [] },
    { "id": 1309, "name": "Brinquedo pet",               "category": "Pets", "variations": [] },

    { "id": 1400, "name": "Papel filme",                 "category": "Utilities", "variations": [] },
    { "id": 1401, "name": "Papel manteiga",              "category": "Utilities", "variations": [] },
    { "id": 1402, "name": "Papel alumínio",              "category": "Utilities", "variations": [] },
    { "id": 1403, "name": "Papel toalha",                "category": "Utilities", "variations": [] },
    { "id": 1404, "name": "Guardanapo",                  "category": "Utilities", "variations": [] },
    { "id": 1405, "name": "Filtro de café",              "category": "Utilities", "variations": [] },
    { "id": 1406, "name": "Palito de dente",             "category": "Utilities", "variations": [] },
    { "id": 1407, "name": "Pilha AA",                    "category": "Utilities", "variations": [] },
    { "id": 1408, "name": "Pilha AAA",                   "category": "Utilities", "variations": [] },
    { "id": 1409, "name": "Lâmpada",                     "category": "Utilities", "variations": [] },
    { "id": 1410, "name": "Fósforo",                     "category": "Utilities", "variations": [] },
    { "id": 1411, "name": "Isqueiro",                    "category": "Utilities", "variations": [] },
    { "id": 1412, "name": "Vela",                        "category": "Utilities", "variations": [] },
    { "id": 1413, "name": "Copo descartável",            "category": "Utilities", "variations": [] },
    { "id": 1414, "name": "Prato descartável",           "category": "Utilities", "variations": [] },
    { "id": 1415, "name": "Talher descartável",          "category": "Utilities", "variations": [] },
    { "id": 1416, "name": "Canudo",                      "category": "Utilities", "variations": [] },
    { "id": 1417, "name": "Sacola plástica",             "category": "Utilities", "variations": [] },
    { "id": 1418, "name": "Marmita descartável",         "category": "Utilities", "variations": [] }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add shared/catalog.json
git commit -m "feat(catalog): shared/catalog.json source of truth"
```

---

## Task 2: Wire catalog.json into the csproj so it lands next to the DLL

**Files:**
- Modify: `Market_List_Generator/Market_List_Generator.csproj`

- [ ] **Step 1: Add Content include**

Open `Market_List_Generator/Market_List_Generator.csproj`. Under the existing top-level `<ItemGroup>` list (right after the `<Folder Include=...>` group), add:

```xml
  <ItemGroup>
    <Content Include="..\shared\catalog.json"
             Link="shared\catalog.json"
             CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
```

- [ ] **Step 2: Verify it copies to the build output**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: `Compilação com êxito.`

Then confirm the file lands in the output directory:

Run: `ls Market_List_Generator/bin/Debug/net10.0/shared/catalog.json`
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add Market_List_Generator/Market_List_Generator.csproj
git commit -m "build: include shared/catalog.json as content"
```

---

## Task 3: Add `Variation` record and update `Item` to hold variations

**Files:**
- Create: `Market_List_Generator/src/Domain/Entities/Variation.cs`
- Modify: `Market_List_Generator/src/Domain/Entities/Item.cs`

- [ ] **Step 1: Create the Variation record**

Create `Market_List_Generator/src/Domain/Entities/Variation.cs`:

```csharp
namespace Market_List_Generator.src.Domain.Entities;

public sealed record Variation(string Label, string? Unit, decimal? Qty);
```

- [ ] **Step 2: Extend Item with Variations**

Replace `Market_List_Generator/src/Domain/Entities/Item.cs` with:

```csharp
using Market_List_Generator.src.Domain.Enums;

namespace Market_List_Generator.src.Domain.Entities;

public sealed record Item(
    int Id,
    string Name,
    CategoryType Category,
    IReadOnlyList<Variation> Variations);
```

Note: this removes the old parameterless overload. Every caller must now pass `Variations`.

- [ ] **Step 3: Temporarily stub `ItemRepository` so the build stays green**

Replace the whole body of `Market_List_Generator/src/Infrastructure/Repositories/ItemRepository.cs` with:

```csharp
using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Interfaces;

namespace Market_List_Generator.src.Infrastructure.Repositories;

// TEMPORARY stub — Task 9 replaces this with a CatalogLoader-backed implementation.
public sealed class ItemRepository : IItemRepository
{
    public IReadOnlyList<Item> GetAll() => Array.Empty<Item>();
}
```

- [ ] **Step 4: Build**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: `Compilação com êxito.` — the stub means downstream code (like the tests we'll add) can build.

Don't commit yet — the intermediate state is not shippable. Continue to Task 4.

---

## Task 4: Add `CategoryDescriptor` record and `ICategoryRepository` interface

**Files:**
- Create: `Market_List_Generator/src/Domain/Entities/CategoryDescriptor.cs`
- Create: `Market_List_Generator/src/Domain/Interfaces/ICategoryRepository.cs`

- [ ] **Step 1: Create `CategoryDescriptor`**

Create `Market_List_Generator/src/Domain/Entities/CategoryDescriptor.cs`:

```csharp
using Market_List_Generator.src.Domain.Enums;

namespace Market_List_Generator.src.Domain.Entities;

public sealed record CategoryDescriptor(CategoryType Key, string Name, int Order);
```

- [ ] **Step 2: Create the repository interface**

Create `Market_List_Generator/src/Domain/Interfaces/ICategoryRepository.cs`:

```csharp
using Market_List_Generator.src.Domain.Entities;

namespace Market_List_Generator.src.Domain.Interfaces;

public interface ICategoryRepository
{
    IReadOnlyList<CategoryDescriptor> GetAll();
    string GetName(Market_List_Generator.src.Domain.Enums.CategoryType key);
}
```

The tree still doesn't build (Task 3 broke `ItemRepository`); continue.

---

## Task 5: Create the test project scaffold

**Files:**
- Create: `Market_List_Generator.Tests/Market_List_Generator.Tests.csproj`

- [ ] **Step 1: Create the csproj**

Create `Market_List_Generator.Tests/Market_List_Generator.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Market_List_Generator\Market_List_Generator.csproj" />
  </ItemGroup>

  <ItemGroup>
    <None Include="..\shared\catalog.json"
          Link="shared\catalog.json"
          CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>

</Project>
```

- [ ] **Step 2: Restore packages**

Run: `dotnet restore Market_List_Generator.Tests/Market_List_Generator.Tests.csproj`
Expected: `Restored ...` messages.

The referenced production project still doesn't build (Task 3 pending refactor); tests can't run yet. Continue.

---

## Task 6: Add `CatalogLoader` JSON DTOs

**Files:**
- Create: `Market_List_Generator/src/Infrastructure/Catalog/CatalogFileDto.cs`

- [ ] **Step 1: Create the internal DTOs**

Create `Market_List_Generator/src/Infrastructure/Catalog/CatalogFileDto.cs`:

```csharp
namespace Market_List_Generator.src.Infrastructure.Catalog;

internal sealed class CatalogFileDto
{
    public List<CategoryDto> Categories { get; set; } = new();
    public List<ItemDto> Items { get; set; } = new();
}

internal sealed class CategoryDto
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
}

internal sealed class ItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<VariationDto> Variations { get; set; } = new();
}

internal sealed class VariationDto
{
    public string Label { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal? Qty { get; set; }
}
```

These are internal DTOs used only for JSON binding — domain code sees `Item`/`Variation`/`CategoryDescriptor`.

---

## Task 7: Write failing test for `CatalogLoader`

**Files:**
- Create: `Market_List_Generator.Tests/CatalogLoaderTests.cs`

- [ ] **Step 1: Write the test**

Create `Market_List_Generator.Tests/CatalogLoaderTests.cs`:

```csharp
using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Infrastructure.Catalog;
using Xunit;

namespace Market_List_Generator.Tests;

public class CatalogLoaderTests
{
    [Fact]
    public void Load_ReturnsAllCategoriesAndItems()
    {
        var loader = new CatalogLoader();

        var (categories, items) = loader.Load();

        Assert.NotEmpty(categories);
        Assert.NotEmpty(items);
        Assert.All(items, item => Assert.True(Enum.IsDefined(typeof(CategoryType), item.Category)));
        Assert.All(items, item => Assert.NotNull(item.Variations));
        Assert.Equal(14, categories.Count);
    }

    [Fact]
    public void Load_CategoriesAreSortedByOrder()
    {
        var loader = new CatalogLoader();

        var (categories, _) = loader.Load();

        var orders = categories.Select(c => c.Order).ToList();
        var sorted = orders.OrderBy(o => o).ToList();
        Assert.Equal(sorted, orders);
    }
}
```

- [ ] **Step 2: Run — expect compile failure**

Run: `dotnet test Market_List_Generator.Tests/Market_List_Generator.Tests.csproj -nologo`
Expected: build fails, because `CatalogLoader` doesn't exist yet.

---

## Task 8: Implement `CatalogLoader` to pass the tests

**Files:**
- Create: `Market_List_Generator/src/Infrastructure/Catalog/CatalogLoader.cs`

- [ ] **Step 1: Implement the loader**

Create `Market_List_Generator/src/Infrastructure/Catalog/CatalogLoader.cs`:

```csharp
using System.Text.Json;
using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;

namespace Market_List_Generator.src.Infrastructure.Catalog;

public sealed class CatalogLoader
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public (IReadOnlyList<CategoryDescriptor> Categories, IReadOnlyList<Item> Items) Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "shared", "catalog.json");
        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Catalog file not found at '{path}'. The build must copy shared/catalog.json into the output directory.");
        }

        using var stream = File.OpenRead(path);
        var dto = JsonSerializer.Deserialize<CatalogFileDto>(stream, JsonOpts)
            ?? throw new InvalidDataException("Catalog file deserialized to null.");

        var categories = dto.Categories
            .Select(c => new CategoryDescriptor(
                ParseCategory(c.Key),
                c.Name,
                c.Order))
            .OrderBy(c => c.Order)
            .ToList();

        var items = dto.Items
            .Select(i => new Item(
                i.Id,
                i.Name,
                ParseCategory(i.Category),
                i.Variations
                    .Select(v => new Variation(v.Label, v.Unit, v.Qty))
                    .ToList()))
            .ToList();

        return (categories, items);
    }

    private static CategoryType ParseCategory(string key)
    {
        if (!Enum.TryParse<CategoryType>(key, ignoreCase: false, out var value))
        {
            throw new InvalidDataException(
                $"Catalog uses unknown category '{key}'. Add it to CategoryType or fix the JSON.");
        }
        return value;
    }
}
```

- [ ] **Step 2: Run the tests — expect PASS**

Run: `dotnet test Market_List_Generator.Tests/Market_List_Generator.Tests.csproj -nologo`
Expected: `Passed: 2, Failed: 0`. The `ItemRepository` stub from Task 3 keeps the main project compiling, so the test project builds and the tests exercise the real `CatalogLoader`.

- [ ] **Step 3: Commit**

```bash
git add Market_List_Generator/src/Domain/Entities/Variation.cs \
        Market_List_Generator/src/Domain/Entities/Item.cs \
        Market_List_Generator/src/Domain/Entities/CategoryDescriptor.cs \
        Market_List_Generator/src/Domain/Interfaces/ICategoryRepository.cs \
        Market_List_Generator/src/Infrastructure/Catalog/CatalogFileDto.cs \
        Market_List_Generator/src/Infrastructure/Catalog/CatalogLoader.cs \
        Market_List_Generator.Tests/Market_List_Generator.Tests.csproj \
        Market_List_Generator.Tests/CatalogLoaderTests.cs
git commit -m "feat(catalog): CatalogLoader + xUnit smoke tests"
```

---

## Task 9: Refactor `ItemRepository` and add `CategoryRepository`

**Files:**
- Modify: `Market_List_Generator/src/Infrastructure/Repositories/ItemRepository.cs`
- Create: `Market_List_Generator/src/Infrastructure/Repositories/CategoryRepository.cs`

- [ ] **Step 1: Rewrite `ItemRepository`**

Replace `Market_List_Generator/src/Infrastructure/Repositories/ItemRepository.cs` with:

```csharp
using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Interfaces;
using Market_List_Generator.src.Infrastructure.Catalog;

namespace Market_List_Generator.src.Infrastructure.Repositories;

public sealed class ItemRepository : IItemRepository
{
    private readonly IReadOnlyList<Item> _items;

    public ItemRepository(CatalogLoader loader)
    {
        var (_, items) = loader.Load();
        _items = items;
    }

    public IReadOnlyList<Item> GetAll() => _items;
}
```

- [ ] **Step 2: Create `CategoryRepository`**

Create `Market_List_Generator/src/Infrastructure/Repositories/CategoryRepository.cs`:

```csharp
using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Domain.Interfaces;
using Market_List_Generator.src.Infrastructure.Catalog;

namespace Market_List_Generator.src.Infrastructure.Repositories;

public sealed class CategoryRepository : ICategoryRepository
{
    private readonly IReadOnlyList<CategoryDescriptor> _categories;
    private readonly Dictionary<CategoryType, string> _names;

    public CategoryRepository(CatalogLoader loader)
    {
        var (categories, _) = loader.Load();
        _categories = categories;
        _names = categories.ToDictionary(c => c.Key, c => c.Name);
    }

    public IReadOnlyList<CategoryDescriptor> GetAll() => _categories;

    public string GetName(CategoryType key) =>
        _names.TryGetValue(key, out var name) ? name : key.ToString();
}
```

- [ ] **Step 3: Build**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: `Compilação com êxito.`

- [ ] **Step 4: Commit**

```bash
git add Market_List_Generator/src/Infrastructure/Repositories/ItemRepository.cs \
        Market_List_Generator/src/Infrastructure/Repositories/CategoryRepository.cs
git commit -m "refactor(catalog): repositories consume CatalogLoader"
```

---

## Task 10: Register the new services in `Program.cs`

**Files:**
- Modify: `Market_List_Generator/Program.cs`

- [ ] **Step 1: Add registrations**

Open `Market_List_Generator/Program.cs`. Locate the two lines:

```csharp
builder.Services.AddSingleton<IItemRepository, ItemRepository>();
builder.Services.AddSingleton<MarketListService>();
```

Replace them with:

```csharp
builder.Services.AddSingleton<Market_List_Generator.src.Infrastructure.Catalog.CatalogLoader>();
builder.Services.AddSingleton<IItemRepository, ItemRepository>();
builder.Services.AddSingleton<Market_List_Generator.src.Domain.Interfaces.ICategoryRepository,
                              Market_List_Generator.src.Infrastructure.Repositories.CategoryRepository>();
builder.Services.AddSingleton<MarketListService>();
```

Order matters only for readability — DI resolves automatically.

- [ ] **Step 2: Build and smoke-run**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: build succeeds.

Run: `dotnet run --project Market_List_Generator/Market_List_Generator.csproj --no-build --urls http://localhost:5057` in the background, then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5057/`.
Expected: `200`.

Kill the server (Ctrl+C or `taskkill //F //IM dotnet.exe`).

- [ ] **Step 3: Commit**

```bash
git add Market_List_Generator/Program.cs
git commit -m "chore(di): register CatalogLoader and CategoryRepository"
```

---

## Task 11: Update `Dockerfile` to include `shared/`

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Add COPY line**

Open `Dockerfile`. Between the existing `COPY Market_List_Generator/Market_List_Generator.csproj ./` line (which currently is the first COPY) and its `RUN dotnet restore`, insert a new instruction so `shared/` is present when `dotnet publish` runs. The final build stage should look like:

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Node.js required by Microsoft.TypeScript.MSBuild to compile .ts sources
RUN apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy csproj and restore as distinct layers
COPY Market_List_Generator/Market_List_Generator.csproj ./Market_List_Generator/
COPY shared/ ./shared/
WORKDIR /app/Market_List_Generator
RUN dotnet restore

# Copy everything else and build
COPY Market_List_Generator/ ./
RUN dotnet publish -c Release -o /app/out
```

Then update the runtime stage COPY paths since publish output moves to `/app/out`:

```dockerfile
# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Copy published app (includes wwwroot and shared/catalog.json from publish)
COPY --from=build /app/out .

# Copy Views (not part of publish because they're outside csproj's wwwroot)
COPY --from=build /app/Market_List_Generator/Presentation/WebApp/Views ./Presentation/WebApp/Views

# Set environment variables
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000

ENTRYPOINT ["dotnet", "Market_List_Generator.dll"]
```

The key changes vs. current Dockerfile:
- csproj copied into a `Market_List_Generator/` subdir so `..\shared\catalog.json` in the csproj resolves.
- `shared/` copied alongside so the relative include path works during restore.
- WORKDIR moves into the subdir before restore and publish.

- [ ] **Step 2: Build the Docker image locally to verify**

Run: `docker build -t mlg:local .`
Expected: build succeeds through `dotnet publish` and the final image tag creates.

If Docker is not available, skip this step and rely on Render's build after push. Note the risk in your commit message.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "build(docker): copy shared/ into build stage for catalog"
```

---

## Task 12: Add `SelectedItemDto` and update controller payload + message

**Files:**
- Create: `Market_List_Generator/src/Application/DTOs/SelectedItemDto.cs`
- Modify: `Market_List_Generator/Presentation/WebApp/Controllers/HomeController.cs`

- [ ] **Step 1: Create the DTO**

Create `Market_List_Generator/src/Application/DTOs/SelectedItemDto.cs`:

```csharp
namespace Market_List_Generator.src.Application.DTOs;

public sealed class SelectedItemDto
{
    public int Id { get; set; }
    public string? VariationLabel { get; set; }
}
```

- [ ] **Step 2: Update `HomeController`**

Replace `Market_List_Generator/Presentation/WebApp/Controllers/HomeController.cs` with:

```csharp
using Market_List_Generator.src.Application.DTOs;
using Market_List_Generator.src.Application.Services;
using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Market_List_Generator.Controllers;

public class HomeController : Controller
{
    private readonly MarketListService _service;
    private readonly ICategoryRepository _categories;

    public HomeController(MarketListService service, ICategoryRepository categories)
    {
        _service = service;
        _categories = categories;
    }

    public IActionResult Index()
    {
        var groupedItems = _service.GetItemsGroupedByCategory();
        return View(groupedItems);
    }

    [HttpPost]
    public IActionResult GenerateWhatsAppLink([FromBody] List<SelectedItemDto> selected)
    {
        var byId = _service.GetItemsGroupedByCategory()
            .SelectMany(g => g.Value)
            .ToDictionary(item => item.Id);

        var picked = selected
            .Where(s => byId.ContainsKey(s.Id))
            .Select(s => (Item: byId[s.Id], Variation: s.VariationLabel))
            .ToList();

        var message = FormatMessage(picked);
        var whatsappUrl = $"https://api.whatsapp.com/send?text={Uri.EscapeDataString(message)}";

        return Json(new { url = whatsappUrl });
    }

    private string FormatMessage(List<(Item Item, string? Variation)> items)
    {
        var grouped = items
            .GroupBy(x => x.Item.Category)
            .OrderBy(g => g.Key);

        var sb = new StringBuilder();
        sb.AppendLine("*LISTA DE COMPRAS*");
        sb.AppendLine();

        foreach (var group in grouped)
        {
            sb.AppendLine($"*{_categories.GetName(group.Key)}*");
            foreach (var (item, variation) in group.OrderBy(x => x.Item.Name))
            {
                var suffix = string.IsNullOrWhiteSpace(variation) ? "" : $" ({variation})";
                sb.AppendLine($"  - {item.Name}{suffix}");
            }
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }
}
```

- [ ] **Step 3: Build**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add Market_List_Generator/src/Application/DTOs/SelectedItemDto.cs \
        Market_List_Generator/Presentation/WebApp/Controllers/HomeController.cs
git commit -m "feat(api): accept SelectedItemDto with optional variation"
```

---

## Task 13: Refactor `Index.cshtml` — use category repository + emit `data-variations`

**Files:**
- Modify: `Market_List_Generator/Presentation/WebApp/Views/Home/Index.cshtml`

- [ ] **Step 1: Replace the view**

Replace `Market_List_Generator/Presentation/WebApp/Views/Home/Index.cshtml` with:

```cshtml
@using System.Text.Json
@using Market_List_Generator.src.Domain.Entities
@using Market_List_Generator.src.Domain.Enums
@using Market_List_Generator.src.Domain.Interfaces
@inject ICategoryRepository CategoryRepo
@model IDictionary<CategoryType, List<Item>>

@{
    ViewData["Title"] = "Lista";
    var totalItems = Model.Sum(c => c.Value.Count);
    TimeZoneInfo brTz;
    try { brTz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"); }
    catch { brTz = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time"); }
    var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, brTz);
    var today = now.ToString("dd.MM");
    var weekday = System.Globalization.CultureInfo.GetCultureInfo("pt-BR").DateTimeFormat
        .GetDayName(now.DayOfWeek).ToUpperInvariant();

    string IconFor(CategoryType c) => c switch
    {
        CategoryType.Grains => "\U0001F33E",
        CategoryType.Bakery => "\U0001F956",
        CategoryType.DairyAndEggs => "\U0001F95B",
        CategoryType.Meats => "\U0001F969",
        CategoryType.Produce => "\U0001F96C",
        CategoryType.CondimentsAndSpices => "\U0001F9C2",
        CategoryType.Beverages => "\U0001F9C3",
        CategoryType.Snacks => "\U0001F36A",
        CategoryType.Frozen => "\U0001F9CA",
        CategoryType.Alcoholic => "\U0001F37A",
        CategoryType.Cleaning => "\U0001F9FD",
        CategoryType.PersonalHygiene => "\U0001F9F4",
        CategoryType.Pets => "\U0001F43E",
        CategoryType.Utilities => "\U0001F527",
        _ => "\U0001F4E6"
    };
}

<main class="page">
    <header class="masthead">
        <div class="masthead-row">
            <h1 class="wordmark">Lista.</h1>
            <div class="datestamp">
                <span class="datestamp-date">@today</span>
                <span class="datestamp-day">@weekday</span>
            </div>
        </div>
        <p class="tagline">compra da semana — <span class="tagline-count">@totalItems produtos disponíveis</span></p>
    </header>

    <div class="search">
        <span class="search-prefix">buscar &gt;</span>
        <input id="search" type="search" placeholder="digite um produto..." autocomplete="off" spellcheck="false" />
    </div>

    <section class="grid">
        @foreach (var descriptor in CategoryRepo.GetAll())
        {
            if (!Model.TryGetValue(descriptor.Key, out var itemsInCategory)) { continue; }

            <article class="card">
                <div class="card-head">
                    <span class="card-mark" aria-hidden="true">●</span>
                    <span class="card-icon" aria-hidden="true">@IconFor(descriptor.Key)</span>
                    <h2 class="card-title">@descriptor.Name.ToLowerInvariant()</h2>
                    <span class="card-count"><span class="card-count-n">0</span>/@itemsInCategory.Count</span>
                </div>
                <ul class="rows">
                    @foreach (var item in itemsInCategory.OrderBy(i => i.Name))
                    {
                        var variationsJson = JsonSerializer.Serialize(
                            item.Variations.Select(v => v.Label).ToArray());
                        <li class="row" data-variations="@variationsJson">
                            <input type="checkbox" id="item-@item.Id" value="@item.Id" class="item-select" />
                            <label for="item-@item.Id">@item.Name</label>
                            <span class="row-variation" data-variation=""></span>
                        </li>
                    }
                </ul>
            </article>
        }
    </section>
</main>

<div class="dock" role="region" aria-label="Ações da lista">
    <div class="dock-inner">
        <div class="dock-count">
            <span class="dock-count-n" id="count">0</span>
            <span class="dock-count-l">itens marcados</span>
        </div>
        <div class="dock-actions">
            <button type="button" class="btn ghost" id="clearAllBtn">Limpar</button>
            <button type="button" class="btn ghost" id="selectAllBtn">Marcar visíveis</button>
            <button type="button" class="btn go" id="whatsappBtn" disabled>
                Enviar &nbsp;<span aria-hidden="true">→</span>
            </button>
        </div>
    </div>
</div>

<dialog id="variationDialog" class="variation-dialog" aria-labelledby="variationDialogTitle">
    <form method="dialog" class="variation-dialog-body">
        <h2 id="variationDialogTitle" class="variation-dialog-title">Escolha a variação</h2>
        <p class="variation-dialog-item" id="variationDialogItem"></p>
        <div class="variation-chips" id="variationChips"></div>
        <div class="variation-dialog-actions">
            <button type="button" class="btn ghost" id="variationCancel">Cancelar</button>
        </div>
    </form>
</dialog>
```

- [ ] **Step 2: Build and smoke**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add Market_List_Generator/Presentation/WebApp/Views/Home/Index.cshtml
git commit -m "feat(view): iterate category descriptors, expose data-variations"
```

---

## Task 14: Update `site.ts` to open the variation dialog and send enriched payload

**Files:**
- Modify: `Market_List_Generator/Presentation/WebApp/wwwroot/ts/site.ts`

- [ ] **Step 1: Replace the file**

Replace `Market_List_Generator/Presentation/WebApp/wwwroot/ts/site.ts` with:

```typescript
interface WhatsAppLinkResponse {
  url: string;
}

interface WhatsAppTarget {
  target: string;
  fallback: string;
  isMobile: boolean;
  isIOS: boolean;
}

interface SelectedItem {
  id: number;
  variationLabel: string | null;
}

function getSelectedItems(): SelectedItem[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('.item-select:checked'))
    .map(input => {
      const row = input.closest('.row') as HTMLElement | null;
      const label = row?.querySelector<HTMLElement>('.row-variation')?.dataset.variation ?? '';
      return {
        id: parseInt(input.value, 10),
        variationLabel: label === '' ? null : label
      };
    });
}

function updateCount(): void {
  const count = getSelectedItems().length;
  const countEl = document.getElementById('count');
  const btn = document.getElementById('whatsappBtn') as HTMLButtonElement | null;
  if (countEl) countEl.textContent = String(count);
  if (btn) btn.disabled = count === 0;
  updateCategoryCounters();
}

function updateCategoryCounters(): void {
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    const selected = card.querySelectorAll<HTMLInputElement>('.item-select:checked').length;
    const badge = card.querySelector<HTMLElement>('.card-count-n');
    if (badge) badge.textContent = String(selected);
  });
}

function readVariations(row: HTMLElement): string[] {
  const raw = row.dataset.variations ?? '[]';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function selectAll(): void {
  document.querySelectorAll<HTMLInputElement>('.row:not(.is-hidden) .item-select')
    .forEach(cb => {
      if (cb.checked) return;
      const row = cb.closest('.row') as HTMLElement | null;
      if (!row) return;
      const variations = readVariations(row);
      if (variations.length > 0) return; // "Marcar visíveis" skips items that need a choice
      cb.checked = true;
    });
  updateCount();
}

function clearAll(): void {
  document.querySelectorAll<HTMLInputElement>('.item-select').forEach(cb => (cb.checked = false));
  document.querySelectorAll<HTMLElement>('.row-variation').forEach(el => {
    el.dataset.variation = '';
    el.textContent = '';
  });
  updateCount();
}

function filterItems(query: string): void {
  const q = query.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    let visible = 0;
    card.querySelectorAll<HTMLElement>('.row').forEach(row => {
      const label = row.querySelector<HTMLLabelElement>('label');
      const text = (label?.textContent ?? '').toLowerCase();
      const match = q === '' || text.includes(q);
      row.classList.toggle('is-hidden', !match);
      if (match) visible++;
    });
    card.classList.toggle('is-hidden', visible === 0);
  });
}

let dialogTarget: HTMLInputElement | null = null;

function openVariationDialog(input: HTMLInputElement, variations: string[]): void {
  const dialog = document.getElementById('variationDialog') as HTMLDialogElement | null;
  const chips = document.getElementById('variationChips');
  const itemEl = document.getElementById('variationDialogItem');
  const row = input.closest('.row') as HTMLElement | null;
  if (!dialog || !chips || !row) return;

  dialogTarget = input;
  if (itemEl) itemEl.textContent = row.querySelector('label')?.textContent ?? '';

  chips.innerHTML = '';
  variations.forEach(label => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'variation-chip';
    chip.textContent = label;
    chip.addEventListener('click', () => confirmVariation(label));
    chips.appendChild(chip);
  });

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function confirmVariation(label: string): void {
  const dialog = document.getElementById('variationDialog') as HTMLDialogElement | null;
  if (!dialogTarget || !dialog) return;

  const row = dialogTarget.closest('.row') as HTMLElement | null;
  const marker = row?.querySelector<HTMLElement>('.row-variation');
  if (marker) {
    marker.dataset.variation = label;
    marker.textContent = ` (${label})`;
  }
  dialogTarget.checked = true;
  dialog.close();
  dialogTarget = null;
  updateCount();
}

function cancelVariation(): void {
  const dialog = document.getElementById('variationDialog') as HTMLDialogElement | null;
  if (!dialogTarget || !dialog) return;
  dialogTarget.checked = false;
  dialog.close();
  dialogTarget = null;
  updateCount();
}

function handleCheckboxChange(input: HTMLInputElement): void {
  const row = input.closest('.row') as HTMLElement | null;
  if (!row) { updateCount(); return; }

  const variations = readVariations(row);
  if (input.checked && variations.length > 0) {
    input.checked = false; // wait for chip confirmation
    openVariationDialog(input, variations);
    return;
  }

  if (!input.checked) {
    const marker = row.querySelector<HTMLElement>('.row-variation');
    if (marker) { marker.dataset.variation = ''; marker.textContent = ''; }
  }
  updateCount();
}

async function sendToWhatsApp(): Promise<void> {
  const selected = getSelectedItems();
  if (selected.length === 0) return;
  try {
    const res = await fetch('/Home/GenerateWhatsAppLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected)
    });
    const data = (await res.json()) as WhatsAppLinkResponse | null;
    if (!data || !data.url) return;

    const { target, fallback, isMobile, isIOS } = resolveWhatsAppUrl(data.url);

    if (isMobile) {
      window.location.href = target;
      const wait = isIOS ? 1500 : 900;
      setTimeout(() => {
        if (document.visibilityState === 'visible') window.location.href = fallback;
      }, wait);
    } else {
      const opened = window.open(target, '_blank');
      if (!opened) window.location.href = fallback;
    }
  } catch (e) {
    console.error(e);
  }
}

function resolveWhatsAppUrl(baseUrl: string): WhatsAppTarget {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;

  const match = baseUrl.match(/[?&]text=([^&]+)/);
  const text = match ? match[1] : '';

  const deepLink = `whatsapp://send?text=${text}`;
  const fallback = `https://wa.me/?text=${text}`;

  return { isMobile, isIOS, target: isMobile ? deepLink : fallback, fallback };
}

function initBindings(): void {
  document.addEventListener('change', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && t.classList.contains('item-select')) handleCheckboxChange(t as HTMLInputElement);
  });

  const search = document.getElementById('search') as HTMLInputElement | null;
  if (search) search.addEventListener('input', () => filterItems(search.value));

  const selBtn = document.getElementById('selectAllBtn');
  const clrBtn = document.getElementById('clearAllBtn');
  const waBtn = document.getElementById('whatsappBtn');
  const cancelBtn = document.getElementById('variationCancel');
  if (selBtn) selBtn.addEventListener('click', selectAll);
  if (clrBtn) clrBtn.addEventListener('click', clearAll);
  if (waBtn) waBtn.addEventListener('click', sendToWhatsApp);
  if (cancelBtn) cancelBtn.addEventListener('click', cancelVariation);

  updateCount();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBindings);
} else {
  initBindings();
}
```

- [ ] **Step 2: Build (compiles TS)**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: succeeds; `wwwroot/js/site.js` regenerated.

- [ ] **Step 3: Commit**

```bash
git add Market_List_Generator/Presentation/WebApp/wwwroot/ts/site.ts \
        Market_List_Generator/Presentation/WebApp/wwwroot/js/site.js
git commit -m "feat(ui): variation dialog + variation-aware payload"
```

---

## Task 15: Style the variation dialog

**Files:**
- Modify: `Market_List_Generator/Presentation/WebApp/wwwroot/css/site.css`

- [ ] **Step 1: Append dialog styles**

Append to the end of `Market_List_Generator/Presentation/WebApp/wwwroot/css/site.css`:

```css
/* ─────────── Variation dialog ─────────── */
.variation-dialog {
  border: var(--hairline) solid var(--ink);
  padding: 0;
  background: var(--paper);
  color: var(--ink);
  max-width: 480px;
  width: calc(100vw - 32px);
  border-radius: 0;
  box-shadow: 0 24px 60px rgba(10, 10, 10, 0.25);
}
.variation-dialog::backdrop {
  background: rgba(10, 10, 10, 0.55);
}
.variation-dialog-body { padding: 22px 22px 20px; margin: 0; }
.variation-dialog-title {
  font-family: "Space Grotesk", sans-serif;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.variation-dialog-item {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 18px;
  letter-spacing: 0.02em;
}
.variation-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.variation-chip {
  appearance: none;
  border: 1.5px solid var(--ink);
  background: var(--paper);
  color: var(--ink);
  font-family: "Space Grotesk", sans-serif;
  font-weight: 500;
  font-size: 14px;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 0;
  transition: background-color 120ms ease, color 120ms ease;
}
.variation-chip:hover { background: var(--ink); color: var(--paper); }
.variation-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.variation-dialog-actions .btn {
  background: var(--paper);
  color: var(--ink);
  border-color: var(--ink);
}
.variation-dialog-actions .btn:hover {
  background: var(--paper-2);
}
.row-variation {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 12px;
  color: var(--muted);
  margin-left: 6px;
}
```

- [ ] **Step 2: Commit**

```bash
git add Market_List_Generator/Presentation/WebApp/wwwroot/css/site.css
git commit -m "style(dialog): kraft/black variation dialog"
```

---

## Task 16: Manual smoke test — dev + Docker

- [ ] **Step 1: Start the app**

Run: `dotnet run --project Market_List_Generator/Market_List_Generator.csproj --urls http://localhost:5057` (foreground).
Expected: `Servidor iniciado!` printed.

- [ ] **Step 2: Verify in browser**

Open `http://localhost:5057/` in a browser.

Confirm:
1. All 14 categories render with correct names.
2. Search filters items live.
3. Marking an item without variations toggles normally; count increments; category badge updates.
4. Clicking "Enviar" opens WhatsApp with the correctly formatted message (categories bolded, items bulleted, no variation suffix since none set yet).
5. Kill the server.

- [ ] **Step 3: Docker smoke (optional if Docker available)**

Run: `docker build -t mlg:local .` then `docker run --rm -p 8080:10000 mlg:local`.
Curl: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/`.
Expected: `200`.

- [ ] **Step 4: Push and let Render deploy**

```bash
git push origin master
```

Watch Render logs. If the build succeeds, browse the live URL and re-run the checks above.

If anything fails on Render only (not locally), inspect logs and fix — do not skip this verification step.

- [ ] **Step 5: Nothing to commit unless fixes were made**

---

## Task 17: Enable a first real variation (Arroz 5kg / 2kg / 1kg)

**Files:**
- Modify: `shared/catalog.json`

- [ ] **Step 1: Edit the Arroz entry**

In `shared/catalog.json`, locate the item with `"id": 100` (Arroz) and replace `"variations": []` with:

```json
      "variations": [
        { "label": "5kg", "unit": "kg", "qty": 5 },
        { "label": "2kg", "unit": "kg", "qty": 2 },
        { "label": "1kg", "unit": "kg", "qty": 1 }
      ]
```

- [ ] **Step 2: Rebuild and smoke-test the dialog end-to-end**

Run: `dotnet build Market_List_Generator/Market_List_Generator.csproj -nologo`
Expected: succeeds.

Run: `dotnet run --project Market_List_Generator/Market_List_Generator.csproj --urls http://localhost:5057`

Open `http://localhost:5057/`. Click Arroz:
1. Dialog opens with three chips (5kg / 2kg / 1kg) and the item name.
2. Clicking a chip marks the checkbox, closes the dialog, and shows the variation label next to the item (` (5kg)`).
3. Clicking "Cancelar" leaves the checkbox unchecked.
4. Unchecking a marked Arroz clears the variation label.
5. "Marcar visíveis" skips Arroz (variations require an explicit choice).
6. Sending to WhatsApp includes `- Arroz (5kg)` in the message text.

Kill the server.

- [ ] **Step 3: Commit and push**

```bash
git add shared/catalog.json
git commit -m "chore(catalog): first variation set (Arroz 5kg/2kg/1kg)"
git push origin master
```

Watch the Render deploy. Re-run the dialog smoke checks on the live URL.

---

## Definition of Done

- `shared/catalog.json` is the single source of truth; deleting the old hardcoded items from `ItemRepository.cs` leaves no other consumer duplicating that data.
- `dotnet test` passes both `CatalogLoader` tests.
- `dotnet run` locally renders all 14 categories, items sorted, count works, WhatsApp send works for items without variations.
- Clicking Arroz opens the dialog, choosing a chip marks the item and appends the variation to the WhatsApp text; canceling leaves it unchecked.
- Render deploy is green and the live URL exhibits the same behaviors.
- No item name or category name is duplicated between JSON and C# code.
