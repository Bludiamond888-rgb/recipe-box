import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import * as db from './db'
import { uid, type Recipe } from './logic'
import { makeStarter } from './starter'
import { CHEF_RECIPES, chefPhotoUrl, makeChefRecipes } from './chef'
import { scaleIngredient } from './logic'

const photo = () => Promise.resolve(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }))
const sample = (title: string): Recipe => ({ ...makeStarter(), id: uid(), title, pinned: undefined, favorite: false, sample: true })

function chefDefs() {
  const recipes = makeChefRecipes()
  return CHEF_RECIPES.map((def, i) => ({
    recipe: recipes[i],
    photoUrl: def.photo ? chefPhotoUrl(def.photo) : null,
  }))
}

describe('starter recipe seeding', () => {
  it('seeds once, with photo, favorite + pinned, and quantities that scale', async () => {
    expect(await db.seedStarterOnce(makeStarter, photo)).toBe(true)
    expect(await db.seedStarterOnce(makeStarter, photo)).toBe(false)
    const rs = await db.getRecipes()
    expect(rs).toHaveLength(1)
    const s = rs[0]
    expect(s).toMatchObject({ title: 'Blueberry Pineapple Yogurt Smoothie', category: 'Breakfast', favorite: true, pinned: true, servings: 2, prepMin: 5, tags: ['smoothie', 'breakfast'] })
    expect(s.sample).toBeUndefined()
    expect(await db.getPhoto(s.photoId!)).toBeInstanceOf(Blob)
    const x2 = s.ingredients.map((l) => scaleIngredient(l, 2))
    expect(x2).toContain('2 to 4 tsp honey, to taste')
    expect(x2).toContain('1 banana, for creaminess (optional)')
    expect(x2).toContain('1½ cups milk, coconut water, or pineapple juice')
  })

  it('survives "Remove sample recipes"', async () => {
    await db.putRecipe(sample('Sample A'))
    await db.putRecipe(sample('Sample B'))
    expect(await db.deleteSampleRecipes()).toBe(2)
    expect((await db.getRecipes()).map((r) => r.title)).toEqual(['Blueberry Pineapple Yogurt Smoothie'])
  })

  it('does not come back after it is deleted or after "Erase all"', async () => {
    const [s] = await db.getRecipes()
    await db.deleteRecipe(s)
    expect(await db.seedStarterOnce(makeStarter, photo)).toBe(false)
    await db.replaceAll([], [], new Map())
    expect(await db.seedStarterOnce(makeStarter, photo)).toBe(false)
    expect(await db.getRecipes()).toHaveLength(0)
  })
})

describe('chef recipe seeding', () => {
  it('seeds all 9 once with photos, favorites, no sample flag', async () => {
    // Fresh DB (previous tests left meta flags; open a clean slate by deleting meta via replace + new flag check)
    // fake-indexeddb persists in-process; wipe recipes/photos but keep that starter flag is set — chef flag should still be unset from a brand-new key.
    // Use a dedicated wipe of everything including meta by reopening isn't available; clear via raw puts.
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    d.close()

    expect(await db.seedStarterOnce(makeStarter, photo)).toBe(true)
    const n = await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    expect(n).toBe(9)
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)

    const rs = await db.getRecipes()
    expect(rs).toHaveLength(10)
    const chef = rs.filter((r) => r.title !== 'Blueberry Pineapple Yogurt Smoothie')
    expect(chef).toHaveLength(9)
    for (const r of chef) {
      expect(r.sample).toBeUndefined()
      expect(r.favorite).toBe(true)
      expect(r.pinned).toBeFalsy()
      expect(r.photoId).toBeTruthy()
      expect(await db.getPhoto(r.photoId!)).toBeInstanceOf(Blob)
    }
    const titles = chef.map((r) => r.title).sort()
    expect(titles).toEqual([
      'Black Pepper Steak with Bell Peppers',
      'Garlic Spicy Noodles',
      'Jalapeño Steak',
      'Japanese Beef Bowl (Gyudon)',
      'Shrimp Fresh Spring Rolls (Gỏi Cuốn)',
      'Steak Tacos',
      'Steak, Cucumber & Tomato Salad',
      'Taiwanese Black Pepper Steak',
      'Thai Steak Salad (Yum Neua)',
    ].sort())
    const rolls = chef.find((r) => r.title.startsWith('Shrimp Fresh Spring Rolls'))!
    expect(rolls.category).toBe('Appetizer')
    expect(rolls.servings).toBe(4)
    expect(rolls.ingredients.some((l) => l.startsWith('Nuoc Cham:'))).toBe(true)
    expect(rolls.ingredients.some((l) => l.startsWith('Peanut sauce:'))).toBe(true)
    const tw = chef.find((r) => r.title === 'Taiwanese Black Pepper Steak')!
    expect(tw.steps.some((s) => s.includes('30 to 60 seconds'))).toBe(true)
  })

  it('skips titles that already exist and still sets the flag', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    d.close()

    // Pre-add one chef title as a user recipe
    await db.putRecipe({
      ...makeStarter(),
      id: uid(),
      title: 'Garlic Spicy Noodles',
      category: 'Dinner',
      favorite: false,
      pinned: false,
      photoId: null,
    })
    const n = await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    expect(n).toBe(8)
    const titles = (await db.getRecipes()).map((r) => r.title)
    expect(titles.filter((t) => t === 'Garlic Spicy Noodles')).toHaveLength(1)
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
  })

  it('survives Remove sample recipes alongside the starter', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    d.close()

    await db.seedStarterOnce(makeStarter, photo)
    await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    await db.putRecipe(sample('Sample A'))
    expect(await db.deleteSampleRecipes()).toBe(1)
    expect((await db.getRecipes()).length).toBe(10)
    expect((await db.getRecipes()).every((r) => !r.sample)).toBe(true)
  })

  it('does not re-seed after erase when flag remains', async () => {
    await db.replaceAll([], [], new Map())
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
    expect(await db.getRecipes()).toHaveLength(0)
  })
})
