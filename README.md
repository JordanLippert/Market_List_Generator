# Market List Generator

Lista de compras pro mercado. Dois frontends, um catálogo compartilhado, envio pronto pro WhatsApp.

- **Web C#** — `https://market-list-generator.onrender.com` (cold start ~10s no Render Free)
- **PWA Pracomprá** — `https://pracompra.vercel.app` (instalável no iPhone e Android, funciona offline)

Ambos leem o mesmo `shared/catalog.json`, então itens e categorias ficam sincronizados.

## Estrutura

```
Market_List_Generator/
├── shared/
│   └── catalog.json                # itens + categorias (fonte da verdade)
├── Market_List_Generator/          # frontend C# .NET 8 (ASP.NET MVC)
│   ├── src/                        # Domain / Application / Infrastructure
│   ├── Presentation/WebApp/        # Views Razor + wwwroot
│   └── Program.cs
├── mobile/                         # frontend Expo React Native + PWA
│   ├── src/                        # app + ui + service worker
│   ├── public/                     # manifest + ícones PWA
│   ├── scripts/                    # build SW, post-build inject
│   └── vercel.json → (../vercel.json)
├── docs/superpowers/               # specs e planos de sessões
├── vercel.json                     # config deploy PWA
├── render.yaml                     # config deploy C# no Render
└── .github/workflows/              # CI + deploy Vercel + expiry check
```

## Rodar local

### Web C# (.NET 8)

```
cd Market_List_Generator
dotnet run
```

Acessa `https://localhost:51773`.

### Mobile / PWA (Expo SDK 54)

```
cd mobile
pnpm install
pnpm start                          # Expo Dev, escolhe web/iOS/Android
pnpm run build:web                  # gera PWA em mobile/dist
```

Mais detalhes em [`mobile/README.md`](mobile/README.md).

## CI/CD

Três workflows em `.github/workflows/`:

- **`ci.yml`** — em PR e push master: typecheck + build PWA. Upload dist como artifact.
- **`deploy-web.yml`** — em push master: deploy Vercel automático via CLI.
- **`vercel-token-expiry.yml`** — cron semanal: abre issue quando o token Vercel está a ≤30 dias de expirar.

Secrets necessárias no repo (setadas via `gh secret set`):

- `VERCEL_TOKEN` — token full-scope de `vercel.com/account/tokens`
- `VERCEL_ORG_ID` — de `.vercel/project.json`
- `VERCEL_PROJECT_ID` — de `.vercel/project.json`

## Editar catálogo

Toda mudança de item/categoria em `shared/catalog.json` reflete nos dois frontends. Categorias novas precisam de emoji também em:

- Web C#: `Market_List_Generator/Presentation/WebApp/Views/Home/Index.cshtml`
- Mobile: `mobile/src/app/lib/catalog.ts` (mapa `CATEGORY_EMOJI`)

## Autor

Jordan Lippert
