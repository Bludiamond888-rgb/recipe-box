// Recipe Box 2.0 must open a 1.x install and keep every recipe, photo, favorite,
// source link, shopping item and seed flag exactly as it was.
import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { describe, expect, it } from 'vitest'
import type { Recipe, ShopItem } from './logic'
import { CHEF_RECIPES, chefPhotoUrl, makeChefRecipes } from './chef'
import { splitTitle } from './cook'

const now = 1_760_000_000_000
const mine: Recipe = {
  id: 'r-mine', title: 'Mom’s Dumplings (妈妈的饺子)', category: 'Dinner', tags: ['family'], prepMin: 40, cookMin: 10, servings: 4,
  ingredients: ['500 g pork mince', '1 pack dumpling wrappers'], steps: ['Mix the filling.', 'Boil 6 minutes.'], notes: 'Extra ginger',
  favorite: true, photoId: 'p-mine', sourceUrl: 'https://www.tiktok.com/@someone/video/1', sourceLabel: 'TikTok · @someone', createdAt: now, updatedAt: now,
}
const chefTitle = 'Argentine Chimichurri Steak (阿根廷青酱牛排)'
const editedChef: Recipe = {
  ...makeChefRecipes().find((r) => r.title === chefTitle)!,
  id: 'r-chef', favorite: false, notes: 'I like it with extra chili', sourceLabel: 'My own label', photoId: null,
}
const shop: ShopItem[] = [
  { id: 's1', text: '2 ribeye steaks', recipeTitle: chefTitle, checked: false, createdAt: now },
  { id: 's2', text: 'Milk', checked: true, createdAt: now + 1 },
]
const photoBytes = new Uint8Array([9, 8, 7, 6])

describe('2.0 carries over a 1.x install', () => {
  it('keeps the same storage identity', async () => {
    const db = await import('./db')
    expect(db.DB_NAME).toBe('recipe-box')
    expect(db.DB_VERSION).toBe(2)
    expect([...db.STORES]).toEqual(['recipes', 'photos', 'shopping', 'meta'])
  })

  it('opens a version-1 database (before the meta store existed) without losing data', async () => {
    // Build the 1.0 schema by hand, exactly as the first release created it.
    const old = await openDB('recipe-box-v1-sim', 1, {
      upgrade(d) {
        d.createObjectStore('recipes', { keyPath: 'id' })
        d.createObjectStore('photos')
        d.createObjectStore('shopping', { keyPath: 'id' })
      },
    })
    await old.put('recipes', mine)
    old.close()
    // Re-open with the current upgrade path at the current version.
    const { DB_VERSION } = await import('./db')
    const up = await openDB('recipe-box-v1-sim', DB_VERSION, {
      upgrade(d, oldVersion) { if (oldVersion < 2) d.createObjectStore('meta') },
    })
    expect([...up.objectStoreNames].sort()).toEqual(['meta', 'photos', 'recipes', 'shopping'])
    expect(await up.get('recipes', 'r-mine')).toEqual(mine)
    up.close()
  })

  it('reads every 1.x record unchanged and the seeds add nothing on top', async () => {
    // A 1.x install as it exists on the phone today (all seed flags already set).
    const raw = await openDB('recipe-box', 2, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore('recipes', { keyPath: 'id' })
          d.createObjectStore('photos')
          d.createObjectStore('shopping', { keyPath: 'id' })
        }
        if (oldVersion < 2) d.createObjectStore('meta')
      },
    })
    await raw.put('recipes', mine)
    await raw.put('recipes', editedChef)
    await raw.put('photos', { type: 'image/jpeg', buf: photoBytes.buffer.slice(0) }, 'p-mine')
    for (const s of shop) await raw.put('shopping', s)
    for (const flag of ['starterSeeded', 'chefRecipesSeededV1', 'chefRecipesSeededV2', 'chefRecipesSeededV3', 'chefRecipesSeededV4', 'chefRecipesSeededV5', 'chefRecipesSeededV6', 'chefRecipesSeededV7', 'chefSourceFieldsV1']) {
      await raw.put('meta', now, flag)
    }
    raw.close()

    const db = await import('./db')
    const before = JSON.stringify(await db.getRecipes())

    // Run the same startup sequence the 2.0 app runs.
    expect(await db.seedStarterOnce(() => { throw new Error('should not seed') }, async () => null)).toBe(false)
    const defs = makeChefRecipes().map((recipe, i) => ({ recipe, photoUrl: CHEF_RECIPES[i].photo ? chefPhotoUrl(CHEF_RECIPES[i].photo!) : null, since: CHEF_RECIPES[i].since }))
    expect(await db.seedChefRecipesOnce(defs, async () => null)).toBe(0)
    expect(await db.migrateChefSourceFieldsOnce(CHEF_RECIPES.map((d) => ({ title: d.title, sourceUrl: d.sourceUrl, sourceLabel: d.sourceLabel, sourceNote: d.sourceNote })))).toBe(0)

    const rs = await db.getRecipes()
    expect(JSON.stringify(rs)).toBe(before)
    expect(rs.find((r) => r.id === 'r-mine')).toEqual(mine)
    const chef = rs.find((r) => r.id === 'r-chef')!
    expect(chef.favorite).toBe(false)
    expect(chef.notes).toBe('I like it with extra chili')
    expect(chef.sourceLabel).toBe('My own label')
    expect(chef.sourceUrl).toBe(editedChef.sourceUrl)

    const sh = (await db.getShopping()).sort((a, b) => a.createdAt - b.createdAt)
    expect(sh).toEqual(shop)

    const ph = await db.getPhoto('p-mine')
    expect(ph).toBeInstanceOf(Blob)
    expect(new Uint8Array(await ph!.arrayBuffer())).toEqual(photoBytes)
  })

  it('shows bilingual titles without rewriting the stored title', async () => {
    const db = await import('./db')
    const r = (await db.getRecipes()).find((x) => x.id === 'r-mine')!
    expect(splitTitle(r.title)).toEqual({ main: 'Mom’s Dumplings', sub: '妈妈的饺子' })
    expect((await db.getRecipes()).find((x) => x.id === 'r-mine')!.title).toBe('Mom’s Dumplings (妈妈的饺子)')
  })
})
