import { z } from 'zod'

// Core entity/data models — the canonical shapes of server data, shared across
// features and infrastructure. Feature-specific form schemas live in each
// feature's own schemas.ts.

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
  voivodeship: z.string().nullable(),
  opening_hours: OpeningHoursSchema.nullable(),
  app_rating: z.number().nullable(),
  app_review_count: z.number().nullable(),
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
  amenities: z.array(z.string()).default([]),
  amenity_other: z.string().nullable(),
  price_tier: z.number().nullable(),
  rating_score: z.number().nullable(),
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
  amenities: z.array(z.string()).default([]),
  amenity_other: z.string().nullable(),
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

export type DayHours = z.infer<typeof DayHoursSchema>
export type OpeningHours = z.infer<typeof OpeningHoursSchema>
export type MapMarker = z.infer<typeof MapMarkerSchema>
export type PubListItem = z.infer<typeof PubListItemSchema>
export type Place = z.infer<typeof PlaceSchema>
export type Review = z.infer<typeof ReviewSchema>
