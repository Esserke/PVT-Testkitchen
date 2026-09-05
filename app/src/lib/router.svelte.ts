export const TABS = [
  { path: 'today', label: 'Today' },
  { path: 'stock', label: 'Stock' },
  { path: 'plan', label: 'Plan' },
  { path: 'recipes', label: 'Recipes' },
  { path: 'shop', label: 'Shop' },
] as const

export type Path = (typeof TABS)[number]['path'] | 'settings'

function parse(): Path {
  const h = window.location.hash.replace(/^#\/?/, '').split('/')[0]
  const known: Path[] = ['today', 'stock', 'plan', 'recipes', 'shop', 'settings']
  return known.includes(h as Path) ? (h as Path) : 'today'
}

export const route = $state<{ path: Path }>({ path: parse() })

window.addEventListener('hashchange', () => (route.path = parse()))

export function go(path: Path): void {
  window.location.hash = `/${path}`
}
