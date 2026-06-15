"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useAdminCounts } from "@/features/admin/api/get-admin-counts";
import { useRecentRequests } from "@/features/admin/api/get-recent-requests";
import { PlaceTypeIcon, PLACE_TYPE_LABELS } from "@/features/places/place-type";
import { LuMapPin, LuShield, LuUsers, LuList } from "react-icons/lu";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  approved: "bg-green-500/15 text-green-400 border border-green-500/20",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/20",
};

export function OverviewSection() {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();

  const { data: counts } = useAdminCounts();
  const { data: recentRequests } = useRecentRequests();

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel("admin:overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECENT_REQUESTS });
          }, 300);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const {
    placeRequests: placeRequestCount,
    ownerClaims: ownerClaimCount,
    totalOwnerClaims,
    totalUsers,
    newUsersWeekDelta,
    todayRequests: todayRequestCount,
    totalRequests,
    weekendRequests,
  } = counts;

  const kpis = [
    {
      value: placeRequestCount + ownerClaimCount,
      icon: <LuMapPin size={20} />,
      label: t("pendingRequests"),
      sub: t("todayCount", { count: todayRequestCount }),
      subColor: "text-amber-400",
    },
    {
      value: totalOwnerClaims,
      icon: <LuShield size={20} />,
      label: t("ownershipClaims"),
      sub: t("awaitingCount", { count: ownerClaimCount }),
      subColor: "text-blue-400",
    },
    {
      value: totalUsers,
      icon: <LuUsers size={20} />,
      label: t("totalUsers"),
      sub: newUsersWeekDelta === 0
        ? t("sameAsLastWk")
        : t("vsLastWk", { delta: newUsersWeekDelta > 0 ? `+${newUsersWeekDelta}` : String(newUsersWeekDelta) }),
      subColor: newUsersWeekDelta > 0 ? "text-green-400" : newUsersWeekDelta < 0 ? "text-red-400" : "text-muted-foreground",
    },
    {
      value: totalRequests,
      icon: <LuList size={20} />,
      label: t("allRequestsKpi"),
      sub: t("thisWeekendCount", { count: weekendRequests }),
      subColor: "text-primary",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
      {/* KPI cards — 1 col mobile, 2 col sm, 4 col xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-2 text-primary mb-3">
              {kpi.icon}
              <p className="text-xs font-medium">{kpi.label}</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
            {kpi.sub && (
              <p className={`text-xs mt-0.5 ${kpi.subColor}`}>{kpi.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Pending queue */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t("pendingQueue")}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left px-5 py-2.5 font-medium">{t("place")}</th>
                <th className="text-left px-3 py-2.5 font-medium">{t("type")}</th>
                <th className="text-left px-3 py-2.5 font-medium">{t("submitted")}</th>
                <th className="text-left px-3 py-2.5 font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                    {t("noPending")}
                  </td>
                </tr>
              ) : (
                recentRequests.map((req) => {
                  const placeType = req.type === "place_request" ? (req.place_type ?? "") : "";
                  const label = PLACE_TYPE_LABELS[placeType] ?? placeType;
                  return (
                    <tr key={req.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {req.type === "place_request"
                          ? req.name
                          : `Claim: ${req.marker_id.slice(0, 8)}`}
                      </td>
                      <td className="px-3 py-3">
                        {placeType && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
                            <PlaceTypeIcon placeType={placeType} size={12} /> {label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status] ?? "bg-secondary text-muted-foreground"}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
