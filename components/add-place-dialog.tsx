"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPlace } from "@/app/actions/request-place";
import { AddPlaceSchema, type AddPlaceValues, type OpeningHours } from "@/lib/schemas";
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

const AMENITIES = [
  { value: "pub", label: "Pub", icon: "🍺" },
  { value: "bar", label: "Bar", icon: "🥂" },
  { value: "biergarten", label: "Beer Garden", icon: "🌻" },
] as const;

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
    mo: days.mo.enabled ? { open: days.mo.open, close: days.mo.close || null } : null,
    tu: days.tu.enabled ? { open: days.tu.open, close: days.tu.close || null } : null,
    we: days.we.enabled ? { open: days.we.open, close: days.we.close || null } : null,
    th: days.th.enabled ? { open: days.th.open, close: days.th.close || null } : null,
    fr: days.fr.enabled ? { open: days.fr.open, close: days.fr.close || null } : null,
    sa: days.sa.enabled ? { open: days.sa.open, close: days.sa.close || null } : null,
    su: days.su.enabled ? { open: days.su.open, close: days.su.close || null } : null,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCenter?: { lat: number; lon: number };
};

export function AddPlaceDialog({ open, onOpenChange, initialCenter }: Props) {
  const queryClient = useQueryClient();
  const [dayStates, setDayStates] = useState<Record<Day, DayState>>(DEFAULT_DAYS);

  const form = useForm<AddPlaceValues>({
    resolver: zodResolver(AddPlaceSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

  const lat = form.watch("lat") as number | undefined;
  const lon = form.watch("lon") as number | undefined;

  const mutation = useMutation({
    mutationFn: (values: AddPlaceValues & { opening_hours: OpeningHours | null }) =>
      requestPlace(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      handleClose(false);
      toast.success("Request submitted", {
        description: "An admin will review your suggestion shortly.",
      });
    },
  });

  function onSubmit(values: AddPlaceValues) {
    mutation.mutate({ ...values, opening_hours: buildOpeningHours(dayStates) });
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
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex flex-1 min-h-0 h-[600px]">
          {/* Left: map */}
          <div className="flex-1 relative min-h-0">
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
                <DialogTitle className="text-base font-semibold">Suggest a place</DialogTitle>
              </DialogHeader>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 p-6 pt-5">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. The Red Lion" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="amenity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
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

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Address{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 12 High Street, London" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Opening hours */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">
                    Opening hours{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
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
                            <span className="text-sm text-foreground">{DAY_LABELS[day]}</span>
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
                            <span className="text-xs text-muted-foreground">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {mutation.isError && (
                  <p className="text-sm text-red-400 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
                    Failed to submit request. Please try again.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClose(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Submitting…" : "Submit request"}
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
