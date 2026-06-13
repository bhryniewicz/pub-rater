import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type { MapMarker, PubListItem, Place, Review } from '@/lib/schemas'

export async function fetchAllMarkers(client: SupabaseClient = supabase): Promise<import('@/lib/schemas').MapMarker[]> {
  const pageSize = 1000;
  let all: import('@/lib/schemas').MapMarker[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from("markers")
      .select("id, name, place_type, lat, lon, outdoor_seating, voivodeship")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    const flat = (data as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      opening_hours: null,
      app_rating: null,
    })) as import('@/lib/schemas').MapMarker[];
    all = all.concat(flat);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export async function fetchMarkersEnrichment(): Promise<Record<string, { opening_hours: import('@/lib/schemas').MapMarker['opening_hours']; app_rating: number | null }>> {
  const pageSize = 1000;
  const result: Record<string, { opening_hours: import('@/lib/schemas').MapMarker['opening_hours']; app_rating: number | null }> = {};
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("markers")
      .select("id, places(opening_hours, app_rating)")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    for (const row of data as unknown as Array<{ id: string; places: { opening_hours: import('@/lib/schemas').MapMarker['opening_hours']; app_rating: number | null } | null }>) {
      result[row.id] = {
        opening_hours: row.places?.opening_hours ?? null,
        app_rating: row.places?.app_rating ?? null,
      };
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return result;
}
