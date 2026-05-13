import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const CITIES = [
  { name: "Warszawa", bbox: [52.0978, 20.8517, 52.3682, 21.2712] },
  { name: "Kraków", bbox: [49.9677, 19.7922, 50.1261, 20.2173] },
  { name: "Katowice", bbox: [50.1301, 18.8915, 50.2977, 19.1244] },
  { name: "Poznań", bbox: [52.2919, 16.7316, 52.5093, 17.0717] },
  { name: "Wrocław", bbox: [51.0427, 16.8073, 51.2101, 17.1762] },
  { name: "Łódź", bbox: [51.6861, 19.3209, 51.8599, 19.6399] },
  { name: "Gdańsk", bbox: [54.2749, 18.4295, 54.5827, 19.0703] },
  { name: "Lublin", bbox: [51.1398, 22.4538, 51.2966, 22.6735] },
  { name: "Rzeszów", bbox: [49.9326, 21.8587, 50.0942, 22.0941] },
  { name: "Bydgoszcz", bbox: [53.0501, 17.8742, 53.2093, 18.2026] },
  { name: "Olsztyn", bbox: [53.7242, 20.3665, 53.829, 20.5666] },
  { name: "Szczecin", bbox: [53.3217, 14.4438, 53.5377, 14.8054] },
  { name: "Kielce", bbox: [50.7933, 20.5105, 50.9151, 20.7206] },
  { name: "Białystok", bbox: [53.0666, 23.0658, 53.1886, 23.2472] },
  { name: "Zielona Góra", bbox: [51.8201, 15.4059, 52.0351, 15.6524] },
  { name: "Opole", bbox: [50.5876, 17.7799, 50.77, 18.0327] },
];

type OverpassElement = {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPubsForCity(
  city: (typeof CITIES)[number],
): Promise<OverpassElement[]> {
  const [minLat, minLon, maxLat, maxLon] = city.bbox;

  const query = `
[out:json][timeout:60];
(
  node["amenity"~"^(pub|bar|biergarten)$"](${minLat},${minLon},${maxLat},${maxLon});
  way["amenity"~"^(pub|bar|biergarten)$"](${minLat},${minLon},${maxLat},${maxLon});
);
out center tags;
`.trim();

  const mirrors = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ]

  const shuffled = mirrors.sort(() => Math.random() - 0.5);

  for (const mirror of shuffled) {
    const url = `${mirror}?data=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "pub-rater-app/1.0",
        Referer: "https://pub-rater.vercel.app/",
      },
    });

    if (res.ok) {
      const json = await res.json();
      return json.elements ?? [];
    }

    console.warn(`  Mirror ${mirror} returned ${res.status}, trying next...`);
  }

  throw new Error(`All mirrors failed for ${city.name}`);
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

async function seed() {
  // Check already seeded cities from places table
  const { data: existing } = await supabase.from('places').select('city')
  const seededCities = new Set(existing?.map((r) => r.city) ?? [])

  for (const city of CITIES) {
    if (seededCities.has(city.name)) {
      console.log(`Skipping ${city.name} (already seeded)`)
      continue
    }
    console.log(`Fetching ${city.name}...`);

    let elements: OverpassElement[] = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        elements = await fetchPubsForCity(city);
        break;
      } catch (err: any) {
        attempts++;
        console.warn(`Attempt ${attempts} failed for ${city.name}: ${err.message}`);
        if (attempts >= maxAttempts) {
          console.error(`Giving up on ${city.name} after ${maxAttempts} attempts.`);
          break;
        }
        await delay(3000 * attempts);
      }
    }

    if (elements.length === 0) continue;

    console.log(`  Found ${elements.length} places`);

    const valid = elements.filter((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      return lat !== undefined && lon !== undefined && el.tags?.name;
    });

    if (valid.length === 0) {
      console.log(`  No valid rows for ${city.name}, skipping`);
      continue;
    }

    // 1. Upsert core marker data
    const markerRows = valid.map((el) => {
      const tags = el.tags!;
      const lat = el.lat ?? el.center!.lat;
      const lon = el.lon ?? el.center!.lon;
      return {
        osm_id: el.id,
        name: tags.name,
        lat,
        lon,
        amenity: tags.amenity,
        outdoor_seating:
          tags.outdoor_seating === "yes"
            ? true
            : tags.outdoor_seating === "no"
              ? false
              : null,
      };
    });

    const { data: upsertedMarkers, error: markerError } = await supabase
      .from("markers")
      .upsert(markerRows, { onConflict: "osm_id" })
      .select("id, osm_id");

    if (markerError || !upsertedMarkers) {
      console.error(`  Marker insert error for ${city.name}:`, markerError?.message);
      continue;
    }

    // 2. Build and upsert place detail data
    const osmIdToMarkerId = new Map(upsertedMarkers.map((m) => [m.osm_id, m.id]));

    const placeRows = valid
      .map((el) => {
        const tags = el.tags!;
        const markerId = osmIdToMarkerId.get(el.id);
        if (!markerId) return null;
        return {
          marker_id: markerId,
          address: buildAddress(tags),
          phone: tags.phone ?? tags["contact:phone"] ?? null,
          website: tags.website ?? tags["contact:website"] ?? null,
          opening_hours: tags.opening_hours ?? null,
          city: city.name,
        };
      })
      .filter(Boolean);

    const { error: placeError } = await supabase
      .from("places")
      .upsert(placeRows, { onConflict: "marker_id" });

    if (placeError) {
      console.error(`  Place insert error for ${city.name}:`, placeError.message);
    } else {
      console.log(`  Inserted/updated ${placeRows.length} markers + places`);
    }

    await delay(5000);
  }

  console.log("Done!");
}

seed().catch(console.error);
