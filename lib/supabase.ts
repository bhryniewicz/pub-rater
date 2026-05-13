import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Matches the markers table — lightweight, used for map pins and counters
export type MapMarker = {
  id: string
  name: string
  amenity: string
  lat: number
  lon: number
  outdoor_seating: boolean | null
}

// Matches the pub_list view (markers JOIN places) — used for the sidebar list
export type PubListItem = {
  id: string
  name: string
  amenity: string
  lat: number
  lon: number
  city: string | null
  address: string | null
  thumbnail: string | null
}

// Matches the places table — full details, fetched on demand
export type Place = {
  id: string
  marker_id: string
  address: string | null
  phone: string | null
  website: string | null
  opening_hours: string | null
  city: string | null
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  app_rating: number
  app_review_count: number
  thumbnail: string | null
}
