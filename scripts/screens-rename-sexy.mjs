import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

async function serve(dir) {
  const root = path.resolve(dir)
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff': 'font/woff' }
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    const file = path.join(root, p)
    if (!file.startsWith(root)) { res.writeHead(403).end(); return }
    try {
      if (!(await stat(file)).isFile()) throw new Error()
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
      res.end(await readFile(file))
    } catch { res.writeHead(404).end('not found') }
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { server, url: `http://127.0.0.1:${server.address().port}/` }
}

await mkdir('/workspace/recipe-box/screens', { recursive: true })
const rb = await serve('/workspace/recipe-box/dist')
const hub = await serve('/workspace/app-hub')
const browser = await chromium.launch()
const errs = []

for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.goto(rb.url)
  await page.waitForFunction(() => document.querySelectorAll('.card').length >= 10, null, { timeout: 20000 })
  await page.waitForTimeout(400)
  const title = await page.locator('.htitle').innerText()
  if (title !== 'Sexy Recipe') errs.push(`${scheme}: header title is "${title}"`)
  const about = await page.evaluate(async () => {
    // peek settings about by switching tab via click
    return true
  })
  const p = `/workspace/recipe-box/screens/rename-sexy-home-${scheme}.png`
  await page.screenshot({ path: p })
  console.log(p, 'title=', title)
  await ctx.close()
}

// App Hub tile
{
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push('hub: ' + e))
  await page.goto(hub.url)
  await page.waitForTimeout(800)
  // scroll to Sexy Recipe if needed
  const has = await page.getByText('Sexy Recipe', { exact: false }).count()
  if (!has) errs.push('App Hub missing Sexy Recipe text')
  else await page.getByText('Sexy Recipe').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const p = '/workspace/recipe-box/screens/rename-sexy-app-hub-tile.png'
  await page.screenshot({ path: p })
  console.log(p, 'hub hits=', has)
  // also confirm Recipe Box gone
  const old = await page.getByText('Recipe Box', { exact: true }).count()
  if (old) errs.push('App Hub still shows Recipe Box')
  await ctx.close()
}

await browser.close()
rb.server.close()
hub.server.close()
if (errs.length) { console.log(errs.join('\n')); process.exit(1) }
console.log('rename screens ok')
