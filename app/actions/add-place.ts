'use server'

import { getIsAdmin } from '@/lib/dal'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AddPlaceSchema, type AddPlaceValues, type OpeningHours } from '@/lib/schemas'

type AddPlacePayload = AddPlaceValues & { opening_hours: OpeningHours | null }

export async function addPlace(payload: AddPlacePayload): Promise<{ id: string }> {
  if (!(await getIsAdmin())) {
    throw new Error('Forbidden')
  }

  const parsed = AddPlaceSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('Invalid payload')
  }

  const supabase = await createServerSupabaseClient()

  const { data: marker, error: markerError } = await supabase
    .from('markers')
    .insert({
      name: parsed.data.name,
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      amenity: parsed.data.amenity,
    })
    .select('id')
    .single()

  if (markerError || !marker) throw markerError ?? new Error('Failed to create marker')

  const { error: placeError } = await supabase.from('places').insert({
    marker_id: marker.id,
    address: parsed.data.address ?? null,
    opening_hours: payload.opening_hours,
  })

  if (placeError) throw placeError

  return { id: marker.id }
}
