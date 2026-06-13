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

  // Verify the place exists and has no owner — fetch full details for the request row
  const [{ data: marker, error: markerError }, { data: place }] = await Promise.all([
    supabase
      .from('markers')
      .select('id, name, place_type, lat, lon, owner_id')
      .eq('id', parsed.data.marker_id)
      .single(),
    supabase
      .from('places')
      .select('address, opening_hours')
      .eq('marker_id', parsed.data.marker_id)
      .maybeSingle(),
  ])

  if (markerError || !marker) throw new Error('Place not found')
  if (marker.owner_id) throw new Error('Place already has an owner')

  // Check no pending or need_more_info claim already exists for this place
  const { data: existing } = await supabase
    .from('requests')
    .select('id')
    .eq('marker_id', parsed.data.marker_id)
    .eq('type', 'owner_claim')
    .in('status', ['pending', 'need_more_info'])
    .maybeSingle()

  if (existing) throw new Error('A pending claim already exists for this place')

  const { error } = await supabase.from('requests').insert({
    type: 'owner_claim',
    marker_id: parsed.data.marker_id,
    description: parsed.data.description,
    status: 'pending',
    requested_by: user.id,
    requester_email: user.email ?? null,
    requester_name: (user.user_metadata?.display_name as string | undefined) ?? null,
    name: marker.name,
    place_type: marker.place_type,
    lat: marker.lat,
    lon: marker.lon,
    address: place?.address ?? null,
    opening_hours: place?.opening_hours ?? null,
  })

  if (error) throw error
}
