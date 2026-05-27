'use server'

import { getUser, getIsOwner, getIsAdmin } from '@/lib/dal'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ClaimPlaceSchema, type ClaimPlaceValues } from '@/lib/schemas'

export async function claimPlace(payload: ClaimPlaceValues): Promise<void> {
  const [user, isOwner, isAdmin] = await Promise.all([getUser(), getIsOwner(), getIsAdmin()])
  if (!user) throw new Error('Unauthenticated')
  if (!isOwner && !isAdmin) throw new Error('Forbidden')

  const parsed = ClaimPlaceSchema.safeParse(payload)
  if (!parsed.success) throw new Error('Invalid payload')

  const supabase = await createServerSupabaseClient()

  // Verify the place exists and has no owner
  const { data: marker, error: markerError } = await supabase
    .from('markers')
    .select('id, owner_id')
    .eq('id', parsed.data.marker_id)
    .single()

  if (markerError || !marker) throw new Error('Place not found')
  if (marker.owner_id) throw new Error('Place already has an owner')

  // Check no pending claim already exists for this place
  const { data: existing } = await supabase
    .from('location_requests')
    .select('id')
    .eq('marker_id', parsed.data.marker_id)
    .eq('type', 'owner_claim')
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) throw new Error('A pending claim already exists for this place')

  const { error } = await supabase.from('location_requests').insert({
    type: 'owner_claim',
    marker_id: parsed.data.marker_id,
    description: parsed.data.description,
    status: 'pending',
    requested_by: user.id,
  })

  if (error) throw error
}
