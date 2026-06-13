"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AddPlaceSchema, type AddPlaceValues, type OpeningHours, type PlaceRequest } from "@/lib/schemas";
import { useResubmitPlaceRequest } from "@/features/places/api/resubmit-place-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const LocationPickerMap = dynamic(
  () =>
    import("@/components/location-picker-map").then((m) => ({
      default: m.LocationPickerMap,
    })),
  { ssr: false },
);


const DAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
type Day = (typeof DAYS)[number];

const DAY_T_KEYS: Record<Day, string> = {
  mo: "mon", tu: "tue", we: "wed", th: "thu", fr: "fri", sa: "sat", su: "sun",
};

type DayState = { enabled: boolean; open: string; close: string };

function buildOpeningHours(days: Record<Day, DayState>): OpeningHours | null {
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

function hoursToState(hours: OpeningHours | null): Record<Day, DayState> {
  const defaults: DayState = { enabled: false, open: "12:00", close: "23:00" };
  if (!hours) {
    return { mo: defaults, tu: defaults, we: defaults, th: defaults, fr: defaults, sa: defaults, su: defaults };
  }
  return DAYS.reduce((acc, day) => {
    const h = hours[day];
    acc[day] = h
      ? { enabled: true, open: h.open, close: h.close ?? "23:00" }
      : { enabled: false, open: "12:00", close: "23:00" };
    return acc;
  }, {} as Record<Day, DayState>);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PlaceRequest;
};

export function ResubmitPlaceDialog({ open, onOpenChange, request }: Props) {
  const t = useTranslations("resubmit");
  const tCommon = useTranslations("common");
  const AMENITIES = [
    { value: "pub" as const, label: t("pub"), icon: "🍺" },
    { value: "bar" as const, label: t("bar"), icon: "🥂" },
    { value: "biergarten" as const, label: t("beerGarden"), icon: "🌻" },
  ];
  const [dayStates, setDayStates] = useState<Record<Day, DayState>>(
    () => hoursToState(request.opening_hours),
  );

  const form = useForm<AddPlaceValues>({
    resolver: zodResolver(AddPlaceSchema),
    defaultValues: {
      name: request.name,
      place_type: request.place_type as AddPlaceValues["place_type"],
      address: request.address ?? "",
      lat: request.lat,
      lon: request.lon,
    },
  });

  const lat = form.watch("lat") as number | undefined;
  const lon = form.watch("lon") as number | undefined;

  const mutation = useResubmitPlaceRequest();

  function onSubmit(values: AddPlaceValues) {
    mutation.mutate(
      { ...values, opening_hours: buildOpeningHours(dayStates), requestId: request.id },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  function setDay(day: Day, patch: Partial<DayState>) {
    setDayStates((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex flex-1 min-h-0 h-[600px]">
          {/* Left: map */}
          <div className="flex-1 relative min-h-0">
            <LocationPickerMap
              lat={lat ?? null}
              lon={lon ?? null}
              initialCenter={lat != null && lon != null ? { lat, lon } : undefined}
              onChange={(newLat, newLon) => {
                form.setValue("lat", newLat, { shouldValidate: true });
                form.setValue("lon", newLon, { shouldValidate: true });
              }}
            />
            {lat != null && lon != null && (
              <p className="absolute top-2 left-2 text-xs bg-primary rounded px-2 py-0.5 text-white dark:text-black font-medium">
                {lat.toFixed(5)}, {lon.toFixed(5)}
              </p>
            )}
            {form.formState.errors.lat && (
              <p className="absolute top-2 left-2 text-xs text-destructive bg-background/80 rounded px-2 py-0.5">
                {form.formState.errors.lat.message}
              </p>
            )}
          </div>

          {/* Right: form */}
          <div className="w-[420px] shrink-0 flex flex-col overflow-y-auto">
            <div className="p-6 pb-0">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">{t("title")}</DialogTitle>
              </DialogHeader>
              {request.admin_comment && (
                <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-[11px] text-blue-400 uppercase tracking-widest mb-1">{t("adminMessage")}</p>
                  <p className="text-sm text-foreground/90">{request.admin_comment}</p>
                </div>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 p-6 pt-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nameLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("namePlaceholder")} className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="place_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("categoryLabel")}</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          {AMENITIES.map((a) => (
                            <button
                              key={a.value}
                              type="button"
                              onClick={() => field.onChange(a.value)}
                              className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                                field.value === a.value
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-input bg-transparent text-muted-foreground hover:border-ring hover:text-foreground"
                              }`}
                            >
                              <span className="text-xl">{a.icon}</span>
                              <span>{a.label}</span>
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("addressLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("addressPlaceholder")} className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">
                    {t("openingHoursLabel")}
                  </span>
                  <div className="flex flex-col gap-1">
                    {DAYS.map((day) => {
                      const state = dayStates[day];
                      return (
                        <div key={day} className="flex items-center gap-2 min-h-8">
                          <label className="flex items-center gap-2 w-16 shrink-0 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={state.enabled}
                              onChange={(e) => setDay(day, { enabled: e.target.checked })}
                              className="accent-primary"
                            />
                            <span className="text-sm text-foreground">{t(DAY_T_KEYS[day] as "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")}</span>
                          </label>
                          {state.enabled ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="time"
                                value={state.open}
                                onChange={(e) => setDay(day, { open: e.target.value })}
                                className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm text-foreground outline-none focus-visible:border-ring"
                              />
                              <span className="text-muted-foreground text-sm">–</span>
                              <input
                                type="time"
                                value={state.close}
                                onChange={(e) => setDay(day, { close: e.target.value })}
                                className="h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-sm text-foreground outline-none focus-visible:border-ring"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t("closed")}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {mutation.isError && (
                  <p className="text-sm text-red-400 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
                    {t("failed")}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? t("submitting") : t("resubmitButton")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
