import { z } from 'zod'
import { AMENITY_OTHER_MAX } from "@/lib/constants"
import { OpeningHoursSchema } from "@/schemas"

export const AMENITY_KEYS = [
  'outdoor_seating',
  'smoking_area',
  'great_beer_selection',
  'lots_of_beers_on_tap',
  'serves_food',
  'live_music',
  'dog_friendly',
] as const

export type AmenityKey = typeof AMENITY_KEYS[number]

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
  amenities: z.array(z.enum(AMENITY_KEYS)),
  amenity_other: z
    .string()
    .trim()
    .max(AMENITY_OTHER_MAX, `Max ${AMENITY_OTHER_MAX} characters`)
    .nullable(),
})

export type AddPlaceValues = z.infer<typeof AddPlaceSchema>
export type Amenity = typeof PLACE_TYPES[number]
export type ReviewFormValues = z.infer<typeof ReviewFormSchema>
export type EditPlaceValues = z.infer<typeof EditPlaceSchema>
