import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import * as db from './db'
import { uid, type Recipe } from './logic'
import { makeStarter } from './starter'
import { scaleIngredient } from './logic'

const photo = () => Promise.resolve(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }))
const sample = (title: string): Recipe => ({ ...makeStarter(), id: uid(), title, pinned: undefined, favorite: false, sample: true })

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
