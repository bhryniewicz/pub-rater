"use client";

import { DoorOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFilters } from "@/context/filter-context";
import { colorGradient, lightenColor } from "@/lib/color";
import { ACCENT } from "@/lib/constants";
import { Tooltip } from "@/components/ui/tooltip";

const OPEN_GRADIENT_ID = "open-toggle-gradient";
const openBase = ACCENT.green;

export function OpenToggle({ className }: { className?: string }) {
  const t = useTranslations("pubList");
  const { filters, setFilter } = useFilters();
  const openFilterActive = filters.open;

  return (
    <Tooltip
      side="top"
      label={openFilterActive ? undefined : t("venuesOpen")}
      className={className}
    >
      <button
        type="button"
        role="switch"
        aria-checked={openFilterActive}
        onClick={() => setFilter("open", !openFilterActive)}
        style={
          openFilterActive ? { background: colorGradient(openBase) } : undefined
        }
        className={`relative flex items-center h-7 w-12 rounded-full border border-border transition-colors shrink-0 cursor-pointer ${
          openFilterActive ? "" : "bg-secondary"
        }`}
      >
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <linearGradient id={OPEN_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={lightenColor(openBase, 0.12)} />
              <stop offset="100%" stopColor={lightenColor(openBase, 0.32)} />
            </linearGradient>
          </defs>
        </svg>
        <span
          className={`flex items-center justify-center h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
            openFilterActive ? "translate-x-6" : "translate-x-1"
          }`}
        >
          <DoorOpen
            size={12}
            strokeWidth={2.5}
            style={
              openFilterActive
                ? { stroke: `url(#${OPEN_GRADIENT_ID})` }
                : undefined
            }
            className={openFilterActive ? "" : "text-muted-foreground"}
          />
        </span>
      </button>
    </Tooltip>
  );
}
