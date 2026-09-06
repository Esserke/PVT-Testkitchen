// Forecasts for every item, recomputed from the live ledger.
import { stockState } from './stockState.svelte'
import { eventsByItem } from './stockState.svelte'
import { forecast, todayIso, type Forecast } from './domain/forecast'

export function forecastMap(): Map<string, Forecast> {
  const today = todayIso()
  const by = eventsByItem(stockState.events)
  return new Map(stockState.items.map((i) => [i.id, forecast(i, by.get(i.id) ?? [], today)]))
}
