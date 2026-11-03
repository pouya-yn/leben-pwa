/**
 * Post-processes the static web export with PWA additions:
 * manifest link, Apple "add to home screen" meta tags, theme color,
 * viewport-fit=cover (safe areas), service-worker registration, and
 * web-only CSS (hidden pager scrollbar).
 *
 * Runs after `expo export --platform web`, patching every generated HTML
 * file. Keeping this outside of a custom +html.tsx avoids interfering with
 * expo's static-rendering script/CSS injection.
 *
 * Usage: node scripts/add-pwa.mjs [distDir]
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const distDir = process.argv[2] ?? "dist";

const PWA_HEAD = `
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#f2f2f7" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Leben in DE" />
<link rel="apple-touch-icon" href="/icons/icon-180.png" />
<link rel="icon" href="/icons/icon-192.png" />
<style>
  .leben-pager {
    display: flex; height: 100%; width: 100%;
    overflow-x: auto; overflow-y: hidden;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .leben-pager::-webkit-scrollbar { display: none; }
  .leben-pager-slide {
    flex: 0 0 100%; width: 100%; height: 100%;
    display: flex;
    scroll-snap-align: start; scroll-snap-stop: always;
  }
  html, body { overscroll-behavior: none; }
</style>
<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }
</script>
`;

const VIEWPORT = "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1";

let patched = 0;
for (const entry of await readdir(distDir)) {
  if (!entry.endsWith(".html")) continue;
  const file = join(distDir, entry);
  let html = await readFile(file, "utf8");
  if (!html.includes("</head>")) continue;

  // viewport-fit=cover is required for safe-area env() insets.
  html = html.replace(
    /<meta name="viewport" content="[^"]*"\s*\/?>/,
    `<meta name="viewport" content="${VIEWPORT}" />`
  );
  html = html.replace("</head>", `${PWA_HEAD}</head>`);
  await writeFile(file, html);
  patched++;
}
console.log(`PWA head injected into ${patched} HTML file(s).`);
