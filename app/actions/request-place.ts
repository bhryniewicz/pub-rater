'use server'

import { getUser } from '@/lib/dal'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AddPlaceSchema, type AddPlaceValues, type OpeningHours } from '@/lib/schemas'

type RequestPlacePayload = AddPlaceValues & { opening_hours: OpeningHours | null }

export async function requestPlace(payload: RequestPlacePayload): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Unauthenticated')

  const parsed = AddPlaceSchema.safeParse(payload)
  if (!parsed.success) throw new Error('Invalid payload')

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('location_requests').insert({
    name: parsed.data.name,
    amenity: parsed.data.amenity,
    address: parsed.data.address ?? null,
    lat: parsed.data.lat,
    lon: parsed.data.lon,
    opening_hours: payload.opening_hours,
    status: 'pending',
    requested_by: user.id,
  })

  if (error) throw error
}
