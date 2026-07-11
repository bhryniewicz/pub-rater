"use client";

import { DAYS, DAY_LABELS as DEFAULT_DAY_LABELS } from "@/lib/opening-hours/form";
import type { Day, DayState } from "@/lib/opening-hours/form";

type Props = {
  days: Record<Day, DayState>;
  onDayChange: (day: Day, patch: Partial<DayState>) => void;
  dayLabels?: Record<Day, string>;
  label?: string;
};

export function OpeningHoursField({ days, onDayChange, dayLabels, label }: Props) {
  const labels = dayLabels ?? DEFAULT_DAY_LABELS;

  return (
    <div className="flex flex-col gap-2">
      {label !== undefined ? (
        <span className="text-sm font-medium">{label}</span>
      ) : (
        <span className="text-sm font-medium">Opening hours</span>
      )}
      <div className="flex flex-col gap-1">
        {DAYS.map((day) => {
          const state = days[day];
          return (
            <div key={day} className="flex items-center gap-2 min-h-8">
              <label className="flex items-center gap-2 w-16 shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={state.enabled}
                  onChange={(e) => onDayChange(day, { enabled: e.target.checked })}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">{labels[day]}</span>
              </label>
              {state.enabled && (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="time"
                    value={state.open}
                    onChange={(e) => onDayChange(day, { open: e.target.value })}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm text-foreground outline-none focus-visible:border-ring"
                  />
                  <span className="text-muted-foreground text-sm">–</span>
                  <input
                    type="time"
                    value={state.close}
                    onChange={(e) => onDayChange(day, { close: e.target.value })}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm text-foreground outline-none focus-visible:border-ring"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
