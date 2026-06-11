"use client";

import { useTranslations } from "next-intl";
import { useFilters } from "@/context/filter-context";

export function OpenToggle({ className }: { className?: string }) {
  const t = useTranslations("openToggle");
  const { openFilterActive, setOpenFilterActive } = useFilters();

  return (
    <div
      className={`flex items-center rounded-lg border border-border bg-secondary p-0.5 text-xs font-semibold shrink-0 ${className ?? ""}`}
    >
      <button
        onClick={() => setOpenFilterActive(false)}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          !openFilterActive
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("all")}
      </button>
      <button
        onClick={() => setOpenFilterActive(true)}
        className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
          openFilterActive
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-open shrink-0" />
        {t("open")}
      </button>
    </div>
  );
}
