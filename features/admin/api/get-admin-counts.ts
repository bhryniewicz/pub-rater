"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";

async function fetchAdminCounts() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Weekend start = most recent Saturday 00:00 local time
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysToLastSat = day === 6 ? 0 : day === 0 ? 1 : day + 1;
  const weekendStart = new Date(now);
  weekendStart.setDate(now.getDate() - daysToLastSat);
  weekendStart.setHours(0, 0, 0, 0);

  const [pendingRes, todayRes, weekRes, totalOwnerClaimsRes, totalUsersRes, weekendRequestsRes, totalRequestsRes] = await Promise.all([
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
    supabase.rpc("count_total_users"),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekendStart.toISOString()),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true }),
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
    totalUsers: Number(totalUsersRes.data ?? 0),
    totalRequests: totalRequestsRes.count ?? 0,
    weekendRequests: weekendRequestsRes.count ?? 0,
  };
}

export const getAdminCountsQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.ADMIN_COUNTS,
    queryFn: fetchAdminCounts,
  });

export function useAdminCounts() {
  return useSuspenseQuery(getAdminCountsQueryOptions());
}
