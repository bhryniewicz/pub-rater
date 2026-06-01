import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type { MapMarker, PubListItem, Place, Review } from '@/lib/schemas'

export async function fetchAllMarkers(): Promise<import('@/lib/schemas').MapMarker[]> {
  const pageSize = 1000;
  let all: import('@/lib/schemas').MapMarker[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("markers")
      .select("id, name, amenity, lat, lon, outdoor_seating, voivodeship, places(opening_hours, app_rating)")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    const raw = data as unknown as Array<Record<string, unknown> & { places: { opening_hours: import('@/lib/schemas').MapMarker['opening_hours']; app_rating: number | null } | null }>;
    const flat = raw.map(({ places, ...rest }) => ({
      ...rest,
      opening_hours: places?.opening_hours ?? null,
      app_rating: places?.app_rating ?? null,
    })) as import('@/lib/schemas').MapMarker[];
    all = all.concat(flat);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
