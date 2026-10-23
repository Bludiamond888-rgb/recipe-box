// Sample recipes (flagged sample:true so they can be removed in one tap). Photos live in public/samples/.
import type { Recipe } from './logic'

type Sample = Omit<Recipe, 'id' | 'photoId' | 'createdAt' | 'updatedAt' | 'sample'> & { photo: string }

export const SAMPLES: Sample[] = [
  {
    title: 'Buttermilk Pancakes', category: 'Breakfast', tags: ['weekend', 'kids'], prepMin: 10, cookMin: 15, servings: 4, favorite: true,
    photo: 'pancakes.jpg',
    ingredients: ['2 cups all-purpose flour', '2 tbsp sugar', '2 tsp baking powder', '1/2 tsp baking soda', '1/2 tsp salt', '2 cups buttermilk', '2 eggs', '3 tbsp melted butter', 'Maple syrup and blueberries, to serve'],
    steps: [
      'Whisk the flour, sugar, baking powder, baking soda and salt in a large bowl.',
      'In another bowl whisk the buttermilk, eggs and melted butter.',
      'Pour the wet ingredients into the dry and stir just until combined. A few lumps are fine.',
      'Heat a lightly buttered pan over medium heat. Pour 1/4 cup batter per pancake.',
      'Cook until bubbles form and the edges look set, about 2 minutes. Flip and cook 1 minute more.',
      'Serve warm with butter, maple syrup and blueberries.',
    ],
    notes: 'Let the batter rest 5 minutes for extra-fluffy pancakes. No buttermilk? Add 2 tbsp lemon juice to 2 cups milk.',
  },
  {
    title: 'Weeknight Tomato Basil Pasta', category: 'Dinner', tags: ['quick', 'vegetarian'], prepMin: 5, cookMin: 20, servings: 4, favorite: true,
    photo: 'pasta.jpg',
    ingredients: ['1 lb spaghetti', '3 tbsp olive oil', '4 cloves garlic, sliced', '1 (28 oz) can crushed tomatoes', '1/2 tsp red pepper flakes', '1 1/2 tsp salt', '1/2 cup grated parmesan', '1 handful fresh basil'],
    steps: [
      'Bring a big pot of salted water to a boil and cook the spaghetti until al dente. Save 1 cup of pasta water.',
      'Meanwhile, warm the olive oil in a large pan and gently cook the garlic until golden, about 2 minutes.',
      'Add the tomatoes, pepper flakes and salt. Simmer 15 minutes, stirring now and then.',
      'Toss the drained pasta in the sauce with a splash of pasta water until glossy.',
      'Serve topped with parmesan and torn basil.',
    ],
    notes: 'A knob of butter stirred in at the end makes the sauce extra silky.',
  },
  {
    title: 'Lemon Herb Roast Chicken', category: 'Dinner', tags: ['sunday', 'gluten-free'], prepMin: 15, cookMin: 75, servings: 6, favorite: false,
    photo: 'chicken.jpg',
    ingredients: ['1 whole chicken (about 4 lb)', '2 lemons', '3 tbsp soft butter', '2 tbsp chopped rosemary', '1 tbsp chopped thyme', '4 cloves garlic', '1 1/2 lb baby potatoes', '2 tbsp olive oil', '2 tsp kosher salt', '1/2 tsp black pepper'],
    steps: [
      'Heat the oven to 425°F (220°C). Pat the chicken very dry.',
      'Mash the butter with the herbs, garlic and the zest of 1 lemon. Rub it under and over the skin.',
      'Halve the lemons and put two halves inside the chicken. Season all over with salt and pepper.',
      'Toss the potatoes with olive oil and salt in a skillet and set the chicken on top with the other lemon halves.',
      'Roast about 75 minutes, until the thickest part of the thigh reads 165°F (74°C).',
      'Rest 10 minutes before carving. Spoon the pan juices over everything.',
    ],
    notes: 'Salt the chicken the night before and leave it uncovered in the fridge for the crispiest skin.',
  },
  {
    title: 'Chewy Chocolate Chip Cookies', category: 'Dessert', tags: ['baking', 'kids'], prepMin: 15, cookMin: 12, servings: 24, favorite: true,
    photo: 'cookies.jpg',
    ingredients: ['1 cup butter, softened', '3/4 cup brown sugar', '1/2 cup white sugar', '2 eggs', '2 tsp vanilla extract', '2 1/4 cups all-purpose flour', '1 tsp baking soda', '1 tsp salt', '2 cups chocolate chips'],
    steps: [
      'Heat the oven to 350°F (175°C) and line two baking sheets.',
      'Beat the butter and both sugars until light and fluffy, about 3 minutes.',
      'Beat in the eggs one at a time, then the vanilla.',
      'Stir in the flour, baking soda and salt, then fold in the chocolate chips.',
      'Scoop 2 tbsp balls onto the sheets, 2 inches apart.',
      'Bake 10–12 minutes until golden at the edges but soft in the middle. Cool on the sheet 5 minutes.',
    ],
    notes: 'Chill the dough 30 minutes for thicker cookies.',
  },
  {
    title: 'Greek Salad', category: 'Lunch', tags: ['quick', 'vegetarian', 'no-cook'], prepMin: 15, cookMin: null, servings: 4, favorite: false,
    photo: 'salad.jpg',
    ingredients: ['4 ripe tomatoes, cut in wedges', '1 cucumber, chunked', '1/2 red onion, thinly sliced', '1/2 cup kalamata olives', '7 oz block feta', '1/4 cup olive oil', '1 tbsp red wine vinegar', '1 tsp dried oregano', 'Salt and pepper to taste'],
    steps: [
      'Combine the tomatoes, cucumber, onion and olives in a wide bowl.',
      'Season with salt, then drizzle with the vinegar and most of the olive oil.',
      'Set the feta on top, sprinkle with oregano and finish with the rest of the oil.',
    ],
    notes: 'Best eaten right away while the tomatoes are juicy.',
  },
  {
    title: 'Creamy Tomato Soup', category: 'Lunch', tags: ['cozy', 'vegetarian'], prepMin: 10, cookMin: 30, servings: 4, favorite: false,
    photo: 'soup.jpg',
    ingredients: ['2 tbsp butter', '1 onion, chopped', '3 cloves garlic', '2 (28 oz) cans whole tomatoes', '2 cups vegetable broth', '1 tsp sugar', '1/2 cup heavy cream', '1 tsp salt', 'Fresh parsley, to serve'],
    steps: [
      'Melt the butter in a pot and cook the onion until soft, about 6 minutes. Add the garlic for 1 minute.',
      'Add the tomatoes with their juice, the broth, sugar and salt. Simmer 20 minutes.',
      'Blend until smooth, then stir in the cream.',
      'Taste for salt and serve with a grilled cheese sandwich.',
    ],
    notes: 'Freezes well for up to 3 months (add the cream after reheating).',
  },
]
