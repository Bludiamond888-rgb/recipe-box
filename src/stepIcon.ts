// Auto-assign a simple step illustration from keywords in the step text.
// Keeps Recipe.steps as plain string[] — no schema change needed.

export const STEP_KINDS = [
  'blend',
  'sear',
  'fry',
  'boil',
  'simmer',
  'bake',
  'roast',
  'grill',
  'chop',
  'mix',
  'whisk',
  'stir',
  'toss',
  'marinate',
  'rest',
  'pour',
  'drain',
  'roll',
  'plate',
  'season',
  'heat',
  'cook',
] as const

export type StepKind = (typeof STEP_KINDS)[number]

/** Higher = preferred when several verbs appear in one step. */
const PRIORITY: Record<StepKind, number> = {
  sear: 100,
  fry: 100,
  grill: 100,
  boil: 95,
  bake: 95,
  roast: 95,
  blend: 95,
  simmer: 90,
  chop: 80,
  whisk: 80,
  toss: 78,
  mix: 70,
  stir: 70,
  roll: 75,
  plate: 72,
  marinate: 60,
  drain: 55,
  pour: 50,
  season: 40,
  rest: 35,
  heat: 30,
  cook: 10,
}

const RULES: { kind: StepKind; re: RegExp }[] = [
  { kind: 'blend', re: /\b(blend(?:ing|ed)?|puree|purée)\b/i },
  { kind: 'sear', re: /\b(sear|brown|browned|char|blister)\b/i },
  { kind: 'grill', re: /\b(grill|grilled)\b/i },
  { kind: 'fry', re: /\b(stir[- ]?fry|sauté|saute|pan[- ]?fry|deep[- ]?fry|fry)\b/i },
  { kind: 'bake', re: /\b(bake|baked|oven|preheat the oven|heat the oven)\b/i },
  { kind: 'roast', re: /\b(roast|roasted)\b/i },
  { kind: 'boil', re: /\b(boil|boiling|bring .+ to a boil|soft[- ]?boil)\b/i },
  { kind: 'simmer', re: /\b(simmer|reduce|reduces|bubble)\b/i },
  { kind: 'chop', re: /\b(chop|dice|mince|carve|halve|pat .+ dry)\b|\bslice\b/i },
  { kind: 'whisk', re: /\b(whisk)\b/i },
  { kind: 'mix', re: /\b(mix|combine|mash|emulsif)\b/i },
  { kind: 'toss', re: /\b(toss)\b/i },
  { kind: 'stir', re: /\b(stir|stirring)\b/i },
  { kind: 'marinate', re: /\b(marinat\w*|coat .+ with)\b/i },
  { kind: 'rest', re: /\b(rest|chill|freeze|soak|let it sit|drain well|cover finished)\b/i },
  { kind: 'roll', re: /\b(roll|fold|wrap|layer|build each|dip one rice)\b/i },
  { kind: 'drain', re: /\b(drain|rinse|strain)\b/i },
  { kind: 'pour', re: /\b(pour|drizzle|spoon|scoop|add the|return the|lay it)\b/i },
  { kind: 'plate', re: /\b(plate|serve|arrange|finish with|top with|spoon over)\b/i },
  { kind: 'season', re: /\b(season|taste|salt|pepper if|adjust)\b/i },
  { kind: 'heat', re: /\b(heat|warm|preheat|until (very )?hot|smoking)\b/i },
  { kind: 'cook', re: /\b(cook|soften|until)\b/i },
]

/** Pick an illustration kind from free-text step instructions. */
export function stepKind(text: string): StepKind {
  const t = text.trim()
  if (!t) return 'cook'
  let best: { kind: StepKind; score: number; index: number } | null = null
  for (const { kind, re } of RULES) {
    const m = re.exec(t)
    if (!m || m.index === undefined) continue
    const score = PRIORITY[kind]
    if (
      !best ||
      score > best.score ||
      (score === best.score && m.index < best.index)
    ) {
      best = { kind, score, index: m.index }
    }
  }
  return best?.kind ?? 'cook'
}

export const STEP_LABELS: Record<StepKind, string> = {
  blend: 'Blend',
  sear: 'Sear',
  fry: 'Fry',
  boil: 'Boil',
  simmer: 'Simmer',
  bake: 'Bake',
  roast: 'Roast',
  grill: 'Grill',
  chop: 'Chop',
  mix: 'Mix',
  whisk: 'Whisk',
  stir: 'Stir',
  toss: 'Toss',
  marinate: 'Marinate',
  rest: 'Rest',
  pour: 'Pour',
  drain: 'Drain',
  roll: 'Roll',
  plate: 'Serve',
  season: 'Season',
  heat: 'Heat',
  cook: 'Cook',
}
