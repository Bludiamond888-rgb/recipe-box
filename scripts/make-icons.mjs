// Render PWA / iOS icons from the Night Kitchen Cloche mark with Playwright Chromium -> public/icons/*.png
// Opaque icons are flattened to RGB afterwards (scripts/flatten-icons.py) so iOS gets no alpha channel.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const MARK = `<circle cx="512" cy="262" r="48" fill="#F2A33A"/><path d="M210 650a302 302 0 0 1 604 0z" fill="#F2A33A"/><path d="M330 560a200 200 0 0 1 120-150" fill="none" stroke="#121110" stroke-width="34" stroke-linecap="round" opacity=".35"/><rect x="150" y="676" width="724" height="62" rx="31" fill="#F4EDE4"/><path d="M300 820h424" stroke="#F2A33A" stroke-width="26" stroke-linecap="round" opacity=".55"/>`
const svg = (scale = 1, rx = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%"><rect width="1024" height="1024" rx="${rx}" fill="#121110"/><g transform="translate(${512 * (1 - scale)} ${512 * (1 - scale)}) scale(${scale})">${MARK}</g></svg>`
writeFileSync('public/icons/icon.svg', svg(1, 229))
// [name, size, mark scale, corner radius fraction]
const jobs = [['icon-192', 192, 1, 0], ['icon-512', 512, 1, 0], ['icon-maskable-512', 512, 0.78, 0], ['apple-touch-icon', 180, 1, 0], ['favicon-32', 32, 1, 0.22]]
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
for (const [name, size, scale, radius] of jobs) {
  const p = await b.newPage({ viewport: { width: size, height: size } })
  await p.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${radius * size}px;overflow:hidden">${svg(scale)}</div></body></html>`)
  await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: radius > 0 })
  await p.close()
}
await b.close()
console.log('icons ok')
