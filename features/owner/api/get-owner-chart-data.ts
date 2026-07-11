"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";

export type ChartDay = {
  label: string;
  comments: number;
};

function buildEmptyDays(): ChartDay[] {
  const days: ChartDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en", { weekday: "short" }),
      comments: 0,
    });
  }
  return days;
}

async function fetchOwnerChartData(): Promise<ChartDay[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return buildEmptyDays();

  const { data: markers, error: markersError } = await supabase
    .from("markers")
    .select("id")
    .eq("owner_id", session.user.id);

  if (markersError) throw markersError;

  const markerIds = (markers ?? []).map((m) => m.id);
  const days = buildEmptyDays();
  if (markerIds.length === 0) return days;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("reviews")
    .select("created_at")
    .in("marker_id", markerIds)
    .not("comment", "is", null)
    .gte("created_at", sevenDaysAgo.toISOString());

  if (error) throw error;

  for (const review of data ?? []) {
    const d = new Date(review.created_at);
    const label = d.toLocaleDateString("en", { weekday: "short" });
    const day = days.find((x) => x.label === label);
    if (day) day.comments++;
  }

  return days;
}

export const getOwnerChartDataQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.OWNER_CHART_DATA,
    queryFn: fetchOwnerChartData,
  });

export function useOwnerChartData() {
  return useSuspenseQuery(getOwnerChartDataQueryOptions());
}
