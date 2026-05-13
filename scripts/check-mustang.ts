// Quick check: does "Mustang" pub exist in Overpass API?

async function checkMustang() {
  // Poland bounding box: minLat, minLon, maxLat, maxLon
  const POLAND_BBOX = "49.0,14.1,54.9,24.2";

  const query = `
[out:json][timeout:30];
(
  node["amenity"~"^(pub|bar|biergarten)$"]["name"~"Mustang",i](${POLAND_BBOX});
  way["amenity"~"^(pub|bar|biergarten)$"]["name"~"Mustang",i](${POLAND_BBOX});
);
out center tags;
`.trim();

  const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;

  console.log("Querying Overpass for 'Mustang' pubs/bars in Poland...\n");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "pub-rater-app/1.0",
      Referer: "https://pub-rater.vercel.app/",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Overpass error: ${res.status}\n${body}`);
  }

  const json = await res.json();
  const elements = json.elements ?? [];

  if (elements.length === 0) {
    console.log("No results found.");
    return;
  }

  console.log(`Found ${elements.length} result(s):\n`);
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    console.log(`- [${el.type} ${el.id}] ${tags.name}`);
    console.log(`  amenity: ${tags.amenity}`);
    console.log(`  lat/lon: ${lat}, ${lon}`);
    if (tags["addr:city"]) console.log(`  city: ${tags["addr:city"]}`);
    if (tags["addr:street"]) console.log(`  street: ${tags["addr:street"]} ${tags["addr:housenumber"] ?? ""}`);
    console.log();
  }
}

checkMustang().catch(console.error);
