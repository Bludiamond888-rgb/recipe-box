import { describe, expect, it } from 'vitest'
import { STEP_KINDS, stepKind } from './stepIcon'

describe('stepKind', () => {
  it('maps common cooking verbs to illustration kinds', () => {
    expect(stepKind('Sear the steak in a hot skillet.')).toBe('sear')
    expect(stepKind('Boil the shrimp until pink.')).toBe('boil')
    expect(stepKind('Simmer 3 to 5 minutes until the sauce thickens.')).toBe('simmer')
    expect(stepKind('Heat the oven to 425°F.')).toBe('bake')
    expect(stepKind('Roast about 75 minutes.')).toBe('roast')
    expect(stepKind('Stir-fry the onion and bell peppers.')).toBe('fry')
    expect(stepKind('Whisk the dressing until smooth.')).toBe('whisk')
    expect(stepKind('Mix the dry ingredients.')).toBe('mix')
    expect(stepKind('Toss the greens with dressing.')).toBe('toss')
    expect(stepKind('Stir until combined.')).toBe('stir')
    expect(stepKind('Chop the onion finely.')).toBe('chop')
    expect(stepKind('Slice the steak against the grain.')).toBe('chop')
    expect(stepKind('Blend on high until smooth.')).toBe('blend')
    expect(stepKind('Pour the sauce over the pasta.')).toBe('pour')
    expect(stepKind('Drain the noodles well.')).toBe('drain')
    expect(stepKind('Roll tightly toward the shrimp.')).toBe('roll')
    expect(stepKind('Serve warm with butter.')).toBe('plate')
    expect(stepKind('Plate it and finish with peanuts.')).toBe('plate')
    expect(stepKind('Season with salt and pepper.')).toBe('season')
    expect(stepKind('Taste and adjust salt.')).toBe('season')
    expect(stepKind('Heat the oil over high until smoking.')).toBe('heat')
    expect(stepKind('Grill over high until very hot.')).toBe('grill')
    expect(stepKind('Rest 10 minutes before carving.')).toBe('rest')
    expect(stepKind('Marinate 20 to 30 minutes.')).toBe('marinate')
  })

  it('prefers more specific actions when several verbs appear', () => {
    expect(stepKind('Heat oil until smoking hot. Sear the steak.')).toBe('sear')
    expect(stepKind('Bring water to a boil and cook the spaghetti.')).toBe('boil')
    expect(stepKind('Serve topped with parmesan.')).toBe('plate')
  })

  it('falls back to cook for empty or unknown steps', () => {
    expect(stepKind('')).toBe('cook')
    expect(stepKind('   ')).toBe('cook')
    expect(stepKind('Do the thing carefully.')).toBe('cook')
  })


  it('picks the main action in multi-verb chef steps', () => {
    expect(stepKind('Toss the sliced steak with the marinade and let it sit 10 minutes while you prep the veggies and mix the sauce.')).toBe('toss')
    expect(stepKind('Heat 1 tbsp oil until smoking hot. Sear the steak until browned.')).toBe('sear')
    expect(stepKind('Stir-fry the onion and bell peppers until crisp-tender.')).toBe('fry')
    expect(stepKind('Return the steak. Pour in the sauce and toss until it thickens.')).toBe('toss')
    expect(stepKind('Taste and add more pepper. Finish with green onions and serve over rice.')).toBe('plate')
  })

  it('exports a stable kind list', () => {
    expect(STEP_KINDS).toContain('sear')
    expect(STEP_KINDS).toContain('plate')
    expect(new Set(STEP_KINDS).size).toBe(STEP_KINDS.length)
  })
})
