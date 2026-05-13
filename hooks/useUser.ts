'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read the session from cookie storage (not in-memory cache) so we pick up
    // any tokens the server refreshed via the proxy since the last page load.
    function syncFromStorage() {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
    }

    syncFromStorage()

    // When the browser restores this page from the back/forward cache (bfcache),
    // React effects don't re-run — but the pageshow event still fires, so we
    // re-sync in case the server rotated the refresh token while we were away.
    window.addEventListener('pageshow', syncFromStorage)

    // Keep in sync with auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('pageshow', syncFromStorage)
    }
  }, [])

  return { user, loading }
}
