"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

async function fetchAdminCounts() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pendingRes, todayRes, weekRes, totalOwnerClaimsRes] = await Promise.all([
    supabase.from("requests").select("type, status").eq("status", "pending"),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase.rpc("count_new_users_by_week"),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("type", "owner_claim"),
  ]);

  if (pendingRes.error) throw pendingRes.error;
  if (todayRes.error) throw todayRes.error;
  if (weekRes.error) throw weekRes.error;
  if (totalOwnerClaimsRes.error) throw totalOwnerClaimsRes.error;

  const rows = pendingRes.data ?? [];
  const weekData = weekRes.data?.[0] ?? { this_week: 0, last_week: 0 };
  const thisWeek = Number(weekData.this_week);
  const lastWeek = Number(weekData.last_week);

  return {
    placeRequests: rows.filter((r) => r.type === "place_request").length,
    ownerClaims: rows.filter((r) => r.type === "owner_claim").length,
    totalOwnerClaims: totalOwnerClaimsRes.count ?? 0,
    todayRequests: todayRes.count ?? 0,
    newUsersThisWeek: thisWeek,
    newUsersWeekDelta: thisWeek - lastWeek,
  };
}

export function useAdminCounts() {
  return useSuspenseQuery({
    queryKey: QUERY_KEYS.ADMIN_COUNTS,
    queryFn: fetchAdminCounts,
  });
}
