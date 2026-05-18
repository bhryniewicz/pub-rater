import { createClient } from "@supabase/supabase-js";
import { parseOsmOpeningHours } from "../lib/opening-hours";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PAGE_SIZE = 1000;

async function migrate() {
  let from = 0;
  let total = 0;
  let skipped = 0;

  while (true) {
    const { data, error } = await supabase
      .from("places")
      .select("id, opening_hours")
      .not("opening_hours", "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Fetch error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const parsed = parseOsmOpeningHours(row.opening_hours as string);
      if (!parsed) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("places")
        .update({ opening_hours_new: parsed })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Failed to update ${row.id}:`, updateError.message);
      } else {
        total++;
      }
    }

    console.log(`Processed ${from + data.length} rows...`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Done. Updated: ${total}, skipped (unparseable): ${skipped}`);
}

migrate().catch(console.error);
