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
        since: def.since,
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
  it('seeds all 18 once with photos, favorites, no sample flag', async () => {
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
    expect(n).toBe(18)
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)

    const rs = await db.getRecipes()
    expect(rs).toHaveLength(19)
    const chef = rs.filter((r) => r.title !== 'Blueberry Pineapple Yogurt Smoothie')
    expect(chef).toHaveLength(18)
    for (const r of chef) {
      expect(r.sample).toBeUndefined()
      expect(r.favorite).toBe(true)
      expect(r.pinned).toBeFalsy()
      expect(r.photoId).toBeTruthy()
      expect(await db.getPhoto(r.photoId!)).toBeInstanceOf(Blob)
    }
    const titles = chef.map((r) => r.title).sort()
    expect(titles).toEqual([
      'Argentine Chimichurri Steak (阿根廷青酱牛排)',
      'Beef & Potato Salsa Bowl (土豆牛肉莎莎碗)',
      'Black Pepper Steak with Bell Peppers',
      'Chimichurri Steak Cucumber Salad',
      'Garlic Spicy Noodles',
      'Jalapeño Steak',
      'Japanese Beef Bowl (Gyudon)',
      'Milk Skin Yogurt (奶皮子酸奶)',
      'One-Pot Spanish Seafood Paella (西班牙海鲜饭)',
      'Peruvian Roast Chicken Legs with Green Sauce (秘鲁烤鸡腿 / Pollo a la Brasa)',
      'Roasted Garlic Herb Butter (蒜香黄油酱)',
      'Shrimp Fresh Spring Rolls (Gỏi Cuốn)',
      'Steak Frites with Black Pepper Mushroom Sauce',
      'Steak Tacos',
      'Steak, Cucumber & Tomato Salad',
      'Taiwanese Black Pepper Steak',
      'Thai Steak Salad (Yum Neua)',
      'Vietnamese Shrimp & Chicken Spring Rolls with Peanut Sauce',
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
    expect(n).toBe(17)
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
    expect((await db.getRecipes()).length).toBe(19)
    expect((await db.getRecipes()).every((r) => !r.sample)).toBe(true)
  })

  it('does not re-seed after erase when flag remains', async () => {
    await db.replaceAll([], [], new Map())
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
    expect(await db.getRecipes()).toHaveLength(0)
  })

  it('V1 installs get only new (since>=2) recipes, no dupes, edits untouched', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    await d.put('meta', Date.now(), 'chefRecipesSeededV1')
    d.close()
    // user kept one V1 recipe with edits, deleted the rest
    const edited = { ...makeChefRecipes()[0], notes: 'my edits' }
    await db.putRecipe(edited)
    const n = await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    expect(n).toBe(9)
    const rs = await db.getRecipes()
    expect(rs).toHaveLength(10)
    expect(rs.find((r) => r.id === edited.id)!.notes).toBe('my edits')
    const nr = rs.find((r) => r.title.startsWith('Vietnamese Shrimp & Chicken'))!
    expect(nr.sample).toBeUndefined()
    expect(nr.photoId).toBeTruthy()
    expect(rs.some((r) => r.title.startsWith('Milk Skin Yogurt'))).toBe(true)
    expect(rs.some((r) => r.title === 'Steak Frites with Black Pepper Mushroom Sauce')).toBe(true)
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
  })

  it('V2 installs get only new (since>=3) recipes, no dupes, edits untouched', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    await d.put('meta', Date.now(), 'chefRecipesSeededV1')
    await d.put('meta', Date.now(), 'chefRecipesSeededV2')
    d.close()
    const edited = { ...makeChefRecipes()[0], notes: 'my edits' }
    await db.putRecipe(edited)
    const n = await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    expect(n).toBe(8)
    const rs = await db.getRecipes()
    expect(rs).toHaveLength(9)
    expect(rs.find((r) => r.id === edited.id)!.notes).toBe('my edits')
    expect(rs.some((r) => r.title.startsWith('Vietnamese Shrimp & Chicken'))).toBe(false)
    const titles = rs.map((r) => r.title).filter((t) => t !== edited.title).sort()
    expect(titles).toEqual([
      'Argentine Chimichurri Steak (阿根廷青酱牛排)',
      'Beef & Potato Salsa Bowl (土豆牛肉莎莎碗)',
      'Chimichurri Steak Cucumber Salad',
      'Milk Skin Yogurt (奶皮子酸奶)',
      'One-Pot Spanish Seafood Paella (西班牙海鲜饭)',
      'Peruvian Roast Chicken Legs with Green Sauce (秘鲁烤鸡腿 / Pollo a la Brasa)',
      'Roasted Garlic Herb Butter (蒜香黄油酱)',
      'Steak Frites with Black Pepper Mushroom Sauce',
    ].sort())
    for (const title of titles) {
      const r = rs.find((x) => x.title === title)!
      expect(r.sample).toBeUndefined()
      expect(r.photoId).toBeTruthy()
    }
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
  })

  it('V3 installs get only new (since>=4) recipes', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    await d.put('meta', Date.now(), 'chefRecipesSeededV1')
    await d.put('meta', Date.now(), 'chefRecipesSeededV2')
    await d.put('meta', Date.now(), 'chefRecipesSeededV3')
    d.close()
    const n = await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    expect(n).toBe(4)
    const titles = (await db.getRecipes()).map((r) => r.title).sort()
    expect(titles).toEqual([
      'Argentine Chimichurri Steak (阿根廷青酱牛排)',
      'One-Pot Spanish Seafood Paella (西班牙海鲜饭)',
      'Peruvian Roast Chicken Legs with Green Sauce (秘鲁烤鸡腿 / Pollo a la Brasa)',
      'Roasted Garlic Herb Butter (蒜香黄油酱)',
    ].sort())
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
  })

  it('V4 installs get only new (since>=5) recipes', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    await d.put('meta', Date.now(), 'chefRecipesSeededV1')
    await d.put('meta', Date.now(), 'chefRecipesSeededV2')
    await d.put('meta', Date.now(), 'chefRecipesSeededV3')
    await d.put('meta', Date.now(), 'chefRecipesSeededV4')
    d.close()
    const n = await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    expect(n).toBe(2)
    const titles = (await db.getRecipes()).map((r) => r.title).sort()
    expect(titles).toEqual([
      'Argentine Chimichurri Steak (阿根廷青酱牛排)',
      'Roasted Garlic Herb Butter (蒜香黄油酱)',
    ].sort())
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
  })

  it('V5 installs get only new (since>=6) recipes', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    for (const k of ['chefRecipesSeededV1','chefRecipesSeededV2','chefRecipesSeededV3','chefRecipesSeededV4','chefRecipesSeededV5']) {
      await d.put('meta', Date.now(), k)
    }
    d.close()
    const n = await db.seedChefRecipesOnce(chefDefs(), async () => photo())
    expect(n).toBe(1)
    const r = (await db.getRecipes())[0]
    expect(r.title).toMatch(/^Roasted Garlic Herb Butter/)
    expect(r.category).toBe('Sauce')
    expect(r.sourceUrl).toContain('6886a6a1')
    expect(await db.seedChefRecipesOnce(chefDefs(), async () => photo())).toBe(0)
  })

  it('migrates source fields onto existing Chef recipes without overwriting edits', async () => {
    const d = await (await import('idb')).openDB('recipe-box', 2)
    await d.clear('recipes')
    await d.clear('photos')
    await d.clear('meta')
    d.close()
    const recipes = makeChefRecipes()
    // simulate pre-source install: strip source fields
    for (const r of recipes) {
      const { sourceUrl: _a, sourceLabel: _b, sourceNote: _c, ...rest } = r as typeof r & { sourceUrl?: string; sourceLabel?: string; sourceNote?: string }
      await db.putRecipe(rest as typeof r)
    }
    // user edited one source already
    const chim = (await db.getRecipes()).find((r) => r.title.startsWith('Chimichurri'))!
    await db.putRecipe({ ...chim, sourceUrl: 'https://example.com/mine', sourceLabel: 'My link' })

    const defs = CHEF_RECIPES.map((def) => ({
      title: def.title,
      sourceUrl: def.sourceUrl,
      sourceLabel: def.sourceLabel,
      sourceNote: def.sourceNote,
    }))
    const n = await db.migrateChefSourceFieldsOnce(defs)
    expect(n).toBeGreaterThan(0)
    expect(await db.migrateChefSourceFieldsOnce(defs)).toBe(0)

    const rs = await db.getRecipes()
    const kept = rs.find((r) => r.title.startsWith('Chimichurri'))!
    expect(kept.sourceUrl).toBe('https://example.com/mine')
    expect(kept.sourceLabel).toBe('My link')
    const milk = rs.find((r) => r.title.startsWith('Milk Skin Yogurt'))!
    expect(milk.sourceUrl).toContain('xiachufang.com')
    expect(milk.sourceLabel).toBe('Xiachufang')
    expect(milk.sourceNote).toContain('Photo source')
    const steak = rs.find((r) => r.title.startsWith('Black Pepper Steak'))!
    expect(steak.sourceNote).toBe('Created by Chef')
    expect(steak.sourceUrl).toBeUndefined()
    const peru = rs.find((r) => r.title.startsWith('Peruvian'))!
    expect(peru.sourceUrl).toContain('6ad48920')
    expect(peru.sourceLabel).toContain('爱料理的K先生')
  })
})
