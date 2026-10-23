// Pure logic: fractions, ingredient scaling, search, shopping list, backup (de)serialization.

export const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Side', 'Drink', 'Other'] as const

export interface Recipe {
  id: string
  title: string
  category: string
  tags: string[]
  prepMin: number | null
  cookMin: number | null
  servings: number | null
  ingredients: string[]
  steps: string[]
  notes: string
  favorite: boolean
  photoId: string | null
  sample?: boolean
  createdAt: number
  updatedAt: number
}

export interface ShopItem {
  id: string
  text: string
  recipeTitle?: string
  checked: boolean
  createdAt: number
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/* ---------------- fractions ---------------- */

const VULGAR: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
  '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5, '⅙': 1 / 6, '⅚': 5 / 6,
}
const VULGAR_CHARS = Object.keys(VULGAR).join('')
const NICE: [number, number, string][] = [
  [1, 8, '⅛'], [1, 4, '¼'], [1, 3, '⅓'], [3, 8, '⅜'], [1, 2, '½'], [5, 8, '⅝'], [2, 3, '⅔'], [3, 4, '¾'], [7, 8, '⅞'],
]

/** Parse a single quantity token: "2", "1.5", "1,5", "1/2", "1 1/2", "½", "1½", "1 ½". Returns null if not a number. */
export function parseQuantity(s: string): number | null {
  const t = s.trim().replace(/(\d),(\d)/g, '$1.$2').replace(/\u2044/g, '/')
  let m = t.match(new RegExp(`^(\\d+)?\\s*([${VULGAR_CHARS}])$`))
  if (m) return (m[1] ? Number(m[1]) : 0) + VULGAR[m[2]]
  m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (m) return Number(m[3]) === 0 ? null : Number(m[1]) + Number(m[2]) / Number(m[3])
  m = t.match(/^(\d+)\/(\d+)$/)
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2])
  m = t.match(/^\d+(\.\d+)?$|^\.\d+$/)
  if (m) return Number(t)
  return null
}

/** Format a number as a friendly kitchen quantity: 1.5 -> "1½", 0.333 -> "⅓", 2.4 -> "2.4". */
export function formatQuantity(n: number): string {
  if (!isFinite(n) || n <= 0) return '0'
  const whole = Math.floor(n + 1e-9)
  const frac = n - whole
  if (frac < 0.03) return String(whole)
  if (frac > 0.97) return String(whole + 1)
  let best: [number, number, string] | null = null
  let bestErr = Infinity
  for (const f of NICE) {
    const err = Math.abs(frac - f[0] / f[1])
    if (err < bestErr) { bestErr = err; best = f }
  }
  if (best && bestErr <= 0.02) return (whole ? String(whole) : '') + best[2]
  const r = Math.round(n * 100) / 100
  return String(r)
}

/* ---------------- ingredients ---------------- */

const QTY = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+\\s*[${VULGAR_CHARS}]|[${VULGAR_CHARS}]|\\d+(?:[.,]\\d+)?|\\.\\d+)`
const ING_RE = new RegExp(`^\\s*(${QTY})(?:\\s*(?:-|–|—|to)\\s*(${QTY}))?(?=\\s|$|[a-zA-Z(])(\\s*)(.*)$`)

export interface ParsedIngredient { qty: number | null; qtyMax: number | null; rest: string; raw: string; glued?: boolean }

export function parseIngredient(line: string): ParsedIngredient {
  const raw = line.trim()
  const m = raw.match(ING_RE)
  if (!m) return { qty: null, qtyMax: null, rest: raw, raw }
  const qty = parseQuantity(m[1])
  if (qty === null) return { qty: null, qtyMax: null, rest: raw, raw }
  const qtyMax = m[2] ? parseQuantity(m[2]) : null
  return { qty, qtyMax, rest: m[4].trim(), raw, glued: !m[3] && /^[a-zA-Z]/.test(m[4]) }
}

/** Scale an ingredient line by factor. Lines without a leading quantity are returned unchanged. */
export function scaleIngredient(line: string, factor: number): string {
  const p = parseIngredient(line)
  if (p.qty === null || factor === 1) return p.raw
  let q = formatQuantity(p.qty * factor)
  if (p.qtyMax !== null) q += '–' + formatQuantity(p.qtyMax * factor)
  return p.rest ? `${q}${p.glued ? '' : ' '}${p.rest}` : q
}

/** Split textarea text into trimmed, non-empty lines; strips leading bullets / "1." numbering. */
export function toLines(text: string, stripNumbers = false): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*·]\s+/, ''))
    .map((l) => (stripNumbers ? l.replace(/^(?:step\s*)?\d+[.):]\s*/i, '') : l))
    .filter(Boolean)
}

export function parseTags(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of text.split(/[,#]/)) {
    const v = t.trim().toLowerCase()
    if (v && !seen.has(v)) { seen.add(v); out.push(v) }
  }
  return out
}

export function totalTime(r: Pick<Recipe, 'prepMin' | 'cookMin'>): number | null {
  const t = (r.prepMin ?? 0) + (r.cookMin ?? 0)
  return t > 0 ? t : null
}

export function formatMinutes(min: number | null): string {
  if (!min) return ''
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/* ---------------- search ---------------- */

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export interface Filter { query: string; category: string | null; favoritesOnly?: boolean }

/** Every word of the query must appear in the title, an ingredient, a tag, or the category. */
export function matchesRecipe(r: Recipe, f: Filter): boolean {
  if (f.favoritesOnly && !r.favorite) return false
  if (f.category && r.category !== f.category) return false
  const words = norm(f.query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = norm([r.title, r.category, ...r.tags, ...r.ingredients].join('\n'))
  return words.every((w) => hay.includes(w))
}

export function searchRecipes(list: Recipe[], f: Filter): Recipe[] {
  const q = norm(f.query.trim())
  return list
    .filter((r) => matchesRecipe(r, f))
    .sort((a, b) => {
      if (q) {
        const at = norm(a.title).includes(q) ? 0 : 1, bt = norm(b.title).includes(q) ? 0 : 1
        if (at !== bt) return at - bt
      }
      return a.title.localeCompare(b.title)
    })
}

/* ---------------- shopping list ---------------- */

/** Build shopping items from recipes (optionally scaled), merging identical ingredients by summing quantities. */
export function buildShoppingItems(
  picks: { recipe: Recipe; factor?: number }[],
  existing: ShopItem[] = [],
  now = Date.now(),
): ShopItem[] {
  const out = existing.map((i) => ({ ...i }))
  const index = new Map<string, { item: ShopItem; qty: number | null }>()
  for (const item of out) {
    if (item.checked) continue
    const p = parseIngredient(item.text)
    index.set(norm(p.rest), { item, qty: p.qtyMax === null ? p.qty : null })
  }
  for (const { recipe, factor = 1 } of picks) {
    for (const line of recipe.ingredients) {
      const p = parseIngredient(line)
      const key = norm(p.rest)
      const qty = p.qty === null || p.qtyMax !== null ? null : p.qty * factor
      const hit = index.get(key)
      if (hit && hit.qty !== null && qty !== null && p.rest) {
        hit.qty += qty
        hit.item.text = `${formatQuantity(hit.qty)} ${p.rest}`
        if (hit.item.recipeTitle && !hit.item.recipeTitle.split(', ').includes(recipe.title)) hit.item.recipeTitle += `, ${recipe.title}`
        continue
      }
      if (hit && qty === null && hit.qty === null && hit.item.text.toLowerCase() === line.trim().toLowerCase()) continue
      const item: ShopItem = { id: uid(), text: scaleIngredient(line, factor), recipeTitle: recipe.title, checked: false, createdAt: now }
      out.push(item)
      if (!hit) index.set(key, { item, qty })
    }
  }
  return out
}

/* ---------------- backup ---------------- */

export const BACKUP_APP = 'recipe-box'
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  recipes: Recipe[]
  shopping: ShopItem[]
  photos: Record<string, string> // photoId -> data URL
}

export async function blobToDataUrl(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${b.type || 'image/jpeg'};base64,${btoa(bin)}`
}

export function dataUrlToBlob(url: string): Blob {
  const m = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/s)
  if (!m || !m[2]) throw new Error('Bad photo data')
  const bin = atob(m[3])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: m[1] || 'image/jpeg' })
}

export async function makeBackup(recipes: Recipe[], shopping: ShopItem[], photos: Map<string, Blob>, now = new Date()): Promise<Backup> {
  const enc: Record<string, string> = {}
  for (const r of recipes) {
    const b = r.photoId ? photos.get(r.photoId) : undefined
    if (r.photoId && b) enc[r.photoId] = await blobToDataUrl(b)
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), recipes, shopping, photos: enc }
}

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : null)
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])

/** Validate + normalise a parsed backup file. Throws a friendly Error if it isn't one of ours. */
export function parseBackup(json: string): { recipes: Recipe[]; shopping: ShopItem[]; photos: Map<string, Blob> } {
  let data: unknown
  try { data = JSON.parse(json) } catch { throw new Error('That file isn’t valid JSON.') }
  const d = data as Partial<Backup>
  if (!d || typeof d !== 'object' || d.app !== BACKUP_APP || !Array.isArray(d.recipes)) throw new Error('That file isn’t a Recipe Box backup.')
  if (typeof d.version === 'number' && d.version > BACKUP_VERSION) throw new Error('This backup was made by a newer version of the app.')
  const photos = new Map<string, Blob>()
  for (const [id, url] of Object.entries(d.photos ?? {})) {
    try { if (typeof url === 'string') photos.set(id, dataUrlToBlob(url)) } catch { /* skip bad photo */ }
  }
  const now = Date.now()
  const recipes: Recipe[] = d.recipes
    .filter((r): r is Recipe => !!r && typeof r === 'object' && typeof (r as Recipe).title === 'string')
    .map((r) => ({
      id: typeof r.id === 'string' && r.id ? r.id : uid(),
      title: r.title,
      category: typeof r.category === 'string' ? r.category : 'Other',
      tags: strs(r.tags),
      prepMin: num(r.prepMin),
      cookMin: num(r.cookMin),
      servings: num(r.servings),
      ingredients: strs(r.ingredients),
      steps: strs(r.steps),
      notes: typeof r.notes === 'string' ? r.notes : '',
      favorite: !!r.favorite,
      photoId: typeof r.photoId === 'string' && photos.has(r.photoId) ? r.photoId : null,
      ...(r.sample ? { sample: true } : {}),
      createdAt: num(r.createdAt) ?? now,
      updatedAt: num(r.updatedAt) ?? now,
    }))
  const shopping: ShopItem[] = (Array.isArray(d.shopping) ? d.shopping : [])
    .filter((i): i is ShopItem => !!i && typeof i === 'object' && typeof (i as ShopItem).text === 'string')
    .map((i) => ({ id: typeof i.id === 'string' ? i.id : uid(), text: i.text, recipeTitle: typeof i.recipeTitle === 'string' ? i.recipeTitle : undefined, checked: !!i.checked, createdAt: num(i.createdAt) ?? now }))
  return { recipes, shopping, photos }
}
