import { z } from 'zod'
import { OpeningHoursSchema } from '@/schemas/entities'

export const LocationRequestStatus = z.enum(['pending', 'approved', 'rejected', 'need_more_info'])

const LocationRequestBase = z.object({
  id: z.string(),
  status: LocationRequestStatus,
  requested_by: z.string().nullable(),
  requester_email: z.string().nullable(),
  requester_name: z.string().nullable(),
  created_at: z.string(),
  description: z.string().nullable(),
  admin_comment: z.string().nullable(),
})

export const ReviewActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), id: z.string() }),
  z.object({
    action: z.literal('reject'),
    id: z.string(),
    comment: z.string().trim().min(1, 'An explanation is required when rejecting').max(1000, 'Max 1000 characters'),
  }),
  z.object({
    action: z.literal('need_more_info'),
    id: z.string(),
    comment: z.string().trim().min(1, 'A message is required').max(1000, 'Max 1000 characters'),
  }),
])

export const PlaceRequestSchema = LocationRequestBase.extend({
  type: z.literal('place_request'),
  name: z.string(),
  place_type: z.string(),
  address: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  opening_hours: OpeningHoursSchema.nullable(),
  marker_id: z.string().nullable(),
})

export const OwnerClaimSchema = LocationRequestBase.extend({
  type: z.literal('owner_claim'),
  marker_id: z.string(),
  name: z.string().nullable(),
  place_type: z.string().nullable(),
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  opening_hours: OpeningHoursSchema.nullable(),
})

export const LocationRequestSchema = z.discriminatedUnion('type', [
  PlaceRequestSchema,
  OwnerClaimSchema,
])

export const ClaimPlaceSchema = z.object({
  marker_id: z.string(),
  description: z.string().trim().min(1, 'Description is required').max(1000, 'Max 1000 characters'),
})

export type LocationRequest = z.infer<typeof LocationRequestSchema>
export type PlaceRequest = z.infer<typeof PlaceRequestSchema>
export type OwnerClaim = z.infer<typeof OwnerClaimSchema>
export type LocationRequestStatusType = z.infer<typeof LocationRequestStatus>
export type ClaimPlaceValues = z.infer<typeof ClaimPlaceSchema>
