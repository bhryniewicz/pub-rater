import { z } from 'zod'

export const DayHoursSchema = z.object({
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

const PLACE_TYPES = ['pub', 'bar', 'biergarten'] as const

export const AddPlaceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Max 200 characters'),
  place_type: z.enum(PLACE_TYPES, { errorMap: () => ({ message: 'Category is required' }) }),
  address: z.string().trim().optional(),
  lat: z.number({ required_error: 'Pick a location on the map', invalid_type_error: 'Pick a location on the map' }),
  lon: z.number({ required_error: 'Pick a location on the map', invalid_type_error: 'Pick a location on the map' }),
})

export const ReviewFormSchema = z.object({
  comment: z.string().trim().max(1000, 'Max 1000 characters').optional(),
  rating: z
    .number({ invalid_type_error: 'Please select a rating' })
    .min(1, 'Please select a rating')
    .max(5),
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

export type DayHours = z.infer<typeof DayHoursSchema>
export type OpeningHours = z.infer<typeof OpeningHoursSchema>
export type MapMarker = z.infer<typeof MapMarkerSchema>
export type PubListItem = z.infer<typeof PubListItemSchema>
export type Place = z.infer<typeof PlaceSchema>
export type Review = z.infer<typeof ReviewSchema>
export type AddPlaceValues = z.infer<typeof AddPlaceSchema>
export type Amenity = typeof PLACE_TYPES[number]
export type ReviewFormValues = z.infer<typeof ReviewFormSchema>
export type EditPlaceValues = z.infer<typeof EditPlaceSchema>
