# Recipe Box

A small installable web app (PWA) for keeping your own recipes on your phone — photos, ingredients, steps,
a serving scaler, a big-text Cook mode and a shopping list. Everything is stored on the device (IndexedDB);
use **Settings → Back up now** to save a JSON file (photos included) and **Restore from backup** to bring it back.

- React + TypeScript + Vite (`base: './'`), offline service worker with a versioned cache (`recipe-box-v1-<hash>`)
- `npm test` — vitest (fractions, scaler, search, shopping-list merge, backup round-trip, starter seeding)
- `npm run build && npm run screens` — Playwright WebKit screenshots at 440×956 @3x into `screens/` plus an end-to-end check
- `node scripts/make-icons.mjs` — regenerate the PNG icons from the SVG mark
- Deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`

## 2.0 — Night Kitchen

- Theme follows the iPhone light/dark setting (`prefers-color-scheme`): charcoal `#121110` + amber `#F2A33A` in dark, warm off-white + amber in light. Manrope (bundled, offline) with PingFang SC for Chinese. Header, tab bar and bottom bars are solid (no blur).
- Home: large photo tiles with category or 小红书 / TikTok badges and bilingual titles (Chinese shown as a subtitle; stored titles are unchanged).
- Recipe page: Inspired-by source card, servings stepper, steps with redrawn theme-aware step pictures, fixed Start cooking bar.
- Cook mode: big step picture, countdown timers found in step text (several at once, pause / +1 / dismiss, chime), Up next, large Back / Next, and a Read aloud button (Web Speech `speechSynthesis`, Chinese or English voice per text run; stops on step change unless Auto-read is on). No speech recognition.
- Storage is unchanged (IndexedDB `recipe-box` v2, same stores and seed flags), covered by `src/carryover.test.ts`. Service worker cache prefix bumped to `recipe-box-v3-` for Phase 1 and `recipe-box-v4-` for Phases 2–4.
- App icon: Night Kitchen Cloche (`node scripts/make-icons.mjs && python3 scripts/flatten-icons.py`; opaque icons have no alpha).
- Screenshots + smoke checks: `npm run build && npm run screens:v2` (Chromium, 430×932, dark and light).

## 2.1 — Phases 2–4 (organize, plan, import)

- **Collections**: user-named groups; add/remove recipes from the recipe page or collection screen.
- **Ratings & cook notes**: 1–5 stars, personal cook notes, “Mark cooked” date on each recipe (optional fields; old installs keep their data).
- **Meal plan**: Plan tab with a Mon–Sun strip; send the week to the shopping list.
- **Shopping**: aisle grouping on top of the existing merge logic.
- **Import**: paste caption/text parser + link fetch for schema.org Recipe JSON-LD when CORS allows (Xiaohongshu/TikTok/Instagram usually block — paste fallback).
- **Voice trial** (cook mode): optional, off by default; Web Speech recognition for next/back/repeat/start timer; hidden when unsupported.
- Backup v2 includes collections + meal plan; v1 backups still restore. Collections/meal plan live in the `meta` store (no DB version bump). Screens: `npm run screens:v2p`.
