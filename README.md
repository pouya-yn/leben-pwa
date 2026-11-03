# leben-pwa — Leben in Deutschland practice app (PWA)

Progressive Web App version of the `leben` React Native app: same screens,
same 310-question catalog (general + Berlin), same behavior — installable
from the browser via "Add to Home Screen".

## Run locally

```sh
npm install
npx expo start --web          # dev server with hot reload
```

## Production build

```sh
npm run export:pwa            # expo export --platform web + PWA head injection
# output in dist/
```

Test `dist/` locally with a server that resolves clean URLs:

```sh
npx serve dist
```

## Deploy notes

**Live: https://pouya-yn.github.io/leben-pwa/**

Deployed to **GitHub Pages** via `.github/workflows/deploy.yml` — every push
to `main` rebuilds and redeploys automatically (free).

- `app.json` sets `experiments.baseUrl: "/leben-pwa"` so all asset URLs are
  correct under the project-site sub-path. Change it if you rename the repo
  or move to a root-domain host (Netlify/Vercel/Cloudflare: remove it and
  set it back to `"/"`... i.e. delete the `baseUrl` line).
- Manifest and SW use **relative** URLs (`./`, `icons/…`, `sw.js`), so they
  work at any base path.
- GitHub Pages has no clean-URL rewrites: the workflow copies `index.html`
  to `404.html` as a SPA fallback so deep links like `/leben-pwa/question`
  boot the app client-side. On hosts with clean-URL support
  (Netlify/Vercel/`npx serve`) the per-route static pages are served
  directly instead.
- **Add to Home Screen**: `scripts/add-pwa.mjs` injects the manifest link,
  Apple PWA meta tags, `viewport-fit=cover`, the service-worker
  registration, and the pager CSS into every exported HTML file. iOS homescreen
  installs run standalone (no browser UI) and respect the bottom safe area.
- **Offline**: `public/sw.js` caches assets and serves navigations
  network-first (falls back to cache offline). Bump `CACHE` in `sw.js` when
  shipping changed assets.

## Differences from the native app (platform shims only)

| Concern | Native | PWA |
|---|---|---|
| Question pager | `react-native-pager-view` | CSS scroll-snap pager (`src/components/pager.web.tsx`) |
| Share | `Share.share` | Web Share API, clipboard fallback (`src/utils/share.ts`) |
| Confirm dialogs | `Alert.alert` | `window.confirm` (`src/utils/confirm.ts`) |
| Bottom safe area | `useSafeAreaInsets` | `env(safe-area-inset-bottom)` probe (`src/hooks/use-bottom-inset.ts`) |
| Headers | native stack header | stack header rendered by expo-router web |

Everything else (screens, catalog `src/data/questions.json`, store, exam
logic, translations) is shared 1:1 with the React Native app. When the
catalog is updated there, copy `src/data/` and `src/assets/questions/`
over here.
