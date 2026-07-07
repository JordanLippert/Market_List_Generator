# Pracomprá — Mobile & PWA

App de lista de compras em Expo React Native. Roda como PWA instalável no iPhone e Android, funciona offline após primeiro load.

Produção: [`https://pracompra.vercel.app`](https://pracompra.vercel.app)

## Stack

- Expo SDK 54 (React Native 0.81, React 19)
- `react-native-web` + Metro static single output pro build PWA
- `@react-native-async-storage/async-storage` — vira `localStorage` na web
- Service worker em TypeScript, empacotado com esbuild
- Deploy Vercel via `vercel.json` no root do repo

## Pré-requisitos

- Node 20+
- pnpm 11.10 (fixado via `packageManager` em `package.json` + Corepack)

## Scripts

```
pnpm start                          # Expo Dev Server (web / iOS / Android)
pnpm android                        # Expo Dev + abre Android emulator
pnpm ios                            # Expo Dev + abre iOS simulator (mac)
pnpm typecheck                      # tsc --noEmit
pnpm run build:sw                   # bundla src/sw.ts → public/sw.js
pnpm run build:web                  # build:sw + expo export -p web + postbuild inject
pnpm run preview:web                # build:web + serve local em dist/
pnpm run deploy:web                 # build:web + vercel --prod
```

## Como instalar no celular

### iPhone (Safari)

1. Abre `https://pracompra.vercel.app` no Safari
2. Compartilhar (botão inferior) → **Adicionar à Tela de Início**
3. Ícone aparece na home. Toque abre fullscreen sem barra do browser
4. Funciona offline depois do primeiro load

Não precisa Apple Developer nem re-signing.

### Android (Chrome / Edge)

1. Abre `https://pracompra.vercel.app` no Chrome
2. Menu → **Instalar app** (ou banner automático)
3. Vira WebAPK real (aparece em Configurações → Apps)
4. Offline após primeiro load

## Como o PWA foi montado

- **Manifest** — `public/manifest.webmanifest`. Nome, ícones, `display: standalone`, cor de fundo.
- **Ícones** — `public/icons/icon.png` (1254x1254), referenciado com `purpose: "any maskable"`. Browsers escalam.
- **Service worker** — `src/sw.ts` (fonte TypeScript). Estratégia cache-first no shell, cache runtime pra assets. Versionado, faz `skipWaiting` + `clients.claim` no update.
- **Build SW** — `scripts/build-sw.mjs` chama esbuild pra bundlar TS → `public/sw.js`.
- **Post-build inject** — `scripts/postbuild-web.mjs` edita `dist/index.html` pós-export do Expo pra adicionar `<link rel="manifest">`, meta `apple-touch-icon`, `theme-color` e a tag inline que registra o SW.
- **Cache headers** — `vercel.json` no root força `no-store` no `sw.js` e content-type correto no manifest.

## Estrutura

```
mobile/
├── app.json                        # config Expo (name Pracomprá, web.output single)
├── package.json                    # scripts + packageManager
├── pnpm-lock.yaml
├── pnpm-workspace.yaml             # allowBuilds pra esbuild postinstall
├── metro.config.js                 # watchFolders inclui ../shared
├── babel.config.js                 # react-native-worklets/plugin
├── assets/
│   └── icon.png                    # ícone nativo Expo (1254x1254)
├── public/
│   ├── manifest.webmanifest        # PWA manifest
│   └── icons/
│       └── icon.png                # ícone PWA
├── scripts/
│   ├── build-sw.mjs                # esbuild sw.ts → public/sw.js
│   └── postbuild-web.mjs           # injeta meta+SW register em dist/index.html
├── src/
│   ├── app/                        # contexts, lib, types (regra de negócio)
│   ├── ui/                         # componentes, screens, styles (visual)
│   └── sw.ts                       # service worker
└── index.ts                        # registerRootComponent(App)
```

## Deploy

Automático em push master via `.github/workflows/deploy-web.yml`. Manual:

```
pnpm dlx vercel --prod
```

De dentro do repo root (não do `mobile/`), porque `vercel.json` está no root e referencia `mobile/dist` como output.

## Fonte da verdade do catálogo

`shared/catalog.json` no root do repo. Compartilhado com o frontend web C#. Categoria nova precisa de emoji também em `src/app/lib/catalog.ts` no mapa `CATEGORY_EMOJI`.
