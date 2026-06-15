'use client'

import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { ProfilePreferences } from '@/features/profile/schemas'

export type UserProfile = {
  is_onboarded: boolean
  preferences: ProfilePreferences | null
  liked_places: string[]
  role: string
  avatar_url: string | null
  banned: boolean
}

export type UserData = {
  user: User | null
  isAdmin: boolean
  isOwner: boolean
  profile: UserProfile | null
}

export async function fetchUser(): Promise<UserData> {
  const { data: { session } } = await supabase.auth.getSession()
  const u = session?.user ?? null
  if (!u) return { user: null, isAdmin: false, isOwner: false, profile: null }
  const { data } = await supabase
    .from('profiles')
    .select('role, is_onboarded, preferences, liked_places, avatar_url, banned')
    .eq('id', u.id)
    .single()
  return {
    user: u,
    isAdmin: data?.role === 'admin',
    isOwner: data?.role === 'owner',
    profile: data ?? null,
  }
}

export function useUser(): { user: User | null; loading: boolean; isAdmin: boolean; isOwner: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.USER,
    queryFn: fetchUser,
    staleTime: Infinity,
  })

  return {
    user: data?.user ?? null,
    loading: isLoading,
    isAdmin: data?.isAdmin ?? false,
    isOwner: data?.isOwner ?? false,
  }
}
