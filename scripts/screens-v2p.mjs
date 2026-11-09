// Phases 2–4 screenshots (430×932 @2x) dark+light → screens/v2p2|3|4-*.png
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serve } from './serve.mjs'

const { server, url } = await serve('dist')
await mkdir('screens', { recursive: true })
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
const errs = []
const check = (cond, msg) => { if (!cond) { errs.push('CHECK FAILED: ' + msg); console.log('FAIL', msg) } }

// Seed organize data once via init script so screenshots show filled Phase 2–3 UI.
const seedScript = () => {
  window.__seedOrganize = async () => {
    const req = indexedDB.open('recipe-box')
    await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
    // App already seeded recipes; we poke localStorage flags only. Collections/plan set via UI below.
  }
}

for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme,
  })
  await ctx.addInitScript(() => {
    if (window.speechSynthesis) {
      window.__spoken = []
      window.speechSynthesis.speak = (u) => { window.__spoken.push({ text: u.text, lang: u.lang }) }
    }
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(`${scheme}: ${e}`))
  page.on('dialog', (d) => d.accept())
  const settle = async () => {
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForSelector('.toast', { state: 'detached', timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(300)
  }
  const shot = async (prefix, n) => {
    await settle()
    const p = `screens/${prefix}-${n}-${scheme}.png`
    await page.screenshot({ path: p })
    console.log(p)
  }

  await page.goto(url)
  await page.waitForFunction(() => document.querySelectorAll('.card').length >= 19, null, { timeout: 25000 })
  check(await page.locator('.tabbar-in.five').count() === 1, '5-tab bar')

  // --- Phase 2: collections + rating ---
  await page.click('.hbtn.primary')
  await page.waitForSelector('.hmenu')
  await page.click('.hmenu >> text=Collections')
  await page.waitForSelector('text=No collections yet')
  await page.fill('input[placeholder="New collection name"]', 'Steak Night')
  await page.click('[aria-label="Add collection"]')
  await page.waitForSelector('.col-card')
  await shot('v2p2', 'collections')

  await page.click('.col-card')
  await page.waitForSelector('.col-detail-head, .btn.primary.big')
  // Prefer the primary Add recipes button on the detail screen
  const addBtn = page.locator('.btn.primary.big', { hasText: 'Add recipes' })
  await addBtn.waitFor({ state: 'visible', timeout: 10000 })
  await addBtn.click()
  await page.waitForSelector('.pick-list')
  await page.click('.pick-list li:has-text("Argentine Chimichurri Steak")')
  await page.click('.pick-list li:has-text("Steak Tacos")')
  await page.click('text=Save')
  await page.waitForSelector('text=Argentine Chimichurri Steak')
  await shot('v2p2', 'collection-detail')

  await page.click('text=Argentine Chimichurri Steak')
  await page.waitForSelector('.rtitle')
  await page.click('[aria-label="4 stars"]')
  await page.waitForTimeout(200)
  await page.fill('.cook-note', 'Extra chili next time')
  await page.locator('.cook-note').blur()
  await page.waitForTimeout(200)
  check((await page.locator('.star.on').count()) === 4, '4 stars selected')
  await shot('v2p2', 'recipe-rating')

  // --- Phase 3: meal plan + shopping aisles ---
  await page.click('.tab >> text=Plan')
  await page.waitForSelector('.day-strip')
  await page.click('text=+ Add')
  await page.waitForSelector('.pick-list')
  await page.click('.pick-list li:has-text("Argentine Chimichurri Steak")')
  await page.click('text=Save day')
  await page.waitForSelector('.plan-row')
  await shot('v2p3', 'meal-plan')

  await page.click('text=Send week to shopping list')
  await page.waitForSelector('.aisle-head')
  check((await page.locator('.aisle-head').count()) >= 1, 'aisle groups present')
  await shot('v2p3', 'shopping-aisles')

  // --- Phase 4: import paste ---
  await page.click('.tab >> text=Recipes')
  await page.waitForSelector('.greet')
  await page.click('.hbtn.primary')
  await page.click('.hmenu >> text=Import')
  await page.waitForSelector('text=Paste text')
  await page.fill('textarea', `Weeknight Garlic Noodles

Ingredients
8 oz noodles
4 cloves garlic
3 tbsp butter

Steps
1. Boil the noodles.
2. Sauté garlic in butter.
3. Toss together.`)
  await page.click('text=Parse & review')
  await page.waitForSelector('input[value="Weeknight Garlic Noodles"]')
  await shot('v2p4', 'import-review')
  await page.click('text=Save recipe')
  await page.waitForSelector('.rtitle')
  check((await page.locator('.rtitle').innerText()) === 'Weeknight Garlic Noodles', 'imported title')
  await shot('v2p4', 'import-saved')

  // Cook mode shows voice trial only if SpeechRecognition exists (Chromium headless usually does not).
  await page.goto(url)
  await page.waitForFunction(() => document.querySelectorAll('.card').length >= 19)
  await page.click('.card:has-text("Argentine Chimichurri Steak")')
  await page.click('text=Start cooking')
  await page.waitForSelector('.cook-step')
  const hasMic = await page.locator('.voice-trial').count()
  if (hasMic) await shot('v2p4', 'voice-trial')
  else console.log(`screens/v2p4-voice-trial-${scheme}.png SKIPPED (no SpeechRecognition)`)

  await ctx.close()
}

await browser.close()
server.close()
if (errs.length) { console.log(errs.join('\n')); process.exit(1) }
console.log('v2p screens ok')
