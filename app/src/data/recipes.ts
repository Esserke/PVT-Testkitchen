// Starter recipes. Ingredient names must match an item in the catalogue (name or alias);
// anything else stays as text. Kevin asked for the first one on 2026-09-06.
export interface StarterIngredient { name: string; quantity: number | null; unit: string | null; optional?: boolean }
export interface StarterRecipe {
  title: string
  servings: number
  prep_minutes: number
  cook_minutes: number
  tags: string[]
  ingredients: StarterIngredient[]
  steps: string
}

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    title: 'Bangers and mash with sweet peas and sweet cabbage',
    servings: 3,
    prep_minutes: 15,
    cook_minutes: 30,
    tags: ['weeknight', 'kid-favourite', 'one-pan'],
    ingredients: [
      { name: 'Pork sausages', quantity: 500, unit: 'g' },
      { name: 'Potatoes', quantity: 800, unit: 'g' },
      { name: 'Butter', quantity: 60, unit: 'g' },
      { name: 'Fresh full cream milk', quantity: 100, unit: 'ml' },
      { name: 'Frozen peas', quantity: 250, unit: 'g' },
      { name: 'Cabbage', quantity: 0.5, unit: 'piece' },
      { name: 'Onions', quantity: 1, unit: 'piece' },
      { name: 'Sugar', quantity: 15, unit: 'g' },
      { name: 'Gravy powder', quantity: 30, unit: 'g' },
      { name: 'Table salt', quantity: null, unit: null, optional: true },
      { name: 'Black pepper', quantity: null, unit: null, optional: true },
    ],
    steps: [
      'Peel and quarter the potatoes. Boil in salted water until soft, about 20 minutes.',
      'Slice the onion and shred the cabbage. Fry the onion in half the butter until soft, add the cabbage, the sugar and a splash of water. Cover and cook gently until sweet and tender, about 10 minutes.',
      'Brown the sausages in a pan over medium heat, turning, about 15 minutes. Make the gravy with the powder and the pan juices.',
      'Cook the peas in a little boiling water with a knob of butter and a pinch of sugar, 3 minutes. Drain.',
      'Drain and mash the potatoes with the rest of the butter and the warm milk. Season.',
      'Plate the mash, sausages, peas and cabbage. Gravy over the top.',
    ].join('\n'),
  },
]
