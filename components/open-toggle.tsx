"use client";

import { Store, DoorOpen } from "lucide-react";
import { useFilters } from "@/context/filter-context";

export function OpenToggle({ className }: { className?: string }) {
  const { openFilterActive, setOpenFilterActive } = useFilters();

  return (
    <div
      className={`flex items-center rounded-lg border border-border bg-secondary p-0.5 shrink-0 ${className ?? ""}`}
    >
      <button
        onClick={() => setOpenFilterActive(false)}
        className={`p-1.5 rounded-md transition-colors ${
          !openFilterActive
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Store size={16} strokeWidth={2} />
      </button>
      <button
        onClick={() => setOpenFilterActive(true)}
        className={`p-1.5 rounded-md transition-colors ${
          openFilterActive
            ? "bg-open text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <DoorOpen size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
