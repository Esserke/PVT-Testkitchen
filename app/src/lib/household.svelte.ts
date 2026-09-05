// Which household this device belongs to. In local-only mode it is a fixed id.
import { supabase } from './supabase'
import { auth } from './auth.svelte'
import { clearLocalData } from './db/repo'

const KEY = 'larder.household'
const LOCAL_ID = '00000000-0000-0000-0000-000000000001'

interface HouseholdState {
  id: string | null
  name: string | null
  memberId: string | null
  memberName: string | null
  inviteCode: string | null
  loading: boolean
  error: string | null
}

function load(): HouseholdState {
  if (!supabase) {
    return { id: LOCAL_ID, name: 'This device', memberId: null, memberName: null, inviteCode: null, loading: false, error: null }
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...JSON.parse(raw), loading: false, error: null }
  } catch {
    /* ignore */
  }
  return { id: null, name: null, memberId: null, memberName: null, inviteCode: null, loading: false, error: null }
}

export const household = $state<HouseholdState>(load())

function persist() {
  const { id, name, memberId, memberName, inviteCode } = household
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, name, memberId, memberName, inviteCode }))
  } catch {
    /* ignore */
  }
}

export async function resolveHousehold(): Promise<void> {
  if (!supabase || !auth.session) return
  household.loading = true
  household.error = null
  const { data, error } = await supabase
    .from('member')
    .select('id, name, household:household_id ( id, name, invite_code )')
    .eq('auth_user_id', auth.session.user.id)
    .eq('deleted', false)
    .limit(1)
    .maybeSingle()
  household.loading = false
  if (error) {
    household.error = error.message
    return
  }
  if (!data) {
    household.id = null
    persist()
    return
  }
  const h = (Array.isArray(data.household) ? data.household[0] : data.household) as {
    id: string
    name: string
    invite_code: string
  }
  if (household.id && household.id !== h.id) await clearLocalData()
  household.id = h.id
  household.name = h.name
  household.inviteCode = h.invite_code
  household.memberId = data.id
  household.memberName = data.name
  persist()
}

export async function createHousehold(name: string, memberName: string): Promise<boolean> {
  if (!supabase) return false
  household.error = null
  const { error } = await supabase.rpc('create_household', { p_name: name, p_member_name: memberName })
  if (error) {
    household.error = error.message
    return false
  }
  await resolveHousehold()
  return household.id !== null
}

export async function joinHousehold(code: string, memberName: string): Promise<boolean> {
  if (!supabase) return false
  household.error = null
  const { error } = await supabase.rpc('join_household', { p_code: code.trim(), p_member_name: memberName })
  if (error) {
    household.error = error.message
    return false
  }
  await resolveHousehold()
  return household.id !== null
}

// Leave the current household on the server, then show the create/join screen.
export async function leaveHousehold(): Promise<boolean> {
  if (!supabase) return false
  household.error = null
  const { error } = await supabase.rpc('leave_household')
  if (error) {
    household.error = error.message
    return false
  }
  await leaveDevice()
  return true
}

export async function leaveDevice(): Promise<void> {
  await clearLocalData()
  household.id = null
  household.name = null
  household.memberId = null
  household.memberName = null
  household.inviteCode = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
