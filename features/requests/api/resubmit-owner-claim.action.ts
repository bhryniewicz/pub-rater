'use server'

import { getUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const ResubmitClaimSchema = z.object({
  requestId: z.string(),
  description: z.string().trim().min(1, 'Description is required').max(1000, 'Max 1000 characters'),
})

export async function resubmitOwnerClaim(payload: { requestId: string; description: string }): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Unauthenticated')

  const parsed = ResubmitClaimSchema.safeParse(payload)
  if (!parsed.success) throw new Error('Invalid payload')

  const supabase = await createServerSupabaseClient()

  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('id, requested_by, status, type')
    .eq('id', parsed.data.requestId)
    .single()

  if (fetchError || !req) throw new Error('Request not found')
  if (req.requested_by !== user.id) throw new Error('Forbidden')
  if (req.status !== 'need_more_info') throw new Error('Request is not awaiting more info')
  if (req.type !== 'owner_claim') throw new Error('Wrong request type')

  const { error } = await supabase
    .from('requests')
    .update({
      description: parsed.data.description,
      status: 'pending',
      admin_comment: null,
    })
    .eq('id', parsed.data.requestId)

  if (error) throw error
}
