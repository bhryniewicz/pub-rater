"use client";

import { useTranslations } from "next-intl";
import { usePlaceRequests } from "@/features/admin/api/get-place-requests";
import { PlaceTypeIcon, PLACE_TYPE_LABELS } from "@/lib/place-type";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  approved: "bg-green-500/15 text-green-400 border border-green-500/20",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/20",
  need_more_info: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
};

export function AllPlaceRequestsSection() {
  const t = useTranslations("admin");
  const { data: requests } = usePlaceRequests();

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-1">{t("allRequests")}</h1>
      <p className="text-xs text-muted-foreground mb-6">{t("allRequestsSubtitle")}</p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
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
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                    {t("noRequests")}
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const label = PLACE_TYPE_LABELS[req.place_type] ?? req.place_type;
                  return (
                    <tr key={req.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">{req.name}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
                          <PlaceTypeIcon placeType={req.place_type} size={12} /> {label}
                        </span>
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
