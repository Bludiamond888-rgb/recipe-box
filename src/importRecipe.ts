// Phase 4: parse a pasted caption / recipe text, or schema.org Recipe JSON-LD from a page.
import { CATEGORIES, toLines, uid, type Recipe } from './logic'

export interface DraftRecipe {
  title: string
  category: string
  ingredients: string[]
  steps: string[]
  notes: string
  prepMin: number | null
  cookMin: number | null
  servings: number | null
  sourceUrl?: string
  sourceLabel?: string
}

export function emptyDraft(partial: Partial<DraftRecipe> = {}): DraftRecipe {
  return {
    title: '', category: 'Dinner', ingredients: [], steps: [], notes: '',
    prepMin: null, cookMin: null, servings: null, ...partial,
  }
}

export function draftToRecipe(d: DraftRecipe, now = Date.now()): Recipe {
  return {
    id: uid(),
    title: d.title.trim() || 'Imported recipe',
    category: d.category || 'Dinner',
    tags: ['imported'],
    prepMin: d.prepMin, cookMin: d.cookMin, servings: d.servings,
    ingredients: d.ingredients, steps: d.steps, notes: d.notes,
    favorite: false, photoId: null,
    ...(d.sourceUrl ? { sourceUrl: d.sourceUrl } : {}),
    ...(d.sourceLabel ? { sourceLabel: d.sourceLabel } : {}),
    createdAt: now, updatedAt: now,
  }
}

/** Heuristic: split pasted caption / blog text into title, ingredients, steps. */
export function parseRecipeText(raw: string): DraftRecipe {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return emptyDraft()

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let title = ''
  let ingredients: string[] = []
  let steps: string[] = []
  let notes = ''
  let mode: 'start' | 'ing' | 'steps' | 'notes' = 'start'
  const ingHead = /^(ingredients?|you(?:'|’)ll need|what you need|材料|食材)\b[:：]?\s*$/i
  const stepHead = /^(directions?|method|steps?|instructions?|how to|做法|步骤)\b[:：]?\s*$/i
  const noteHead = /^(notes?|tips?|备注|小贴士)\b[:：]?\s*$/i

  for (const line of lines) {
    if (ingHead.test(line)) { mode = 'ing'; continue }
    if (stepHead.test(line)) { mode = 'steps'; continue }
    if (noteHead.test(line)) { mode = 'notes'; continue }

    if (mode === 'start') {
      if (!title) {
        // First substantial line is the title (strip hashtags / @handles for social captions).
        title = line.replace(/#[\w\u4e00-\u9fff]+/g, '').replace(/@[\w.]+/g, '').trim()
        if (!title) title = line
        continue
      }
      // Before a heading, guess: numbered / "Step" -> steps; qty-leading -> ingredients; else notes.
      if (/^(?:step\s*)?\d+[.):]/i.test(line) || /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(line)) {
        mode = 'steps'
        steps.push(line.replace(/^(?:step\s*)?\d+[.):]\s*/i, '').replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, ''))
      } else if (/^[-•*·]\s+/.test(line) || /^\d+[./\s]/.test(line) || /^[½¼¾⅓⅔]/.test(line)) {
        mode = 'ing'
        ingredients.push(line.replace(/^[-•*·]\s+/, ''))
      } else {
        notes = notes ? `${notes}\n${line}` : line
      }
      continue
    }
    if (mode === 'ing') ingredients.push(line.replace(/^[-•*·]\s+/, ''))
    else if (mode === 'steps') steps.push(line.replace(/^(?:step\s*)?\d+[.):]\s*/i, ''))
    else notes = notes ? `${notes}\n${line}` : line
  }

  // If nothing classified, treat whole body after title as notes.
  if (!ingredients.length && !steps.length && notes) {
    // Try to split by blank-line-ish double newlines already collapsed — leave as notes.
  }

  // Detect category keywords in title.
  let category: string = 'Dinner'
  const t = title.toLowerCase()
  for (const c of CATEGORIES) {
    if (t.includes(c.toLowerCase())) { category = c; break }
  }
  if (/\b(smoothie|pancake|oatmeal|breakfast|brunch)\b/i.test(title)) category = 'Breakfast'
  if (/\b(cookie|cake|pie|dessert|ice cream|brownie)\b/i.test(title)) category = 'Dessert'
  if (/\b(sauce|dressing|marinade|butter|chimichurri)\b/i.test(title)) category = 'Sauce'
  if (/\b(cocktail|drink|latte|tea|coffee)\b/i.test(title)) category = 'Drinks'

  return emptyDraft({
    title: title || 'Imported recipe',
    category,
    ingredients: toLines(ingredients.join('\n')),
    steps: toLines(steps.join('\n'), true),
    notes: notes.trim(),
  })
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) {
    if (typeof v === 'string') return toLines(v, true)
    return []
  }
  return v.flatMap((x) => {
    if (typeof x === 'string') return [x]
    if (x && typeof x === 'object' && typeof (x as { text?: string }).text === 'string') return [(x as { text: string }).text]
    if (x && typeof x === 'object' && typeof (x as { name?: string }).name === 'string') return [(x as { name: string }).name]
    return []
  }).map((s) => s.trim()).filter(Boolean)
}

function parseDuration(iso: unknown): number | null {
  if (typeof iso !== 'string') return null
  const m = iso.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?|(\d+)D)/i)
  if (!m) return null
  const days = Number(m[4] ?? 0)
  const h = Number(m[1] ?? 0)
  const min = Number(m[2] ?? 0)
  const s = Number(m[3] ?? 0)
  const total = days * 24 * 60 + h * 60 + min + Math.round(s / 60)
  return total > 0 ? total : null
}

function recipeFromJsonLd(obj: Record<string, unknown>, pageUrl?: string): DraftRecipe | null {
  const type = obj['@type']
  const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
  if (!isRecipe) return null
  const name = typeof obj.name === 'string' ? obj.name : ''
  if (!name) return null
  const ingredients = asStringList(obj.recipeIngredient ?? obj.ingredients)
  const instructions = obj.recipeInstructions
  let steps: string[] = []
  if (typeof instructions === 'string') steps = toLines(instructions, true)
  else if (Array.isArray(instructions)) {
    for (const step of instructions) {
      if (typeof step === 'string') steps.push(step)
      else if (step && typeof step === 'object') {
        const s = step as { text?: string; name?: string; itemListElement?: unknown }
        if (typeof s.text === 'string') steps.push(s.text)
        else if (typeof s.name === 'string') steps.push(s.name)
        else if (Array.isArray(s.itemListElement)) steps.push(...asStringList(s.itemListElement))
      }
    }
  }
  steps = toLines(steps.join('\n'), true)
  let servings: number | null = null
  const y = obj.recipeYield ?? obj.yield
  if (typeof y === 'number') servings = y
  else if (typeof y === 'string') {
    const n = Number(y.replace(/[^\d.]/g, ''))
    if (n > 0) servings = n
  }
  let host = ''
  try { if (pageUrl) host = new URL(pageUrl).hostname.replace(/^www\./, '') } catch { /* */ }
  return emptyDraft({
    title: name,
    ingredients,
    steps,
    notes: typeof obj.description === 'string' ? obj.description : '',
    prepMin: parseDuration(obj.prepTime),
    cookMin: parseDuration(obj.cookTime),
    servings,
    sourceUrl: pageUrl,
    sourceLabel: host || undefined,
  })
}

/** Walk a JSON-LD document (object or @graph) for the first Recipe. */
export function parseJsonLd(data: unknown, pageUrl?: string): DraftRecipe | null {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const hit = parseJsonLd(item, pageUrl)
      if (hit) return hit
    }
    return null
  }
  const obj = data as Record<string, unknown>
  const direct = recipeFromJsonLd(obj, pageUrl)
  if (direct) return direct
  if (Array.isArray(obj['@graph'])) return parseJsonLd(obj['@graph'], pageUrl)
  return null
}

/** Extract Recipe JSON-LD blocks from an HTML string. */
export function parseHtmlForRecipe(html: string, pageUrl?: string): DraftRecipe | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim())
      const hit = parseJsonLd(data, pageUrl)
      if (hit) return hit
    } catch { /* bad json-ld block */ }
  }
  return null
}

export type FetchResult =
  | { ok: true; draft: DraftRecipe }
  | { ok: false; reason: 'cors' | 'http' | 'no-recipe' | 'network'; message: string }

/**
 * Try to fetch a recipe URL. Most recipe / social sites block browser CORS from a static
 * GitHub Pages origin — callers should fall back to paste-text when this fails.
 */
export async function fetchRecipeFromUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<FetchResult> {
  let absolute = url.trim()
  if (!absolute) return { ok: false, reason: 'network', message: 'Enter a link first.' }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(absolute)) absolute = `https://${absolute}`
  let parsed: URL
  try { parsed = new URL(absolute) } catch { return { ok: false, reason: 'network', message: 'That doesn’t look like a valid link.' } }
  if (!/^https?:$/i.test(parsed.protocol)) return { ok: false, reason: 'network', message: 'Only http(s) links work.' }

  let res: Response
  try {
    res = await fetchImpl(parsed.href, { redirect: 'follow', credentials: 'omit' })
  } catch {
    return {
      ok: false,
      reason: 'cors',
      message: 'This site blocked the request (common for Xiaohongshu, TikTok, Instagram and many blogs). Paste the recipe text instead.',
    }
  }
  if (!res.ok) return { ok: false, reason: 'http', message: `The page returned ${res.status}. Try pasting the text instead.` }
  const html = await res.text()
  const draft = parseHtmlForRecipe(html, parsed.href)
  if (!draft) {
    return {
      ok: false,
      reason: 'no-recipe',
      message: 'No Recipe markup found on that page. Paste the ingredients and steps below.',
    }
  }
  return { ok: true, draft }
}
