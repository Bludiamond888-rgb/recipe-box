// IndexedDB storage (on-device). Recipes, photos (JPEG Blobs) and the shopping list.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Recipe, ShopItem } from './logic'

interface Schema extends DBSchema {
  recipes: { key: string; value: Recipe }
  // Stored as ArrayBuffer (+ mime type) rather than Blob: WebKit can reject Blobs in IndexedDB.
  photos: { key: string; value: StoredPhoto }
  shopping: { key: string; value: ShopItem }
}

interface StoredPhoto { type: string; buf: ArrayBuffer }
const toStored = async (b: Blob): Promise<StoredPhoto> => ({ type: b.type || 'image/jpeg', buf: await b.arrayBuffer() })
const fromStored = (p: StoredPhoto) => new Blob([p.buf], { type: p.type })

let dbp: Promise<IDBPDatabase<Schema>> | null = null
const db = () =>
  (dbp ??= openDB<Schema>('recipe-box', 1, {
    upgrade(d) {
      d.createObjectStore('recipes', { keyPath: 'id' })
      d.createObjectStore('photos')
      d.createObjectStore('shopping', { keyPath: 'id' })
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
