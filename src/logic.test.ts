import { describe, expect, it } from 'vitest'
import {
  buildShoppingItems, formatQuantity, makeBackup, matchesRecipe, parseBackup, parseIngredient, parseQuantity,
  parseTags, scaleIngredient, searchRecipes, toLines, type Recipe,
} from './logic'

const r = (o: Partial<Recipe>): Recipe => ({
  id: o.title ?? 'x', title: 'X', category: 'Dinner', tags: [], prepMin: null, cookMin: null, servings: 4,
  ingredients: [], steps: [], notes: '', favorite: false, photoId: null, createdAt: 0, updatedAt: 0, ...o,
})

describe('fractions', () => {
  it('parses quantities', () => {
    expect(parseQuantity('2')).toBe(2)
    expect(parseQuantity('1.5')).toBe(1.5)
    expect(parseQuantity('1,5')).toBe(1.5)
    expect(parseQuantity('1/2')).toBe(0.5)
    expect(parseQuantity('1 1/2')).toBe(1.5)
    expect(parseQuantity('½')).toBe(0.5)
    expect(parseQuantity('1½')).toBe(1.5)
    expect(parseQuantity('2 ¾')).toBe(2.75)
    expect(parseQuantity('1/0')).toBeNull()
    expect(parseQuantity('abc')).toBeNull()
  })
  it('formats friendly fractions', () => {
    expect(formatQuantity(0.5)).toBe('½')
    expect(formatQuantity(1.5)).toBe('1½')
    expect(formatQuantity(1 / 3)).toBe('⅓')
    expect(formatQuantity(2 / 3)).toBe('⅔')
    expect(formatQuantity(0.25)).toBe('¼')
    expect(formatQuantity(0.125)).toBe('⅛')
    expect(formatQuantity(3)).toBe('3')
    expect(formatQuantity(2.999)).toBe('3')
    expect(formatQuantity(0.2)).toBe('0.2')
    expect(formatQuantity(2.4)).toBe('2.4')
  })
})

describe('scaler', () => {
  it('parses an ingredient line', () => {
    expect(parseIngredient('1 1/2 cups flour')).toMatchObject({ qty: 1.5, rest: 'cups flour' })
    expect(parseIngredient('Salt to taste')).toMatchObject({ qty: null, rest: 'Salt to taste' })
    expect(parseIngredient('2-3 cloves garlic')).toMatchObject({ qty: 2, qtyMax: 3, rest: 'cloves garlic' })
  })
  it('scales quantities and fractions', () => {
    expect(scaleIngredient('1/2 cup sugar', 2)).toBe('1 cup sugar')
    expect(scaleIngredient('1 1/2 cups flour', 2)).toBe('3 cups flour')
    expect(scaleIngredient('1 cup milk', 0.5)).toBe('½ cup milk')
    expect(scaleIngredient('3/4 tsp salt', 1 / 3)).toBe('¼ tsp salt')
    expect(scaleIngredient('2 eggs', 1.5)).toBe('3 eggs')
    expect(scaleIngredient('1 egg', 0.5)).toBe('½ egg')
    expect(scaleIngredient('2-3 cloves garlic', 2)).toBe('4–6 cloves garlic')
    expect(scaleIngredient('200g butter', 1.5)).toBe('300g butter')
    expect(scaleIngredient('2 (14 oz) cans tomatoes', 2)).toBe('4 (14 oz) cans tomatoes')
    expect(scaleIngredient('Salt to taste', 3)).toBe('Salt to taste')
    expect(scaleIngredient('½ lemon', 3)).toBe('1½ lemon')
  })
  it('cleans multi-line input', () => {
    expect(toLines('- 1 cup flour\n\n• 2 eggs\n')).toEqual(['1 cup flour', '2 eggs'])
    expect(toLines('1. Mix\n2) Bake\nStep 3: Eat', true)).toEqual(['Mix', 'Bake', 'Eat'])
    expect(parseTags('Quick, vegetarian, quick ,#Kids')).toEqual(['quick', 'vegetarian', 'kids'])
  })
})

describe('search', () => {
  const list = [
    r({ title: 'Tomato Pasta', category: 'Dinner', tags: ['quick'], ingredients: ['1 lb spaghetti', '1 can tomatoes'], favorite: true }),
    r({ title: 'Pancakes', category: 'Breakfast', tags: ['weekend'], ingredients: ['2 cups flour', '2 eggs'] }),
    r({ title: 'Crème Brûlée', category: 'Dessert', ingredients: ['4 egg yolks'] }),
  ]
  it('matches by name, ingredient, tag (case/accents ignored)', () => {
    expect(searchRecipes(list, { query: 'pasta', category: null }).map((x) => x.title)).toEqual(['Tomato Pasta'])
    expect(searchRecipes(list, { query: 'EGG', category: null }).map((x) => x.title)).toEqual(['Crème Brûlée', 'Pancakes'])
    expect(searchRecipes(list, { query: 'weekend', category: null }).map((x) => x.title)).toEqual(['Pancakes'])
    expect(searchRecipes(list, { query: 'creme', category: null }).map((x) => x.title)).toEqual(['Crème Brûlée'])
    expect(matchesRecipe(list[0], { query: 'spaghetti quick', category: null })).toBe(true)
    expect(matchesRecipe(list[0], { query: 'spaghetti eggs', category: null })).toBe(false)
  })
  it('filters by category and favorites', () => {
    expect(searchRecipes(list, { query: '', category: 'Breakfast' }).map((x) => x.title)).toEqual(['Pancakes'])
    expect(searchRecipes(list, { query: '', category: null, favoritesOnly: true }).map((x) => x.title)).toEqual(['Tomato Pasta'])
    expect(searchRecipes(list, { query: '', category: null })).toHaveLength(3)
  })
  it('ranks title hits first', () => {
    const l2 = [r({ title: 'Apple Pie', ingredients: ['1 tomato'] }), r({ title: 'Tomato Soup' })]
    expect(searchRecipes(l2, { query: 'tomato', category: null })[0].title).toBe('Tomato Soup')
  })
})

describe('shopping list', () => {
  it('merges matching ingredients and scales', () => {
    const a = r({ title: 'A', ingredients: ['1/2 cup sugar', '2 eggs', 'Salt'] })
    const b = r({ title: 'B', ingredients: ['1 cup sugar', '1 egg', 'salt'] })
    const items = buildShoppingItems([{ recipe: a, factor: 2 }, { recipe: b }])
    expect(items.map((i) => i.text)).toEqual(['2 cups sugar'.replace('cups', 'cup'), '4 eggs', 'Salt', '1 egg'])
    expect(items[0].recipeTitle).toBe('A, B')
  })
})

describe('backup', () => {
  it('round-trips recipes, shopping and photos', async () => {
    const photo = new Blob([new Uint8Array([255, 216, 255, 0, 1, 2, 3, 250])], { type: 'image/jpeg' })
    const recipes = [r({ title: 'With photo', photoId: 'p1', tags: ['a'], favorite: true }), r({ title: 'No photo' })]
    const shopping = [{ id: 's1', text: '2 eggs', checked: true, createdAt: 5 }]
    const b = await makeBackup(recipes, shopping, new Map([['p1', photo]]), new Date('2026-10-23T12:00:00Z'))
    expect(b.photos.p1).toMatch(/^data:image\/jpeg;base64,/)
    const back = parseBackup(JSON.stringify(b))
    expect(back.recipes).toHaveLength(2)
    expect(back.recipes[0]).toMatchObject({ title: 'With photo', photoId: 'p1', favorite: true, tags: ['a'] })
    expect(back.shopping[0]).toMatchObject({ text: '2 eggs', checked: true })
    const p = back.photos.get('p1')!
    expect(p.type).toBe('image/jpeg')
    expect([...new Uint8Array(await p.arrayBuffer())]).toEqual([255, 216, 255, 0, 1, 2, 3, 250])
  })
  it('rejects foreign files and drops dangling photo refs', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/)
    expect(() => parseBackup('{"app":"other","recipes":[]}')).toThrow(/Recipe Box/)
    const back = parseBackup(JSON.stringify({ app: 'recipe-box', version: 1, recipes: [{ title: 'T', photoId: 'gone', servings: -1 }], photos: {} }))
    expect(back.recipes[0]).toMatchObject({ title: 'T', photoId: null, servings: null, ingredients: [] })
  })
})
