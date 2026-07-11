import type { OpeningHours } from "@/schemas";

export const DAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
export type Day = (typeof DAYS)[number];
export type DayState = { enabled: boolean; open: string; close: string };

export const DEFAULT_DAY_STATE: DayState = { enabled: false, open: "12:00", close: "23:00" };

export const DEFAULT_DAYS: Record<Day, DayState> = {
  mo: { enabled: false, open: "12:00", close: "23:00" },
  tu: { enabled: false, open: "12:00", close: "23:00" },
  we: { enabled: false, open: "12:00", close: "23:00" },
  th: { enabled: false, open: "12:00", close: "23:00" },
  fr: { enabled: false, open: "12:00", close: "23:00" },
  sa: { enabled: false, open: "12:00", close: "23:00" },
  su: { enabled: false, open: "12:00", close: "23:00" },
};

export const DAY_LABELS: Record<Day, string> = {
  mo: "Mon",
  tu: "Tue",
  we: "Wed",
  th: "Thu",
  fr: "Fri",
  sa: "Sat",
  su: "Sun",
};

export function hoursToState(hours: OpeningHours | null): Record<Day, DayState> {
  if (!hours) return { ...DEFAULT_DAYS };
  return DAYS.reduce((acc, day) => {
    const h = hours[day];
    acc[day] = h
      ? { enabled: true, open: h.open, close: h.close ?? "23:00" }
      : { enabled: false, open: "12:00", close: "23:00" };
    return acc;
  }, {} as Record<Day, DayState>);
}

export function stateToHours(days: Record<Day, DayState>): OpeningHours | null {
  const anyEnabled = DAYS.some((d) => days[d].enabled);
  if (!anyEnabled) return null;
  return {
    mo: days.mo.enabled ? { open: days.mo.open, close: days.mo.close || null } : null,
    tu: days.tu.enabled ? { open: days.tu.open, close: days.tu.close || null } : null,
    we: days.we.enabled ? { open: days.we.open, close: days.we.close || null } : null,
    th: days.th.enabled ? { open: days.th.open, close: days.th.close || null } : null,
    fr: days.fr.enabled ? { open: days.fr.open, close: days.fr.close || null } : null,
    sa: days.sa.enabled ? { open: days.sa.open, close: days.sa.close || null } : null,
    su: days.su.enabled ? { open: days.su.open, close: days.su.close || null } : null,
  };
}
