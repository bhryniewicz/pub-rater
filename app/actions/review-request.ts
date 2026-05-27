'use server'

import { getIsAdmin } from '@/lib/dal'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function approveRequest(id: string): Promise<void> {
  if (!(await getIsAdmin())) throw new Error('Forbidden')

  const supabase = await createServerSupabaseClient()

  const { data: req, error: fetchError } = await supabase
    .from('location_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !req) throw fetchError ?? new Error('Request not found')

  if (req.type === 'owner_claim') {
    // Assign owner_id on the existing marker
    const { error: ownerError } = await supabase
      .from('markers')
      .update({ owner_id: req.requested_by })
      .eq('id', req.marker_id)

    if (ownerError) throw ownerError

    const { error: updateError } = await supabase
      .from('location_requests')
      .update({ status: 'approved' })
      .eq('id', id)

    if (updateError) throw updateError

    await supabase.from('notifications').insert({
      user_id: req.requested_by,
      type: 'approved',
      request_type: 'owner_claim',
      request_id: id,
      request_name: req.description ?? 'Ownership claim',
      marker_id: req.marker_id,
    })

    return
  }

  // place_request: create marker + place
  const { data: marker, error: markerError } = await supabase
    .from('markers')
    .insert({
      name: req.name,
      lat: req.lat,
      lon: req.lon,
      amenity: req.amenity,
    })
    .select('id')
    .single()

  if (markerError || !marker) throw markerError ?? new Error('Failed to create marker')

  const { error: placeError } = await supabase.from('places').insert({
    marker_id: marker.id,
    address: req.address,
    opening_hours: req.opening_hours,
  })

  if (placeError) throw placeError

  const { error: updateError } = await supabase
    .from('location_requests')
    .update({ status: 'approved' })
    .eq('id', id)

  if (updateError) throw updateError

  await supabase.from('notifications').insert({
    user_id: req.requested_by,
    type: 'approved',
    request_type: 'place_request',
    request_id: id,
    request_name: req.name,
    marker_id: marker.id,
  })
}

export async function rejectRequest(id: string): Promise<void> {
  if (!(await getIsAdmin())) throw new Error('Forbidden')

  const supabase = await createServerSupabaseClient()

  const { data: req, error: fetchError } = await supabase
    .from('location_requests')
    .select('requested_by, name, type, description')
    .eq('id', id)
    .single()

  if (fetchError || !req) throw fetchError ?? new Error('Request not found')

  const { error } = await supabase
    .from('location_requests')
    .update({ status: 'rejected' })
    .eq('id', id)

  if (error) throw error

  // No rejection notification for owner claims
  if (req.type === 'owner_claim') return

  await supabase.from('notifications').insert({
    user_id: req.requested_by,
    type: 'rejected',
    request_type: 'place_request',
    request_id: id,
    request_name: req.name,
    marker_id: null,
  })
}
