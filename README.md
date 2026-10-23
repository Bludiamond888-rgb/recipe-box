# Recipe Box

A small installable web app (PWA) for keeping your own recipes on your phone — photos, ingredients, steps,
a serving scaler, a big-text Cook mode and a shopping list. Everything is stored on the device (IndexedDB);
use **Settings → Back up now** to save a JSON file (photos included) and **Restore from backup** to bring it back.

- React + TypeScript + Vite (`base: './'`), offline service worker with a versioned cache (`recipe-box-v1-<hash>`)
- `npm test` — vitest (fractions, scaler, search, shopping-list merge, backup round-trip, starter seeding)
- `npm run build && npm run screens` — Playwright WebKit screenshots at 440×956 @3x into `screens/` plus an end-to-end check
- `node scripts/make-icons.mjs` — regenerate the PNG icons from the SVG mark
- Deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`
