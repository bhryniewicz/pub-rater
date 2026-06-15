'use server'

import { getUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AddPlaceSchema, type AddPlaceValues, type OpeningHours } from '@/features/places/schemas'

type ResubmitPlacePayload = AddPlaceValues & { opening_hours: OpeningHours | null; requestId: string }

export async function resubmitPlaceRequest(payload: ResubmitPlacePayload): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Unauthenticated')

  const parsed = AddPlaceSchema.safeParse(payload)
  if (!parsed.success) throw new Error('Invalid payload')

  const supabase = await createServerSupabaseClient()

  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('id, requested_by, status, type')
    .eq('id', payload.requestId)
    .single()

  if (fetchError || !req) throw new Error('Request not found')
  if (req.requested_by !== user.id) throw new Error('Forbidden')
  if (req.status !== 'need_more_info') throw new Error('Request is not awaiting more info')
  if (req.type !== 'place_request') throw new Error('Wrong request type')

  const { error } = await supabase
    .from('requests')
    .update({
      name: parsed.data.name,
      place_type: parsed.data.place_type,
      address: parsed.data.address ?? null,
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      opening_hours: payload.opening_hours,
      status: 'pending',
      admin_comment: null,
    })
    .eq('id', payload.requestId)

  if (error) throw error
}
