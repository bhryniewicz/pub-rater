'use server'

import { getIsAdmin } from '@/lib/dal'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function approveRequest(id: string): Promise<void> {
  if (!(await getIsAdmin())) throw new Error('Forbidden')

  const supabase = await createServerSupabaseClient()

  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !req) throw fetchError ?? new Error('Request not found')

  if (req.type === 'owner_claim') {
    const { error: ownerError } = await supabase
      .from('markers')
      .update({ owner_id: req.requested_by })
      .eq('id', req.marker_id)

    if (ownerError) throw ownerError

    const { error: updateError } = await supabase
      .from('requests')
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
      place_type: req.place_type,
    })
    .select('id')
    .single()

  if (markerError || !marker) throw markerError ?? new Error('Failed to create marker')

  const short_code = marker.id.replace(/-/g, '').slice(0, 6)

  const { error: placeError } = await supabase.from('places').insert({
    marker_id: marker.id,
    address: req.address,
    opening_hours: req.opening_hours,
    short_code,
  })

  if (placeError) throw placeError

  const { error: updateError } = await supabase
    .from('requests')
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

export async function requestMoreInfo(params: { id: string; comment: string }): Promise<void> {
  if (!(await getIsAdmin())) throw new Error('Forbidden')

  const { id, comment } = params
  const supabase = await createServerSupabaseClient()

  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('requested_by, name, type, description')
    .eq('id', id)
    .single()

  if (fetchError || !req) throw fetchError ?? new Error('Request not found')

  const { error } = await supabase
    .from('requests')
    .update({ status: 'need_more_info', admin_comment: comment })
    .eq('id', id)

  if (error) throw error

  await supabase.from('notifications').insert({
    user_id: req.requested_by,
    type: 'need_more_info',
    request_type: req.type,
    request_id: id,
    request_name: req.type === 'owner_claim' ? (req.description ?? 'Ownership claim') : req.name,
    marker_id: null,
    message: comment,
  })
}

export async function rejectRequest(params: { id: string; comment: string }): Promise<void> {
  if (!(await getIsAdmin())) throw new Error('Forbidden')

  const { id, comment } = params
  const supabase = await createServerSupabaseClient()

  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('requested_by, name, type, description')
    .eq('id', id)
    .single()

  if (fetchError || !req) throw fetchError ?? new Error('Request not found')

  const { error } = await supabase
    .from('requests')
    .update({ status: 'rejected', admin_comment: comment })
    .eq('id', id)

  if (error) throw error

  await supabase.from('notifications').insert({
    user_id: req.requested_by,
    type: 'rejected',
    request_type: req.type,
    request_id: id,
    request_name: req.type === 'owner_claim' ? (req.description ?? 'Ownership claim') : req.name,
    marker_id: null,
    message: comment,
  })
}
