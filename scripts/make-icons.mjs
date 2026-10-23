// Render PWA / iOS icons from the SVG mark with Playwright WebKit -> public/icons/*.png
import { webkit } from 'playwright'
const mark = (inset) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%"><rect width="64" height="64" fill="#C8472A"/><g transform="translate(${inset} ${inset}) scale(${(64 - 2 * inset) / 64})"><g fill="none" stroke="#FFF4E4" stroke-width="3.2" stroke-linecap="round"><path d="M23 9c-3.5 4 3.5 6.5 0 11"/><path d="M32 7c-3.5 4 3.5 6.5 0 11"/><path d="M41 9c-3.5 4 3.5 6.5 0 11"/></g><path d="M10 28h44a22 20 0 0 1-44 0z" fill="#FFF4E4"/><rect x="22" y="49" width="20" height="5" rx="2.5" fill="#FFF4E4"/><path d="M14 33h36" stroke="#F2B544" stroke-width="3" stroke-linecap="round"/></g></svg>`
const jobs = [['icon-192', 192, 4, 0.22], ['icon-512', 512, 4, 0.22], ['icon-maskable-512', 512, 11, 0], ['apple-touch-icon', 180, 6, 0], ['favicon-32', 32, 2, 0.22]]
const b = await webkit.launch()
for (const [name, size, inset, radius] of jobs) {
  const p = await b.newPage({ viewport: { width: size, height: size } })
  await p.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${radius * size}px;overflow:hidden">${mark(inset)}</div></body></html>`)
  await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: radius > 0 })
  await p.close()
}
await b.close()
console.log('icons ok')
