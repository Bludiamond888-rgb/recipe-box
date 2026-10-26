// IndexedDB storage (on-device). Recipes, photos (JPEG Blobs) and the shopping list.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { uid, type Recipe, type ShopItem } from './logic'

interface Schema extends DBSchema {
  recipes: { key: string; value: Recipe }
  // Stored as ArrayBuffer (+ mime type) rather than Blob: WebKit can reject Blobs in IndexedDB.
  photos: { key: string; value: StoredPhoto }
  shopping: { key: string; value: ShopItem }
  meta: { key: string; value: unknown }
}

interface StoredPhoto { type: string; buf: ArrayBuffer }
const toStored = async (b: Blob): Promise<StoredPhoto> => ({ type: b.type || 'image/jpeg', buf: await b.arrayBuffer() })
const fromStored = (p: StoredPhoto) => new Blob([p.buf], { type: p.type })

let dbp: Promise<IDBPDatabase<Schema>> | null = null
const db = () =>
  (dbp ??= openDB<Schema>('recipe-box', 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('recipes', { keyPath: 'id' })
        d.createObjectStore('photos')
        d.createObjectStore('shopping', { keyPath: 'id' })
      }
      if (oldVersion < 2) d.createObjectStore('meta')
    },
  }))

export const getRecipes = async () => (await db()).getAll('recipes')
export const putRecipe = async (r: Recipe) => { await (await db()).put('recipes', r) }
export async function deleteRecipe(r: Recipe) {
  const d = await db()
  const tx = d.transaction(['recipes', 'photos'], 'readwrite')
  await tx.objectStore('recipes').delete(r.id)
  if (r.photoId) await tx.objectStore('photos').delete(r.photoId)
  await tx.done
}

export async function getPhoto(id: string) { const p = await (await db()).get('photos', id); return p ? fromStored(p) : undefined }
export async function putPhoto(id: string, b: Blob) { const v = await toStored(b); await (await db()).put('photos', v, id) }
export const deletePhoto = async (id: string) => { await (await db()).delete('photos', id) }
export async function getAllPhotos(): Promise<Map<string, Blob>> {
  const d = await db()
  const [keys, vals] = await Promise.all([d.getAllKeys('photos'), d.getAll('photos')])
  return new Map(keys.map((k, i) => [k, fromStored(vals[i])]))
}

export const getShopping = async () => (await db()).getAll('shopping')
export async function setShopping(items: ShopItem[]) {
  const d = await db()
  const tx = d.transaction('shopping', 'readwrite')
  await tx.store.clear()
  for (const i of items) await tx.store.put(i)
  await tx.done
}

/** Replace everything (used by restore and erase). */
export async function replaceAll(recipes: Recipe[], shopping: ShopItem[], photos: Map<string, Blob>) {
  // Convert blobs before opening the transaction (awaiting non-IDB work would auto-commit it).
  const stored = await Promise.all([...photos].map(async ([k, v]) => [k, await toStored(v)] as const))
  const d = await db()
  const tx = d.transaction(['recipes', 'photos', 'shopping'], 'readwrite')
  await Promise.all([tx.objectStore('recipes').clear(), tx.objectStore('photos').clear(), tx.objectStore('shopping').clear()])
  for (const r of recipes) await tx.objectStore('recipes').put(r)
  for (const [k, v] of stored) await tx.objectStore('photos').put(v, k)
  for (const i of shopping) await tx.objectStore('shopping').put(i)
  await tx.done
}

/** Delete only recipes flagged as sample data (the starter recipe and the user's own recipes stay). */
export async function deleteSampleRecipes() {
  const d = await db()
  const samples = (await d.getAll('recipes')).filter((r) => r.sample)
  const tx = d.transaction(['recipes', 'photos'], 'readwrite')
  for (const r of samples) {
    await tx.objectStore('recipes').delete(r.id)
    if (r.photoId) await tx.objectStore('photos').delete(r.photoId)
  }
  await tx.done
  return samples.length
}

const SEED_FLAG = 'starterSeeded'

/**
 * Seed the starter recipe exactly once per install. The flag lives in the meta store, which
 * "Erase all" and restore leave alone, so a deleted starter never comes back.
 */
export async function seedStarterOnce(make: () => Recipe, loadPhoto: () => Promise<Blob | null>): Promise<boolean> {
  const d = await db()
  if (await d.get('meta', SEED_FLAG)) return false
  let photo: Blob | null = null
  try { photo = await loadPhoto() } catch { /* offline: seed without photo */ }
  const stored = photo ? await toStored(photo) : null
  const tx = d.transaction(['recipes', 'photos', 'meta'], 'readwrite')
  if (await tx.objectStore('meta').get(SEED_FLAG)) { await tx.done; return false }
  const r = make()
  if (stored) {
    r.photoId = uid()
    await tx.objectStore('photos').put(stored, r.photoId)
  }
  await tx.objectStore('recipes').put(r)
  await tx.objectStore('meta').put(Date.now(), SEED_FLAG)
  await tx.done
  return true
}

const CHEF_SEED_FLAG = 'chefRecipesSeededV1'

/**
 * Seed Chef recipes once per install. Skips any title that already exists.
 * Flag is independent of starterSeeded so existing smoothie installs still get these.
 * Recipes are NOT sample:true, so "Remove sample recipes" keeps them.
 */
export async function seedChefRecipesOnce(
  defs: Array<{ recipe: Recipe; photoUrl: string | null }>,
  loadPhoto: (url: string) => Promise<Blob | null>,
): Promise<number> {
  const d = await db()
  if (await d.get('meta', CHEF_SEED_FLAG)) return 0

  const existing = await d.getAll('recipes')
  const titles = new Set(existing.map((r) => r.title.trim().toLowerCase()))
  const toAdd = defs.filter((x) => !titles.has(x.recipe.title.trim().toLowerCase()))

  // Preload photos outside the transaction
  const withPhotos: Array<{ recipe: Recipe; stored: Awaited<ReturnType<typeof toStored>> | null }> = []
  for (const item of toAdd) {
    let stored: Awaited<ReturnType<typeof toStored>> | null = null
    if (item.photoUrl) {
      try {
        const blob = await loadPhoto(item.photoUrl)
        if (blob) stored = await toStored(blob)
      } catch { /* offline: seed without photo */ }
    }
    withPhotos.push({ recipe: { ...item.recipe }, stored })
  }

  const tx = d.transaction(['recipes', 'photos', 'meta'], 'readwrite')
  if (await tx.objectStore('meta').get(CHEF_SEED_FLAG)) { await tx.done; return 0 }
  // Re-check titles inside the tx in case of races
  const live = await tx.objectStore('recipes').getAll()
  const liveTitles = new Set(live.map((r) => r.title.trim().toLowerCase()))
  let added = 0
  for (const { recipe, stored } of withPhotos) {
    if (liveTitles.has(recipe.title.trim().toLowerCase())) continue
    if (stored) {
      recipe.photoId = uid()
      await tx.objectStore('photos').put(stored, recipe.photoId)
    }
    await tx.objectStore('recipes').put(recipe)
    liveTitles.add(recipe.title.trim().toLowerCase())
    added++
  }
  await tx.objectStore('meta').put(Date.now(), CHEF_SEED_FLAG)
  await tx.done
  return added
}
