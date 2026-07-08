"use client";

import { DoorOpen } from "lucide-react";
import { useFilters } from "@/context/filter-context";

export function OpenToggle({ className }: { className?: string }) {
  const { openFilterActive, setOpenFilterActive } = useFilters();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={openFilterActive}
      onClick={() => setOpenFilterActive(!openFilterActive)}
      className={`relative flex items-center h-7 w-12 rounded-full border border-border transition-colors shrink-0 cursor-pointer ${
        openFilterActive ? "bg-open" : "bg-secondary"
      } ${className ?? ""}`}
    >
      <span
        className={`flex items-center justify-center h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
          openFilterActive ? "translate-x-6" : "translate-x-1"
        }`}
      >
        <DoorOpen
          size={12}
          strokeWidth={2.5}
          className={openFilterActive ? "text-open" : "text-muted-foreground"}
        />
      </span>
    </button>
  );
}
