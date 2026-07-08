'use server'

import { getUser, getIsAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EditPlaceSchema, type EditPlaceValues } from '@/features/places/schemas'

export async function editPlace(markerId: string, payload: EditPlaceValues): Promise<void> {
  const [user, isAdmin] = await Promise.all([getUser(), getIsAdmin()])
  if (!user) throw new Error('Unauthenticated')

  const parsed = EditPlaceSchema.safeParse(payload)
  if (!parsed.success) throw new Error('Invalid payload')

  const supabase = await createServerSupabaseClient()

  // Verify caller is admin or the owner of this marker
  if (!isAdmin) {
    const { data: marker, error } = await supabase
      .from('markers')
      .select('owner_id')
      .eq('id', markerId)
      .single()

    if (error || !marker) throw new Error('Place not found')
    if (marker.owner_id !== user.id) throw new Error('Forbidden')
  }

  const { error: markerError } = await supabase
    .from('markers')
    .update({ name: parsed.data.name, place_type: parsed.data.place_type })
    .eq('id', markerId)

  if (markerError) throw markerError

  const { error: placeError } = await supabase
    .from('places')
    .update({
      address: parsed.data.address,
      city: parsed.data.city,
      phone: parsed.data.phone,
      website: parsed.data.website,
      opening_hours: parsed.data.opening_hours,
      thumbnail: parsed.data.thumbnail,
      amenities: parsed.data.amenities,
      amenity_other: parsed.data.amenity_other,
    })
    .eq('marker_id', markerId)

  if (placeError) throw placeError
}
