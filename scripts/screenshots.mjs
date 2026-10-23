// Playwright WebKit screenshots at iPhone 16 Pro Max size (440x956 @3x) -> screens/, plus an end-to-end smoke check.
// Usage: npm run build && npm run screens
import { webkit } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
import { serve } from './serve.mjs'
const { server, url } = await serve('dist')
await mkdir('screens', { recursive: true })
const browser = await webkit.launch()
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('dialog', (d) => d.accept())
const shot = async (n) => { await page.waitForSelector('.toast', { state: 'detached', timeout: 4000 }).catch(() => {}); await page.waitForTimeout(450); await page.screenshot({ path: `screens/${n}.png` }); console.log(`screens/${n}.png`) }
const check = (cond, msg) => { if (!cond) { errs.push('CHECK FAILED: ' + msg); console.log('FAIL', msg) } }

await page.goto(url)
// Fresh install: the starter smoothie is seeded automatically, pinned first.
await page.waitForFunction(() => document.querySelectorAll('.card img.thumb').length === 1)
await shot('01-first-launch')
check((await page.locator('.card h3').first().innerText()) === 'Blueberry Pineapple Yogurt Smoothie', 'starter seeded on first launch')

await page.click('.tab >> text=Settings')
await page.click('text=Load sample recipes')
await page.waitForFunction(() => document.body.innerText.includes('7 recipes · 7 with photos'))
await page.click('.tab >> text=Recipes')
await page.waitForFunction(() => document.querySelectorAll('.card img.thumb').length >= 7)
await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
await shot('02-recipes')
check((await page.locator('.card h3').first().innerText()) === 'Blueberry Pineapple Yogurt Smoothie', 'smoothie first in list')

await page.fill('.search input', 'garlic')
await shot('03-search-ingredient')
check((await page.locator('.card').count()) === 3, 'search garlic -> 3 recipes')
await page.fill('.search input', '')
await page.click('.chips >> text=Dinner')
check((await page.locator('.card').count()) === 2, 'Dinner filter -> 2')
await page.click('.chips >> text=All')

await page.click('.card:has-text("Smoothie")')
await page.waitForSelector('.rtitle')
await shot('04-smoothie-recipe')
await page.click('[aria-label="More servings"]')
await page.click('[aria-label="More servings"]')
const ing = await page.locator('.checklist li').allInnerTexts()
check(ing.some((t) => t.includes('2 to 4 tsp honey, to taste')), '2->4 servings honey: ' + ing.join(' | '))
check(ing.some((t) => t.includes('1 banana, for creaminess')), '1/2 banana -> 1 banana')
check(ing.some((t) => t.includes('1½ cups milk')), '3/4 cup -> 1½ cup')
await page.click('.checklist li >> nth=0')
await page.locator('.scaler').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70))
await shot('05-smoothie-4-servings')
await page.click('text=Add to shopping list')

await page.evaluate(() => window.scrollTo(0, 0))
await page.click('text=Start Cook Mode')
await page.waitForSelector('.cook-step')
await page.click('text=Next step')
await page.click('text=Show ingredients')
await shot('06-smoothie-cook-mode')
await page.click('[aria-label="Back"]')
await page.click('[aria-label="Back"]')

await page.click('.card:has-text("Pancakes")')
await page.click('[aria-label="Edit recipe"]')
await page.waitForSelector('.form')
await shot('07-edit')
// photo compression check: a 4032x3024 photo should be stored at <=1200px
const big = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 4032; c.height = 3024
  const g = c.getContext('2d'); g.fillStyle = '#c8783c'; g.fillRect(0, 0, 4032, 3024); g.fillStyle = '#f0dcb4'; g.beginPath(); g.arc(2016, 1512, 1000, 0, 7); g.fill()
  return c.toDataURL('image/jpeg', 0.9).split(',')[1]
})
const oldSrc = await page.getAttribute('.photo-prev', 'src')
await page.setInputFiles('input[capture]', { name: 'big.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(big, 'base64') })
await page.waitForFunction((o) => document.querySelector('.photo-prev')?.getAttribute('src') !== o, oldSrc)
const dims = await page.evaluate(async () => { const i = document.querySelector('.photo-prev'); await i.decode(); return [i.naturalWidth, i.naturalHeight] })
check(dims[0] === 1200 && dims[1] === 900, 'compressed photo 1200x900, got ' + dims)
await page.click('text=Cancel')
await page.click('[aria-label="Back"]')

await page.click('.tab >> text=Favorites')
await shot('08-favorites')

await page.click('.tab >> text=Shopping')
await page.click('text=Add from recipes')
await page.click('.pick-list li:has-text("Tomato Basil Pasta")')
await page.click('.pick-list li:has-text("Tomato Soup")')
await shot('09-pick-recipes')
await page.click('text=Add ingredients from 2 recipes')
await page.waitForSelector('.checklist.shop')
await page.click('.checklist.shop li >> nth=0')
await page.click('.checklist.shop li >> nth=2')
await shot('10-shopping')
const shopTexts = await page.locator('.checklist.shop li').allInnerTexts()
check(shopTexts.some((t) => t.startsWith('2½ tsp salt')), 'salt merged 1½ + 1 = 2½: ' + shopTexts.filter((t) => t.includes('salt')))

await page.click('.tab >> text=Settings')
await shot('11-settings')

// Backup round trip: export (download), erase, restore -> same recipes + photos.
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Back up now')])
const file = await dl.path()
const json = JSON.parse(await readFile(file, 'utf8'))
check(json.recipes.length === 7 && Object.keys(json.photos).length === 7, 'backup has 7 recipes + 7 photos')
await page.click('text=Erase all data')
await page.waitForFunction(() => document.body.innerText.includes('0 recipes'))
await page.setInputFiles('.settings input[type=file]', file)
await page.waitForFunction(() => document.body.innerText.includes('7 recipes · 7 with photos'))
console.log('backup round-trip ok')

// Remove samples: the starter smoothie stays.
await page.click('text=Remove sample recipes')
await page.waitForFunction(() => document.body.innerText.includes('1 recipe · 1 with photos'))
await page.click('.tab >> text=Recipes')
check((await page.locator('.card h3').allInnerTexts()).join() === 'Blueberry Pineapple Yogurt Smoothie', 'starter survives sample removal')

// Erase all removes it, and a relaunch does NOT re-seed it.
await page.click('.tab >> text=Settings')
await page.click('text=Erase all data')
await page.waitForFunction(() => document.body.innerText.includes('0 recipes'))
await page.reload()
await page.waitForSelector('.empty')
await page.waitForTimeout(800)
check((await page.locator('.card').count()) === 0, 'starter not re-seeded after erase + relaunch')
await shot('12-empty-after-erase')
console.log('starter seeding checks ok')

// Shell geometry check: header top 0, tab bar flush to bottom, inputs >= 16px.
const geo = await page.evaluate(() => {
  const h = document.querySelector('.header').getBoundingClientRect(), t = document.querySelector('.tabbar').getBoundingClientRect()
  const cs = (s) => getComputedStyle(document.querySelector(s))
  return { headerTop: h.top, tabBottom: Math.round(t.bottom), vh: innerHeight, bodyBg: getComputedStyle(document.body).backgroundColor, tabBg: cs('.tabbar').backgroundColor, headerBackdrop: cs('.header').backdropFilter ?? cs('.header').webkitBackdropFilter, overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY }
})
console.log('geometry', geo)
check(geo.headerTop === 0 && geo.tabBottom === geo.vh && geo.bodyBg === geo.tabBg, 'shell geometry')
const sw = await page.evaluate(() => navigator.serviceWorker?.getRegistration().then((r) => !!r))
console.log('sw registered:', sw, 'errors:', errs.length ? errs : 'none')
await browser.close(); server.close()
process.exit(errs.length ? 1 : 0)
