export const TABS = [
  { path: 'today', label: 'Today' },
  { path: 'stock', label: 'Stock' },
  { path: 'plan', label: 'Plan' },
  { path: 'recipes', label: 'Recipes' },
  { path: 'shop', label: 'Shop' },
] as const

export type Path = (typeof TABS)[number]['path'] | 'settings' | 'item' | 'recipe'
const KNOWN: Path[] = ['today', 'stock', 'plan', 'recipes', 'shop', 'settings', 'item', 'recipe']

function parse(): { path: Path; param: string | null } {
  const [p, param] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { path: KNOWN.includes(p as Path) ? (p as Path) : 'today', param: param || null }
}

export const route = $state<{ path: Path; param: string | null }>(parse())

window.addEventListener('hashchange', () => {
  const r = parse()
  route.path = r.path
  route.param = r.param
})

export function go(path: Path, param?: string): void {
  window.location.hash = param ? `/${path}/${param}` : `/${path}`
}

export function back(): void {
  history.back()
}
