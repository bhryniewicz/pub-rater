import { z } from 'zod'

// Matches the markers table — lightweight, used for map pins and counters
export const MapMarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  amenity: z.string(),
  lat: z.number(),
  lon: z.number(),
  outdoor_seating: z.boolean().nullable(),
})

// Matches the pub_list view (markers JOIN places) — used for the sidebar list
export const PubListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amenity: z.string(),
  lat: z.number(),
  lon: z.number(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  thumbnail: z.string().nullable(),
})

// Matches the places table — full details, fetched on demand
export const PlaceSchema = z.object({
  id: z.string(),
  marker_id: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  opening_hours: z.string().nullable(),
  city: z.string().nullable(),
  google_place_id: z.string().nullable(),
  google_rating: z.number().nullable(),
  google_review_count: z.number().nullable(),
  app_rating: z.number(),
  app_review_count: z.number(),
  thumbnail: z.string().nullable(),
})

export type MapMarker = z.infer<typeof MapMarkerSchema>
export type PubListItem = z.infer<typeof PubListItemSchema>
export type Place = z.infer<typeof PlaceSchema>
