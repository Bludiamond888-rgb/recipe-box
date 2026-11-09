import { describe, expect, it } from 'vitest'
import { parseBackup, makeBackup, type Recipe, type ShopItem } from './logic'
import { emptyCollection, groupByAisle, toggleInCollection, weekStart, addDays, setDayRecipes, recipesForWeek, aisleFor } from './organize'
import { parseRecipeText, parseJsonLd, parseHtmlForRecipe, draftToRecipe } from './importRecipe'
import { matchCommand } from './voice'

const recipe = (partial: Partial<Recipe> & { title: string; id: string }): Recipe => ({
  category: 'Dinner', tags: [], prepMin: null, cookMin: null, servings: 2,
  ingredients: ['1 cup flour'], steps: ['Mix'], notes: '', favorite: false, photoId: null,
  createdAt: 1, updatedAt: 1, ...partial,
})

describe('collections helpers', () => {
  it('adds and removes recipes', () => {
    let c = emptyCollection('Steak Night', 100)
    expect(c.name).toBe('Steak Night')
    c = toggleInCollection(c, 'r1', 200)
    expect(c.recipeIds).toEqual(['r1'])
    c = toggleInCollection(c, 'r1', 300)
    expect(c.recipeIds).toEqual([])
  })
})

describe('meal plan helpers', () => {
  it('assigns recipes to a day and lists the week', () => {
    const start = weekStart(new Date('2026-11-09T12:00:00')) // Monday
    expect(start).toBe('2026-11-09')
    let slots = setDayRecipes([], start, ['a', 'b'])
    slots = setDayRecipes(slots, addDays(start, 2), ['c'])
    const rs = [recipe({ id: 'a', title: 'A' }), recipe({ id: 'b', title: 'B' }), recipe({ id: 'c', title: 'C' }), recipe({ id: 'd', title: 'D' })]
    expect(recipesForWeek(slots, rs, start).map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('aisle grouping', () => {
  it('groups steak under meat and milk under dairy', () => {
    expect(aisleFor('2 ribeye steaks')).toBe('Meat & seafood')
    expect(aisleFor('1 cup milk')).toBe('Dairy & eggs')
    const items: ShopItem[] = [
      { id: '1', text: '2 ribeye steaks', checked: false, createdAt: 1 },
      { id: '2', text: '1 cup milk', checked: false, createdAt: 2 },
      { id: '3', text: 'widget', checked: false, createdAt: 3 },
    ]
    const g = groupByAisle(items)
    expect(g.map((x) => x.aisle)).toEqual(['Meat & seafood', 'Dairy & eggs', 'Other'])
  })
})

describe('paste import', () => {
  it('parses a caption with Ingredients and Steps headings', () => {
    const d = parseRecipeText(`Seared Steak Night

Ingredients
2 steaks
4 tbsp butter

Steps
1. Sear the steaks.
2. Baste with butter.`)
    expect(d.title).toBe('Seared Steak Night')
    expect(d.category).toBe('Dinner')
    expect(d.ingredients).toEqual(['2 steaks', '4 tbsp butter'])
    expect(d.steps).toEqual(['Sear the steaks.', 'Baste with butter.'])
    const r = draftToRecipe(d)
    expect(r.tags).toContain('imported')
  })
})

describe('json-ld import', () => {
  it('reads a Recipe from JSON-LD and HTML', () => {
    const obj = {
      '@type': 'Recipe',
      name: 'Test Soup',
      recipeIngredient: ['1 onion', '2 cups broth'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Simmer 20 minutes.' }],
      prepTime: 'PT10M',
      cookTime: 'PT20M',
      recipeYield: '4',
    }
    const d = parseJsonLd(obj, 'https://example.com/soup')!
    expect(d.title).toBe('Test Soup')
    expect(d.ingredients).toHaveLength(2)
    expect(d.steps[0]).toContain('Simmer')
    expect(d.prepMin).toBe(10)
    expect(d.cookMin).toBe(20)
    expect(d.servings).toBe(4)
    const html = `<html><script type="application/ld+json">${JSON.stringify(obj)}</script></html>`
    expect(parseHtmlForRecipe(html, 'https://example.com/soup')?.title).toBe('Test Soup')
  })
})

describe('voice commands', () => {
  it('matches next/back/repeat/timer', () => {
    expect(matchCommand('next step please')).toBe('next')
    expect(matchCommand('go back')).toBe('back')
    expect(matchCommand('repeat that')).toBe('repeat')
    expect(matchCommand('start the timer')).toBe('timer')
    expect(matchCommand('hello kitchen')).toBe(null)
  })
})

describe('backup v2 round-trip', () => {
  it('keeps collections, meal plan, rating and cook notes', async () => {
    const recipes = [recipe({ id: 'r1', title: 'Tacos', rating: 5, cookNote: 'Extra lime', lastCookedAt: 99 })]
    const shopping: ShopItem[] = [{ id: 's1', text: 'limes', checked: false, createdAt: 1 }]
    const cols = [emptyCollection('Weeknight', 1)]
    cols[0].recipeIds = ['r1']
    const plan = [{ date: '2026-11-10', recipeId: 'r1' }]
    const b = await makeBackup(recipes, shopping, new Map(), { collections: cols, mealPlan: plan })
    expect(b.version).toBe(2)
    const parsed = parseBackup(JSON.stringify(b))
    expect(parsed.recipes[0].rating).toBe(5)
    expect(parsed.recipes[0].cookNote).toBe('Extra lime')
    expect(parsed.collections[0].name).toBe('Weeknight')
    expect(parsed.mealPlan).toEqual(plan)
  })

  it('still restores a v1 backup without collections', () => {
    const v1 = {
      app: 'recipe-box', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
      recipes: [{ id: 'x', title: 'Old', category: 'Dinner', tags: [], prepMin: null, cookMin: null, servings: null, ingredients: [], steps: [], notes: '', favorite: true, photoId: null, createdAt: 1, updatedAt: 1 }],
      shopping: [], photos: {},
    }
    const parsed = parseBackup(JSON.stringify(v1))
    expect(parsed.recipes[0].favorite).toBe(true)
    expect(parsed.collections).toEqual([])
    expect(parsed.mealPlan).toEqual([])
  })
})
