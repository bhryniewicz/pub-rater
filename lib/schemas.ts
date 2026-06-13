import { z } from 'zod'

// ── Auth ────────────────────────────────────────────────────────────────────

const strongPassword = z
  .string()
  .min(8, 'Min 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character')

export const LoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const SignupStep1Schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: strongPassword,
})

export const SignupStep2Schema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Min 2 characters')
    .max(50, 'Max 50 characters'),
  birth_date: z.string().refine((val) => {
    if (!val) return false
    const born = new Date(val)
    if (isNaN(born.getTime())) return false
    const today = new Date()
    const threshold = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    )
    return born <= threshold
  }, 'Must be 18 or older'),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => val === '' || /^\+?[1-9]\d{6,14}$/.test(val),
      'Enter a valid phone number',
    )
    .optional(),
})

const birthDateRefinement = (val: string) => {
  if (!val) return false
  const born = new Date(val)
  if (isNaN(born.getTime())) return false
  const today = new Date()
  const threshold = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  )
  return born <= threshold
}

export const SignupSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: strongPassword,
  display_name: z
    .string()
    .trim()
    .min(2, 'Min 2 characters')
    .max(50, 'Max 50 characters'),
  birth_date: z.string().refine(birthDateRefinement, 'Must be 18 or older'),
  pub_preference: z.boolean(),
  bar_preference: z.boolean(),
})

export type LoginValues = z.infer<typeof LoginSchema>
export type SignupStep1Values = z.infer<typeof SignupStep1Schema>
export type SignupStep2Values = z.infer<typeof SignupStep2Schema>
export type SignupValues = z.infer<typeof SignupSchema>

const DayHoursSchema = z.object({
  open: z.string(),
  close: z.string().nullable(),
}).nullable()

export const OpeningHoursSchema = z.object({
  mo: DayHoursSchema,
  tu: DayHoursSchema,
  we: DayHoursSchema,
  th: DayHoursSchema,
  fr: DayHoursSchema,
  sa: DayHoursSchema,
  su: DayHoursSchema,
})

// Matches the markers table — lightweight, used for map pins and counters
export const MapMarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  place_type: z.string(),
  lat: z.number(),
  lon: z.number(),
  outdoor_seating: z.boolean().nullable(),
  voivodeship: z.string().nullable(),
  opening_hours: OpeningHoursSchema.nullable(),
  app_rating: z.number().nullable(),
})

// Matches the pub_list view (markers JOIN places) — used for the sidebar list
export const PubListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  place_type: z.string(),
  lat: z.number(),
  lon: z.number(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  thumbnail: z.string().nullable(),
  google_rating: z.number().nullable(),
  google_review_count: z.number().nullable(),
  app_rating: z.number().nullable(),
  app_review_count: z.number().nullable(),
  opening_hours: OpeningHoursSchema.nullable(),
})

// Matches the places table — full details, fetched on demand
export const PlaceSchema = z.object({
  id: z.string(),
  marker_id: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  opening_hours: OpeningHoursSchema.nullable(),
  city: z.string().nullable(),
  google_place_id: z.string().nullable(),
  google_rating: z.number().nullable(),
  google_review_count: z.number().nullable(),
  app_rating: z.number().nullable(),
  app_review_count: z.number().nullable(),
  thumbnail: z.string().nullable(),
  app_reviews: z.array(z.string()).nullable(),
  short_code: z.string(),
})

// Matches the reviews table
export const ReviewSchema = z.object({
  id: z.string(),
  marker_id: z.string(),
  user_id: z.string().nullable(),
  user_email: z.string().nullable(),
  rating: z.number().nullable(),
  comment: z.string().nullable(),
  created_at: z.string().nullable(),
  atmosphere: z.number().nullable(),
  service: z.number().nullable(),
  space: z.number().nullable(),
  price_tier: z.number().nullable(),
  additional_info: z.array(z.string()).nullable(),
  thumbs_ups: z.array(z.string()).default([]),
})

// Matches the profiles table — created on signup, updated during onboarding
export const ProfilePreferencesSchema = z.object({
  bar_preference: z.boolean(),
  pub_preference: z.boolean(),
  automatic_zoom: z.boolean().default(true),
})

export const ProfileSchema = z.object({
  id: z.string(),
  is_onboarded: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  preferences: ProfilePreferencesSchema,
  age: z.number(),
  liked_places: z.array(z.string()),
  role: z.enum(['user', 'admin', 'owner']),
  avatar_url: z.string().nullable(),
})

// Add place form
const PLACE_TYPES = ['pub', 'bar', 'biergarten'] as const

export const AddPlaceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Max 200 characters'),
  place_type: z.enum(PLACE_TYPES, { errorMap: () => ({ message: 'Category is required' }) }),
  address: z.string().trim().optional(),
  lat: z.number({ required_error: 'Pick a location on the map', invalid_type_error: 'Pick a location on the map' }),
  lon: z.number({ required_error: 'Pick a location on the map', invalid_type_error: 'Pick a location on the map' }),
})

export type AddPlaceValues = z.infer<typeof AddPlaceSchema>
export type Amenity = typeof PLACE_TYPES[number]

// Review submission form
export const ReviewFormSchema = z.object({
  comment: z.string().trim().max(1000, 'Max 1000 characters').optional(),
  rating: z
    .number({ invalid_type_error: 'Please select a rating' })
    .min(1, 'Please select a rating')
    .max(5),
})

export type OpeningHours = z.infer<typeof OpeningHoursSchema>
export type MapMarker = z.infer<typeof MapMarkerSchema>
export type PubListItem = z.infer<typeof PubListItemSchema>
export type Place = z.infer<typeof PlaceSchema>
export type Review = z.infer<typeof ReviewSchema>
export type ProfilePreferences = z.infer<typeof ProfilePreferencesSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type ReviewFormValues = z.infer<typeof ReviewFormSchema>

// Location request (submitted by users, reviewed by admin)
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

export const EditPlaceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Max 200 characters'),
  place_type: z.enum(['pub', 'bar', 'biergarten'] as const, {
    errorMap: () => ({ message: 'Category is required' }),
  }),
  address: z.string().trim().nullable(),
  city: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  website: z.string().trim().nullable(),
  opening_hours: OpeningHoursSchema.nullable(),
  thumbnail: z.string().trim().nullable(),
})

export type LocationRequest = z.infer<typeof LocationRequestSchema>
export type PlaceRequest = z.infer<typeof PlaceRequestSchema>
export type OwnerClaim = z.infer<typeof OwnerClaimSchema>
export type LocationRequestStatusType = z.infer<typeof LocationRequestStatus>
export type ClaimPlaceValues = z.infer<typeof ClaimPlaceSchema>
export type EditPlaceValues = z.infer<typeof EditPlaceSchema>
