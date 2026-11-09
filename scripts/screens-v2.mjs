// Recipe Box 2.0 screenshots (430x932, @2x) in dark and light -> screens/v2-*.png, plus smoke checks.
// Usage: npm run build && node scripts/screens-v2.mjs   (PW_CHROMIUM=/path/to/chrome to override the browser)
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serve } from './serve.mjs'
const { server, url } = await serve('dist')
await mkdir('screens', { recursive: true })
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
const errs = []
const check = (cond, msg) => { if (!cond) { errs.push('CHECK FAILED: ' + msg); console.log('FAIL', msg) } }

for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme })
  // Keep speech "in progress" so the Stop reading state can be captured (headless has no voices).
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
    await page.waitForTimeout(350)
  }
  const shot = async (n) => { await settle(); const p = `screens/v2-${n}-${scheme}.png`; await page.screenshot({ path: p }); console.log(p) }

  await page.goto(url)
  await page.waitForFunction(() => document.querySelectorAll('.card img.thumb').length >= 19, null, { timeout: 20000 })
  check(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === (scheme === 'dark' ? 'rgb(18, 17, 16)' : 'rgb(248, 243, 235)'), `${scheme} background`)
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.header')).backdropFilter) === 'none', 'header has no blur')
  await shot('home')

  await page.click('.chips >> text=Sauce')
  await page.waitForFunction(() => document.querySelectorAll('.card').length === 1)
  check((await page.locator('.card h3').first().innerText()).includes('Roasted Garlic Herb Butter'), 'Sauce category shows garlic butter')
  await shot('sauce')
  await page.click('.chips >> text=All')

  await page.click('.card:has-text("Argentine Chimichurri Steak")')
  await page.waitForSelector('.rtitle')
  check((await page.locator('.rtitle').innerText()) === 'Argentine Chimichurri Steak', 'bilingual main title')
  check((await page.locator('.rsub').innerText()) === '阿根廷青酱牛排', 'Chinese subtitle')
  check((await page.locator('.src-card .source-kicker').innerText()).toLowerCase() === 'inspired by', 'inspired-by card')
  await shot('recipe')
  await page.click('[aria-label="More servings"]')
  check((await page.locator('.stepper-mid').innerText()) === '3 servings', 'servings stepper')
  await page.click('[aria-label="Fewer servings"]')
  await page.locator('.steps').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70))
  check((await page.locator('.steps .steppic').count()) === 7, 'each step has a picture')
  await shot('recipe-steps')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.click('text=Start cooking')
  await page.waitForSelector('.cook-step')
  check((await page.locator('.tabbar').count()) === 0, 'tab bar hidden in cook mode')
  for (let k = 0; k < 3; k++) await page.click('text=Next step')
  check((await page.locator('.cook-count').innerText()).toUpperCase().startsWith('STEP 4 OF 7'), 'on step 4')
  await page.click('.timer-chip')
  await page.waitForSelector('.timer-card')
  await page.waitForTimeout(2300)
  check(/^2:5\d$/.test(await page.locator('.timer-text b').innerText()), 'timer counts down')
  await shot('cook')
  await page.click('.speak-btn')
  await page.waitForSelector('.speak-btn.on')
  check((await page.locator('.speak-btn').innerText()).includes('Stop reading'), 'read-aloud shows stop state')
  const spoken = await page.evaluate(() => window.__spoken)
  check(spoken.length >= 1 && spoken[0].lang === 'en-US' && spoken[0].text.startsWith('Step 4.'), 'speaks step 4 in English: ' + JSON.stringify(spoken))
  await shot('cook-reading')
  await page.click('text=Next step')
  check(await page.waitForSelector('.speak-btn.on', { state: 'detached', timeout: 2000 }).then(() => true, () => false), 'reading stops when the step changes (auto-read off)')
  check((await page.locator('.timer-card').count()) === 1, 'timer keeps running across steps')

  // Favorites persist across a reload (IndexedDB untouched by the redesign).
  await page.goto(url)
  await page.waitForFunction(() => document.querySelectorAll('.card').length >= 19)
  const before = await page.locator('.card:has-text("Steak Tacos") .fav.on').count()
  await page.click('.card:has-text("Steak Tacos") .fav')
  await page.waitForTimeout(600)
  await page.reload()
  await page.waitForFunction(() => document.querySelectorAll('.card').length >= 19)
  check((await page.locator('.card:has-text("Steak Tacos") .fav.on').count()) === 1 - before, 'favorite persists after reload')
  await page.click('.card:has-text("Steak Tacos") .fav')
  await page.waitForTimeout(600)
  await ctx.close()
}
await browser.close()
server.close()
if (errs.length) { console.log(errs.join('\n')); process.exit(1) }
console.log('v2 screens ok')
