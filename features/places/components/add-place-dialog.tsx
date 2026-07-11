"use client";

import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AddPlaceSchema, type AddPlaceValues } from "@/features/places/schemas";
import { useRequestPlace } from "@/features/requests/api/request-place";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { PlaceTypeIcon, PLACE_TYPE_FORM_LIST } from "@/features/places/place-type";
import {
  DAYS,
  type Day,
  type DayState,
  DEFAULT_DAYS,
  DAY_LABELS,
  stateToHours,
} from "@/lib/opening-hours/form";
import {
  TicketLayout,
  TicketSection,
  TICKET,
  TICKET_DASH_BORDER,
  TICKET_LABEL,
} from "@/components/forms/_layout/ticket-layout";

const LocationPickerMap = dynamic(
  () =>
    import("@/features/places/components/location-picker-map").then((m) => ({
      default: m.LocationPickerMap,
    })),
  { ssr: false },
);

// Simplified Poland border polygon — [lon, lat] pairs, ray-casting compatible.
const POLAND_BORDER: [number, number][] = [
  [14.12, 51.00],
  [14.12, 52.85],
  [14.12, 54.18],
  [14.55, 54.10],
  [15.55, 54.64],
  [16.52, 54.71],
  [17.52, 54.80],
  [18.33, 54.84],
  [19.07, 54.43],
  [20.00, 54.40],
  [22.75, 54.35],
  [23.48, 54.16],
  [23.95, 53.59],
  [23.81, 52.69],
  [24.14, 51.95],
  [24.09, 50.42],
  [23.64, 50.30],
  [22.73, 49.21],
  [21.14, 49.42],
  [20.09, 49.18],
  [18.85, 49.17],
  [18.20, 49.70],
  [17.88, 50.27],
  [16.99, 50.42],
  [16.21, 50.42],
  [15.98, 50.73],
  [15.27, 50.86],
  [14.99, 50.87],
  [14.82, 51.02],
  [14.47, 51.00],
  [14.29, 51.27],
  [14.12, 51.00],
];

function isInPoland(lat: number, lon: number): boolean {
  const poly = POLAND_BORDER;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (
      (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCenter?: { lat: number; lon: number };
};

export function AddPlaceDialog({ open, onOpenChange, initialCenter }: Props) {
  const [dayStates, setDayStates] = useState<Record<Day, DayState>>(DEFAULT_DAYS);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [outsidePoland, setOutsidePoland] = useState(false);
  const [nearestAddress, setNearestAddress] = useState<string | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<AddPlaceValues>({
    resolver: zodResolver(AddPlaceSchema),
    defaultValues: { name: "", address: "" },
  });

  const lat = form.watch("lat") as number | undefined;
  const lon = form.watch("lon") as number | undefined;

  useEffect(() => {
    if (lat == null || lon == null) {
      setNearestAddress(null);
      return;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=address&language=pl&limit=1&access_token=${token}`,
        );
        const data = (await res.json()) as { features?: { place_name: string }[] };
        setNearestAddress(data.features?.[0]?.place_name ?? null);
      } catch {
        setNearestAddress(null);
      }
    }, 800);
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [lat, lon]);

  const mutation = useRequestPlace();

  function onSubmit(values: AddPlaceValues) {
    if (outsidePoland) return;
    mutation.mutate(
      { ...values, opening_hours: stateToHours(dayStates) },
      {
        onSuccess: () => {
          handleClose(false);
          toast.success("Request submitted", {
            description: "An admin will review your suggestion shortly.",
          });
        },
      },
    );
  }

  function setDay(day: Day, patch: Partial<DayState>) {
    setDayStates((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function handleClose(value: boolean) {
    onOpenChange(value);
    if (!value) {
      form.reset();
      setDayStates(DEFAULT_DAYS);
      setMapModalOpen(false);
      setOutsidePoland(false);
      setNearestAddress(null);
    }
  }

  function handleLocationPick(newLat: number, newLon: number) {
    form.setValue("lat", newLat, { shouldValidate: true });
    form.setValue("lon", newLon, { shouldValidate: true });
    setOutsidePoland(!isInPoland(newLat, newLon));
  }

  const locationError = outsidePoland
    ? "Location must be within Poland"
    : form.formState.errors.lat?.message;

  return (
    <>
      <TicketLayout
        open={open}
        onOpenChange={handleClose}
        title="SUGGEST A PLACE"
        onClose={() => handleClose(false)}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-8 flex flex-col"
          >
            {/* Name */}
            <TicketSection label="VENUE NAME">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="e.g. THE RED LION"
                        className="font-mono font-bold uppercase bg-transparent border-0 border-b rounded-none focus-visible:ring-0 h-9 px-0 text-sm placeholder:opacity-30"
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />
            </TicketSection>

            {/* Category */}
            <div className="py-4" style={{ borderBottom: TICKET_DASH_BORDER }}>
              <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>
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
                                    backgroundColor: `${TICKET.ACCENT}25`,
                                    border: `1px solid ${TICKET.ACCENT}`,
                                    color: TICKET.TEXT,
                                  }
                                : {
                                    border: `1px dashed ${TICKET.ACCENT}70`,
                                    color: TICKET.MUTED,
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
            <div className="py-4" style={{ borderBottom: TICKET_DASH_BORDER }}>
              <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>
                ADDRESS <span style={{ opacity: 0.55 }}>(OPTIONAL)</span>
              </p>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="e.g. RYNEK GLOWNY 1, KRAKOW"
                        className="font-mono bg-transparent border-0 border-b rounded-none focus-visible:ring-0 h-9 px-0 text-sm placeholder:opacity-30"
                        style={{ borderColor: `${TICKET.ACCENT}60`, color: TICKET.TEXT }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-[9px] uppercase tracking-wider" />
                  </FormItem>
                )}
              />
              {nearestAddress && (
                <p
                  className="font-mono text-[9px] mt-1.5 leading-tight"
                  style={{ color: `${TICKET.MUTED}cc` }}
                >
                  NEAREST: {nearestAddress}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="py-4" style={{ borderBottom: TICKET_DASH_BORDER }}>
              <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>
                LOCATION
              </p>
              <button
                type="button"
                onClick={() => setMapModalOpen(true)}
                className="w-full mt-2 flex items-center justify-between rounded-sm px-3 py-2.5 font-mono text-xs transition-colors cursor-pointer"
                style={{
                  border: locationError
                    ? `1px dashed #b91c1c`
                    : `1px dashed ${TICKET.ACCENT}70`,
                  color: lat != null && lon != null ? TICKET.TEXT : TICKET.MUTED,
                  backgroundColor: "transparent",
                }}
              >
                {lat != null && lon != null ? (
                  <span>
                    {lat.toFixed(6)}, {lon.toFixed(6)}
                  </span>
                ) : (
                  <span style={{ opacity: 0.5 }}>CLICK TO PIN LOCATION</span>
                )}
                <span style={{ opacity: 0.4 }}>&#8599;</span>
              </button>
              {locationError && (
                <p className="font-mono text-[9px] uppercase tracking-wider text-red-700 mt-1">
                  {locationError}
                </p>
              )}
            </div>

            {/* Opening hours */}
            <div className="py-4" style={{ borderBottom: TICKET_DASH_BORDER }}>
              <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>
                OPENING HOURS <span style={{ opacity: 0.55 }}>(OPTIONAL)</span>
              </p>
              <div className="flex flex-col gap-1 mt-2">
                {DAYS.map((day) => {
                  const state = dayStates[day];
                  return (
                    <div key={day} className="flex items-center gap-2 min-h-8">
                      <label className="flex items-center gap-2 w-16 shrink-0 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={state.enabled}
                          onChange={(e) => setDay(day, { enabled: e.target.checked })}
                          style={{ accentColor: TICKET.ACCENT }}
                        />
                        <span
                          className="font-mono text-xs font-bold uppercase"
                          style={{ color: state.enabled ? TICKET.TEXT : TICKET.MUTED }}
                        >
                          {DAY_LABELS[day]}
                        </span>
                      </label>
                      {state.enabled && (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="time"
                            value={state.open}
                            onChange={(e) => setDay(day, { open: e.target.value })}
                            className="h-7 rounded-sm border px-2 py-1 font-mono text-xs outline-none"
                            style={{
                              borderColor: `${TICKET.ACCENT}80`,
                              backgroundColor: "transparent",
                              color: TICKET.TEXT,
                            }}
                          />
                          <span className="font-mono text-xs" style={{ color: TICKET.MUTED }}>
                            -
                          </span>
                          <input
                            type="time"
                            value={state.close}
                            onChange={(e) => setDay(day, { close: e.target.value })}
                            className="h-7 rounded-sm border px-2 py-1 font-mono text-xs outline-none"
                            style={{
                              borderColor: `${TICKET.ACCENT}80`,
                              backgroundColor: "transparent",
                              color: TICKET.TEXT,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {mutation.isError && (
              <div className="py-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-red-700 text-center">
                  FAILED TO SUBMIT - PLEASE TRY AGAIN
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="py-5">
              <button
                type="submit"
                disabled={mutation.isPending || outsidePoland}
                className="w-full py-4 font-mono font-black uppercase tracking-[0.3em] text-sm rounded-sm transition-opacity disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: TICKET.ACCENT, color: TICKET.BG }}
              >
                {mutation.isPending ? "SUBMITTING..." : "SUBMIT REQUEST"}
              </button>
            </div>
          </form>
        </Form>
      </TicketLayout>

      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent
          showCloseButton
          className="p-0 overflow-hidden"
          style={{
            width: "min(90vw, 800px)",
            height: "min(80vh, 600px)",
            maxWidth: "min(90vw, 800px)",
          }}
        >
          <DialogTitle className="sr-only">Pick location</DialogTitle>

          {outsidePoland && (
            <div className="absolute top-3 left-3 z-10 font-mono text-[10px] uppercase tracking-wider bg-red-700/90 text-white px-2.5 py-1 rounded pointer-events-none">
              OUTSIDE POLAND - MOVE PIN WITHIN POLAND
            </div>
          )}

          {lat != null && lon != null && (
            <span className="absolute bottom-3 left-3 z-10 text-xs font-mono bg-black/50 text-white/80 px-2 py-1 rounded pointer-events-none">
              {lat.toFixed(6)}, {lon.toFixed(6)}
            </span>
          )}

          <LocationPickerMap
            lat={lat ?? null}
            lon={lon ?? null}
            initialCenter={initialCenter}
            onChange={handleLocationPick}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
