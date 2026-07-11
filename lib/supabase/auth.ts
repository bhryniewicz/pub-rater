import 'server-only'
import { createServerSupabaseClient } from './server'

/**
 * Returns the currently authenticated user, or null if not logged in.
 * Uses getUser() which contacts the Supabase Auth server — safe for
 * authorization decisions (not spoofable from cookies alone).
 */
export async function getUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

/**
 * Like getUser() but redirects to /login if the user is not authenticated.
 * Use this in Server Components or Server Actions that require auth.
 */
export async function requireUser() {
  const { redirect } = await import('next/navigation')
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Like requireUser() but also requires the user to have role 'admin'.
 * Redirects to / if not authenticated or not admin.
 */
export async function requireAdmin() {
  const { redirect } = await import('next/navigation')
  const isAdmin = await getIsAdmin()
  if (!isAdmin) redirect('/')
  const user = await getUser()
  return user!
}

/**
 * Returns true if the currently authenticated user has role 'admin'.
 */
export async function getIsAdmin(): Promise<boolean> {
  const user = await getUser()
  if (!user) return false
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return data?.role === 'admin'
}

/**
 * Returns true if the currently authenticated user has role 'owner'.
 */
export async function getIsOwner(): Promise<boolean> {
  const user = await getUser()
  if (!user) return false
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return data?.role === 'owner'
}

/**
 * Requires the user to have role 'admin' or 'owner'.
 * Redirects to / otherwise. Returns the user and their role.
 */
export async function requireDashboard(): Promise<{ role: 'admin' | 'owner' }> {
  const { redirect } = await import('next/navigation')
  const user = await getUser()
  if (!user) redirect('/')
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()
  const role = data?.role
  if (role !== 'admin' && role !== 'owner') redirect('/')
  return { role: role as 'admin' | 'owner' }
}
