import { supabase } from './supabase'
import { household } from './household.svelte'

export const aiUsage = $state<{ today: number; monthCost: number; monthCalls: number; loaded: boolean }>({ today: 0, monthCost: 0, monthCalls: 0, loaded: false })

export async function refreshAiUsage(): Promise<void> {
  if (!supabase || !household.id) return
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const { data } = await supabase.from('ai_usage').select('created_at, cost_usd').eq('household_id', household.id).gte('created_at', start.toISOString())
  if (!data) return
  const today = new Date().toISOString().slice(0, 10)
  aiUsage.today = data.filter((r) => r.created_at.slice(0, 10) === today).length
  aiUsage.monthCalls = data.length
  aiUsage.monthCost = data.reduce((s, r) => s + Number(r.cost_usd), 0)
  aiUsage.loaded = true
}
