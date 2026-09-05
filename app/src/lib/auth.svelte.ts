import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const auth = $state<{ session: Session | null; ready: boolean; error: string | null }>({
  session: null,
  ready: supabase === null,
  error: null,
})

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    auth.session = data.session
    auth.ready = true
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    auth.session = session
  })
}

export async function sendMagicLink(email: string): Promise<boolean> {
  if (!supabase) return false
  auth.error = null
  const redirect = window.location.origin + window.location.pathname
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
  if (error) {
    auth.error = error.message
    return false
  }
  return true
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
  auth.session = null
}
