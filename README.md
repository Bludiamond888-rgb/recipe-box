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
- Storage is unchanged (IndexedDB `recipe-box` v2, same stores and seed flags), covered by `src/carryover.test.ts`. Service worker cache prefix bumped to `recipe-box-v3-`.
- App icon: Night Kitchen Cloche (`node scripts/make-icons.mjs && python3 scripts/flatten-icons.py`; opaque icons have no alpha).
- Screenshots + smoke checks: `npm run build && npm run screens:v2` (Chromium, 430×932, dark and light).
