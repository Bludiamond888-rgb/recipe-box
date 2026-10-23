// Jackie's starter recipe: seeded once on first launch (NOT sample data, so "Remove sample recipes" keeps it).
import { uid, type Recipe } from './logic'

export const STARTER_PHOTO = './starter/smoothie.jpg'

export function makeStarter(now = Date.now()): Recipe {
  return {
    id: uid(),
    title: 'Blueberry Pineapple Yogurt Smoothie',
    category: 'Breakfast',
    tags: ['smoothie', 'breakfast'],
    prepMin: 5,
    cookMin: 0,
    servings: 2,
    favorite: true,
    pinned: true,
    photoId: null,
    ingredients: [
      '1 cup frozen blueberries',
      '1 cup pineapple chunks (frozen makes it thicker)',
      '1 cup plain or vanilla Greek yogurt',
      '1/2 banana, for creaminess (optional)',
      '3/4 cup milk, coconut water, or pineapple juice',
      '1 to 2 tsp honey, to taste',
      'A small handful of ice if you’re using fresh fruit',
    ],
    steps: [
      'Pour the liquid into the blender first so the blades turn freely.',
      'Add the yogurt, banana, and honey, then the frozen fruit on top.',
      'Blend on low for a few seconds, then on high for 45 to 60 seconds until smooth.',
      'Taste it. Add more honey if you want it sweeter, or a splash of liquid if it’s too thick.',
      'Pour it into glasses and top with a few blueberries or a pineapple wedge.',
    ],
    notes: [
      '• Adding a scoop of vanilla protein powder or a tablespoon of chia seeds makes it a more filling breakfast.',
      '• Using coconut water and skipping the honey keeps it lighter and lower in sugar.',
      '• Swapping in coconut yogurt and plant milk makes it dairy-free.',
    ].join('\n'),
    createdAt: now,
    updatedAt: now,
  }
}
