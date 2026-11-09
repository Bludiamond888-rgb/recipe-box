// Collections, meal plan, aisle grouping — pure helpers for Phases 2–3.
import { parseIngredient, uid } from './logic'
import type { Collection, MealSlot, Recipe, ShopItem } from './logic'

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function emptyCollection(name: string, now = Date.now()): Collection {
  return { id: uid(), name: name.trim(), recipeIds: [], createdAt: now, updatedAt: now }
}

export function renameCollection(c: Collection, name: string, now = Date.now()): Collection {
  return { ...c, name: name.trim(), updatedAt: now }
}

export function toggleInCollection(c: Collection, recipeId: string, now = Date.now()): Collection {
  const has = c.recipeIds.includes(recipeId)
  return {
    ...c,
    recipeIds: has ? c.recipeIds.filter((id) => id !== recipeId) : [...c.recipeIds, recipeId],
    updatedAt: now,
  }
}

export function removeRecipeFromAllCollections(cols: Collection[], recipeId: string, now = Date.now()): Collection[] {
  return cols.map((c) => (c.recipeIds.includes(recipeId)
    ? { ...c, recipeIds: c.recipeIds.filter((id) => id !== recipeId), updatedAt: now }
    : c))
}

/** Monday (local) of the week containing `d`, as YYYY-MM-DD. */
export function weekStart(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (x.getDay() + 6) % 7 // Mon=0
  x.setDate(x.getDate() - day)
  return ymd(x)
}

export function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(ymdStr: string, n: number): string {
  const [y, m, d] = ymdStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return ymd(dt)
}

export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function weekDays(start = weekStart()): { date: string; label: string; short: string }[] {
  return DOW.map((label, i) => {
    const date = addDays(start, i)
    const [, , d] = date.split('-')
    return { date, label, short: `${label} ${Number(d)}` }
  })
}

export function slotsForDate(slots: MealSlot[], date: string): MealSlot[] {
  return slots.filter((s) => s.date === date)
}

export function setDayRecipes(slots: MealSlot[], date: string, recipeIds: string[]): MealSlot[] {
  const rest = slots.filter((s) => s.date !== date)
  return [...rest, ...recipeIds.map((recipeId) => ({ date, recipeId }))]
}

export function toggleDayRecipe(slots: MealSlot[], date: string, recipeId: string): MealSlot[] {
  const has = slots.some((s) => s.date === date && s.recipeId === recipeId)
  if (has) return slots.filter((s) => !(s.date === date && s.recipeId === recipeId))
  return [...slots, { date, recipeId }]
}

export function recipesForWeek(slots: MealSlot[], recipes: Recipe[], start = weekStart()): Recipe[] {
  const ids = new Set(slots.filter((s) => s.date >= start && s.date <= addDays(start, 6)).map((s) => s.recipeId))
  return recipes.filter((r) => ids.has(r.id))
}

/* ---------------- aisle grouping for shopping ---------------- */

const AISLES: [string, RegExp][] = [
  ['Produce', /\b(lettuce|tomato|onion|garlic|ginger|pepper|cucumber|avocado|lemon|lime|lime juice|herb|cilantro|parsley|basil|spinach|potato|carrot|celery|scallion|green onion|shallot|mushroom|cabbage|broccoli|fruit|berry|apple|banana|pineapple|orange|zucchini|corn|bean sprout|chive)\b/i],
  ['Meat & seafood', /\b(steaks?|beef|pork|chicken|turkey|lamb|bacon|sausage|shrimp|prawn|fish|salmon|tuna|ribeye|sirloin|ground|mince|wing|thigh|breast)\b/i],
  ['Dairy & eggs', /\b(milk|cream|butter|cheese|yogurt|yoghurt|egg|parmesan|mozzarella|cheddar|sour cream)\b/i],
  ['Bakery', /\b(bread|bun|roll|tortilla|wrap|bagel|baguette|pita|dumpling wrapper|wonton)\b/i],
  ['Pantry', /\b(flour|sugar|salt|pepper|oil|vinegar|soy|sauce|rice|pasta|noodle|spice|cumin|paprika|oregano|thyme|honey|stock|broth|can|tomato paste|ketchup|mayo|mustard|wine|beer|broth|miso|sesame|chili|gochujang|fish sauce)\b/i],
  ['Frozen', /\b(frozen|ice cream)\b/i],
]

export function aisleFor(text: string): string {
  const rest = parseIngredient(text).rest || text
  for (const [name, re] of AISLES) if (re.test(rest)) return name
  return 'Other'
}

export function groupByAisle(items: ShopItem[]): { aisle: string; items: ShopItem[] }[] {
  const order = [...AISLES.map(([n]) => n), 'Other']
  const map = new Map<string, ShopItem[]>()
  for (const i of items) {
    const a = aisleFor(i.text)
    if (!map.has(a)) map.set(a, [])
    map.get(a)!.push(i)
  }
  return order.filter((a) => map.has(a)).map((a) => ({ aisle: a, items: map.get(a)! }))
}

export function starsLabel(n: number | null | undefined): string {
  if (!n || n < 1) return 'Not rated'
  return `${n} star${n === 1 ? '' : 's'}`
}

/** Filter recipes belonging to a collection (missing ids are ignored). */
export function recipesInCollection(recipes: Recipe[], c: Collection | null): Recipe[] {
  if (!c) return recipes
  const set = new Set(c.recipeIds)
  return recipes.filter((r) => set.has(r.id))
}

export function collectionCount(c: Collection, recipes: Recipe[]): number {
  const set = new Set(recipes.map((r) => r.id))
  return c.recipeIds.filter((id) => set.has(id)).length
}

export { norm }
