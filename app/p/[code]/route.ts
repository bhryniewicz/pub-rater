import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("places")
    .select("marker_id")
    .eq("short_code", code)
    .single();

  if (!data) {
    return NextResponse.redirect(new URL("/", _req.url));
  }

  return NextResponse.redirect(new URL(`/places/${data.marker_id}`, _req.url));
}
