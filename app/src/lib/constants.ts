export const LOCATIONS = ['pantry', 'fridge', 'freezer', 'chest freezer', 'drinks fridge', 'fruit bowl', 'egg basket', 'spice rack', 'under sink', 'bathroom', 'laundry', 'pool shed', 'store room', 'garage'] as const
// Shelves where a photo can honestly see everything; deep cupboards need confirming by hand.
export const PHOTO_FRIENDLY: readonly string[] = ['fridge', 'freezer', 'chest freezer', 'drinks fridge', 'fruit bowl', 'egg basket', 'bathroom']
export const CATEGORIES = [
  'fresh', 'dairy', 'pantry', 'frozen', 'drinks', 'baby & child', 'bathroom',
  'cleaning & laundry', 'pool & garden', 'utilities', 'pet & farm',
] as const
export const UNITS = ['piece', 'pack', 'roll', 'litre', 'kg', 'bottle', 'bag', 'box', 'tin'] as const
export const SHOPS = ['Woolworths', 'Checkers', 'Spar', 'Everfresh', 'Other'] as const

// The child the school snack box is packed for.
export const CHILD_NAME = 'Faye'
// How the three-compartment box is filled: fresh things, the main bite, a treat. Drinks are optional extras.
export const COMPARTMENTS = [
  { label: 'Fresh', components: ['fruit', 'veg'] },
  { label: 'Main', components: ['carb', 'protein'] },
  { label: 'Treat', components: ['treat'] },
] as const
export const AUTO_FILL_COMPONENTS = ['fruit', 'veg', 'carb', 'protein', 'treat'] as const
