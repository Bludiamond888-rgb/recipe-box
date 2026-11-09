import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serve } from './serve.mjs'
const { server, url } = await serve('dist')
await mkdir('screens', { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
await page.goto(url)
await page.waitForFunction(() => document.querySelectorAll('.card').length >= 20, null, { timeout: 25000 })
await page.click('.card:has-text("Steak Salad")')
await page.waitForSelector('.rtitle')
const title = await page.locator('.rtitle').innerText()
if (title !== 'Steak Salad') errs.push('title=' + title)
const kicker = await page.locator('.src-card .source-kicker').innerText().catch(() => '')
if (kicker.toLowerCase() !== 'inspired by') errs.push('kicker=' + kicker)
await page.waitForTimeout(400)
await page.screenshot({ path: 'screens/steak-salad-detail-dark.png' })
console.log('screens/steak-salad-detail-dark.png')
await page.locator('.steps').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70))
await page.waitForTimeout(300)
await page.screenshot({ path: 'screens/steak-salad-steps-dark.png' })
console.log('screens/steak-salad-steps-dark.png')
await browser.close()
server.close()
if (errs.length) { console.log(errs.join('\n')); process.exit(1) }
console.log('ok')
