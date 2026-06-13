"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AddPlaceSchema,
  type AddPlaceValues,
  type OpeningHours,
} from "@/lib/schemas";
import { useCreatePlaceRequest } from "@/features/places/api/create-place-request";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { PlaceTypeIcon, PLACE_TYPE_FORM_LIST } from "@/lib/place-type";

const LocationPickerMap = dynamic(
  () =>
    import("@/components/location-picker-map").then((m) => ({
      default: m.LocationPickerMap,
    })),
  { ssr: false },
);

const DAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  mo: "Mon",
  tu: "Tue",
  we: "Wed",
  th: "Thu",
  fr: "Fri",
  sa: "Sat",
  su: "Sun",
};

type DayState = { enabled: boolean; open: string; close: string };

const DEFAULT_DAYS: Record<Day, DayState> = {
  mo: { enabled: false, open: "12:00", close: "23:00" },
  tu: { enabled: false, open: "12:00", close: "23:00" },
  we: { enabled: false, open: "12:00", close: "23:00" },
  th: { enabled: false, open: "12:00", close: "23:00" },
  fr: { enabled: false, open: "12:00", close: "23:00" },
  sa: { enabled: false, open: "12:00", close: "23:00" },
  su: { enabled: false, open: "12:00", close: "23:00" },
};

function buildOpeningHours(days: Record<Day, DayState>): OpeningHours | null {
  const anyEnabled = DAYS.some((d) => days[d].enabled);
  if (!anyEnabled) return null;
  return {
    mo: days.mo.enabled
      ? { open: days.mo.open, close: days.mo.close || null }
      : null,
    tu: days.tu.enabled
      ? { open: days.tu.open, close: days.tu.close || null }
      : null,
    we: days.we.enabled
      ? { open: days.we.open, close: days.we.close || null }
      : null,
    th: days.th.enabled
      ? { open: days.th.open, close: days.th.close || null }
      : null,
    fr: days.fr.enabled
      ? { open: days.fr.open, close: days.fr.close || null }
      : null,
    sa: days.sa.enabled
      ? { open: days.sa.open, close: days.sa.close || null }
      : null,
    su: days.su.enabled
      ? { open: days.su.open, close: days.su.close || null }
      : null,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCenter?: { lat: number; lon: number };
};

const BG = "#faf3e6";
const ACCENT = "#c9a87c";
const TEXT = "#1a1209";
const MUTED = "#8a7355";

// Dark teeth pointing DOWN — sits at the very top of the cream dialog,
// mimicking the jagged dark border seen in the reference guest-check design.
function SerratedTop() {
  const toothW = 16;
  const count = 60;
  const total = count * toothW;
  const barH = 8; // solid dark strip above the teeth
  const tipY = 28; // how far the teeth extend downward

  // Solid bar across the top, then zigzag going right-to-left along the teeth
  let d = `M0,0 L${total},0 L${total},${barH}`;
  for (let i = count - 1; i >= 0; i--) {
    const x = i * toothW;
    d += ` L${x + toothW / 2},${tipY} L${x},${barH}`;
  }
  d += " Z";

  return (
    <svg
      viewBox={`0 0 ${total} ${tipY}`}
      preserveAspectRatio="none"
      style={{ display: "block", height: tipY }}
      className="w-full"
    >
      <path d={d} fill={TEXT} />
    </svg>
  );
}

// Cream teeth pointing DOWN — sits at the bottom of the dialog and overflows
// below, giving the "torn receipt" bottom edge on the dark backdrop.
function SerratedBottom() {
  const toothW = 16;
  const count = 60;
  const total = count * toothW;
  const barH = 8;
  const tipY = 28;

  let d = `M0,${tipY} L0,${barH}`;
  for (let i = 0; i < count; i++) {
    const x = i * toothW;
    d += ` L${x},${barH} L${x + toothW / 2},0 L${x + toothW},${barH}`;
  }
  d += ` L${total},${tipY} Z`;
  return (
    <svg
      viewBox={`0 0 ${total} ${tipY}`}
      preserveAspectRatio="none"
      style={{ display: "block", height: tipY }}
      className="w-full"
    >
      <path d={d} fill={BG} />
    </svg>
  );
}

function Barcode() {
  const bars = [
    2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 2, 1, 2, 4, 1, 2, 3, 1,
    2, 1, 4, 2, 1, 3, 1, 2,
  ];
  return (
    <div className="flex items-center justify-center gap-px px-12 h-10">
      {bars.map((w, i) => (
        <div
          key={i}
          style={{ width: w * 3, backgroundColor: TEXT }}
          className="h-full"
        />
      ))}
    </div>
  );
}

const LABEL = `font-mono text-[9px] font-bold uppercase tracking-[0.2em]`;
const DASH_BORDER = `1px dashed ${ACCENT}80`;

export function AddPlaceDialog({ open, onOpenChange, initialCenter }: Props) {
  const [dayStates, setDayStates] =
    useState<Record<Day, DayState>>(DEFAULT_DAYS);

  const form = useForm<AddPlaceValues>({
    resolver: zodResolver(AddPlaceSchema),
    defaultValues: { name: "", address: "" },
  });

  const lat = form.watch("lat") as number | undefined;
  const lon = form.watch("lon") as number | undefined;

  const mutation = useCreatePlaceRequest();

  function onSubmit(values: AddPlaceValues) {
    mutation.mutate({ ...values, opening_hours: buildOpeningHours(dayStates) }, {
      onSuccess: () => {
        handleClose(false);
        toast.success("Request submitted", {
          description: "An admin will review your suggestion shortly.",
        });
      },
    });
  }

  function setDay(day: Day, patch: Partial<DayState>) {
    setDayStates((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function handleClose(value: boolean) {
    onOpenChange(value);
    if (!value) {
      form.reset();
      setDayStates(DEFAULT_DAYS);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 sm:max-w-5xl border-0 rounded-none shadow-2xl overflow-visible [&>button]:hidden"
        style={{ backgroundColor: BG }}
      >
        <DialogTitle className="sr-only">Suggest a place</DialogTitle>

        <SerratedTop />

        {/* Two columns: form left, map right */}
        <div className="flex h-[640px]">
          {/* LEFT: form fields */}
          <div
            className="flex-1 min-w-0 overflow-y-auto flex flex-col"
            style={{ borderRight: DASH_BORDER }}
          >
            {/* Title */}
            <div
              className="px-8 pt-8 pb-5 text-center"
              style={{ borderBottom: DASH_BORDER }}
            >
              <h2
                className="font-mono font-black uppercase tracking-[0.35em] text-2xl"
                style={{ color: TEXT }}
              >
                SUGGEST A PLACE
              </h2>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="px-8 flex flex-col"
              >
                {/* Name */}
                <div className="py-4" style={{ borderBottom: DASH_BORDER }}>
                  <p className={LABEL} style={{ color: MUTED }}>
                    VENUE NAME
                  </p>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="e.g. THE RED LION"
                            className="font-mono font-bold uppercase bg-transparent border-0 border-b rounded-none focus-visible:ring-0 h-9 px-0 text-sm placeholder:opacity-30"
                            style={{ borderColor: `${ACCENT}60`, color: TEXT }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Category */}
                <div className="py-4" style={{ borderBottom: DASH_BORDER }}>
                  <p className={LABEL} style={{ color: MUTED }}>
                    CATEGORY
                  </p>
                  <FormField
                    control={form.control}
                    name="place_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-2 mt-2">
                            {PLACE_TYPE_FORM_LIST.map((a) => (
                              <button
                                key={a.value}
                                type="button"
                                onClick={() => field.onChange(a.value)}
                                className="flex flex-1 flex-col items-center gap-1 rounded-sm py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                                style={
                                  field.value === a.value
                                    ? {
                                        backgroundColor: `${ACCENT}25`,
                                        border: `1px solid ${ACCENT}`,
                                        color: TEXT,
                                      }
                                    : {
                                        border: `1px dashed ${ACCENT}70`,
                                        color: MUTED,
                                        backgroundColor: "transparent",
                                      }
                                }
                              >
                                <PlaceTypeIcon placeType={a.value} size={18} />
                                <span>{a.label}</span>
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address */}
                <div className="py-4" style={{ borderBottom: DASH_BORDER }}>
                  <p className={LABEL} style={{ color: MUTED }}>
                    ADDRESS <span style={{ opacity: 0.55 }}>(OPTIONAL)</span>
                  </p>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="e.g. 12 HIGH STREET, LONDON"
                            className="font-mono bg-transparent border-0 border-b rounded-none focus-visible:ring-0 h-9 px-0 text-sm placeholder:opacity-30"
                            style={{ borderColor: `${ACCENT}60`, color: TEXT }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Opening hours */}
                <div className="py-4" style={{ borderBottom: DASH_BORDER }}>
                  <p className={LABEL} style={{ color: MUTED }}>
                    OPENING HOURS{" "}
                    <span style={{ opacity: 0.55 }}>(OPTIONAL)</span>
                  </p>
                  <div className="flex flex-col gap-1 mt-2">
                    {DAYS.map((day) => {
                      const state = dayStates[day];
                      return (
                        <div
                          key={day}
                          className="flex items-center gap-2 min-h-8"
                        >
                          <label className="flex items-center gap-2 w-16 shrink-0 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={state.enabled}
                              onChange={(e) =>
                                setDay(day, { enabled: e.target.checked })
                              }
                              style={{ accentColor: ACCENT }}
                            />
                            <span
                              className="font-mono text-xs font-bold uppercase"
                              style={{ color: state.enabled ? TEXT : MUTED }}
                            >
                              {DAY_LABELS[day]}
                            </span>
                          </label>
                          {state.enabled ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="time"
                                value={state.open}
                                onChange={(e) =>
                                  setDay(day, { open: e.target.value })
                                }
                                className="h-7 rounded-sm border px-2 py-1 font-mono text-xs outline-none"
                                style={{
                                  borderColor: `${ACCENT}80`,
                                  backgroundColor: "transparent",
                                  color: TEXT,
                                }}
                              />
                              <span
                                className="font-mono text-xs"
                                style={{ color: MUTED }}
                              >
                                –
                              </span>
                              <input
                                type="time"
                                value={state.close}
                                onChange={(e) =>
                                  setDay(day, { close: e.target.value })
                                }
                                className="h-7 rounded-sm border px-2 py-1 font-mono text-xs outline-none"
                                style={{
                                  borderColor: `${ACCENT}80`,
                                  backgroundColor: "transparent",
                                  color: TEXT,
                                }}
                              />
                            </div>
                          ) : (
                            <span
                              className="font-mono text-[10px] uppercase tracking-wider line-through"
                              style={{ color: MUTED }}
                            >
                              CLOSED
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {mutation.isError && (
                  <div className="py-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-red-700 text-center">
                      FAILED TO SUBMIT — PLEASE TRY AGAIN
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="py-5 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full py-4 font-mono font-black uppercase tracking-[0.3em] text-sm rounded-sm transition-opacity disabled:opacity-60 cursor-pointer"
                    style={{ backgroundColor: ACCENT, color: BG }}
                  >
                    {mutation.isPending ? "SUBMITTING…" : "SUBMIT REQUEST"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="font-mono text-[9px] uppercase tracking-[0.25em] py-2 text-center cursor-pointer"
                    style={{ color: MUTED }}
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </Form>

            {/* Barcode footer */}
            <div className="mt-auto py-4" style={{ borderTop: DASH_BORDER }}>
              <Barcode />
            </div>
          </div>

          {/* RIGHT: map, full height */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div
              className="px-6 py-4 text-center"
              style={{ borderBottom: DASH_BORDER }}
            >
              <p className={LABEL} style={{ color: MUTED }}>
                PIN LOCATION
              </p>
            </div>

            {/* Map fills remaining height */}
            <div className="flex-1 relative">
              <LocationPickerMap
                lat={lat ?? null}
                lon={lon ?? null}
                initialCenter={initialCenter}
                onChange={(newLat, newLon) => {
                  form.setValue("lat", newLat, { shouldValidate: true });
                  form.setValue("lon", newLon, { shouldValidate: true });
                }}
              />
              {lat != null && lon != null && (
                <p
                  className="absolute top-2 left-2 font-mono text-[9px] rounded px-2 py-0.5"
                  style={{ backgroundColor: ACCENT, color: BG }}
                >
                  {lat.toFixed(5)}, {lon.toFixed(5)}
                </p>
              )}
              {form.formState.errors.lat && (
                <p className="absolute top-2 left-2 font-mono text-[9px] text-red-700 bg-white/90 rounded px-2 py-0.5">
                  {form.formState.errors.lat.message}
                </p>
              )}
            </div>

            <div
              className="px-6 py-3 text-center"
              style={{ borderTop: DASH_BORDER }}
            >
              <p
                className="font-mono text-[9px]"
                style={{ color: `${MUTED}99` }}
              >
                CLICK MAP TO SET LOCATION
              </p>
            </div>
          </div>
        </div>

        <SerratedBottom />
      </DialogContent>
    </Dialog>
  );
}
