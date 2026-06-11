"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editPlace } from "@/app/actions/edit-place";
import { EditPlaceSchema, type EditPlaceValues, type OpeningHours } from "@/lib/schemas";
import type { Place } from "@/lib/supabase";
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

const AMENITIES = [
  { value: "pub", label: "Pub", icon: "🍺" },
  { value: "bar", label: "Bar", icon: "🥂" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "cafe", label: "Cafe", icon: "☕" },
  { value: "nightclub", label: "Nightclub", icon: "🎶" },
  { value: "biergarten", label: "Beer Garden", icon: "🌻" },
] as const;

const DAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  mo: "Mon", tu: "Tue", we: "Wed", th: "Thu", fr: "Fri", sa: "Sat", su: "Sun",
};

type DayState = { enabled: boolean; open: string; close: string };

function hoursToState(hours: OpeningHours | null): Record<Day, DayState> {
  const defaults: Record<Day, DayState> = {
    mo: { enabled: false, open: "12:00", close: "23:00" },
    tu: { enabled: false, open: "12:00", close: "23:00" },
    we: { enabled: false, open: "12:00", close: "23:00" },
    th: { enabled: false, open: "12:00", close: "23:00" },
    fr: { enabled: false, open: "12:00", close: "23:00" },
    sa: { enabled: false, open: "12:00", close: "23:00" },
    su: { enabled: false, open: "12:00", close: "23:00" },
  };

  if (!hours) return defaults;

  for (const day of DAYS) {
    const slot = hours[day];
    if (slot) {
      defaults[day] = { enabled: true, open: slot.open, close: slot.close ?? "" };
    }
  }
  return defaults;
}

function stateToHours(days: Record<Day, DayState>): OpeningHours | null {
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
  markerId: string;
  markerName: string;
  markerAmenity: string;
  place: Place | null;
};

export function EditPlaceDialog({
  open,
  onOpenChange,
  markerId,
  markerName,
  markerAmenity,
  place,
}: Props) {
  const t = useTranslations("places");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [dayStates, setDayStates] = useState<Record<Day, DayState>>(() =>
    hoursToState(place?.opening_hours ?? null)
  );

  const form = useForm<EditPlaceValues>({
    resolver: zodResolver(EditPlaceSchema),
    defaultValues: {
      name: markerName,
      amenity: markerAmenity as EditPlaceValues["amenity"],
      address: place?.address ?? null,
      city: place?.city ?? null,
      phone: place?.phone ?? null,
      website: place?.website ?? null,
      opening_hours: place?.opening_hours ?? null,
      thumbnail: place?.thumbnail ?? null,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: EditPlaceValues) => editPlace(markerId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["place", markerId] });
      queryClient.invalidateQueries({ queryKey: ["pub_list"] });
      queryClient.invalidateQueries({ queryKey: ["markers"] });
      toast.success("Place updated successfully.");
      onOpenChange(false);
    },
  });

  function onSubmit(values: EditPlaceValues) {
    mutation.mutate({ ...values, opening_hours: stateToHours(dayStates) });
  }

  function setDay(day: Day, patch: Partial<DayState>) {
    setDayStates((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-2">

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nameLabel")}</FormLabel>
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
                  <FormLabel>{t("categoryLabel")}</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {AMENITIES.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => field.onChange(a.value)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            field.value === a.value
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-input bg-transparent text-muted-foreground hover:border-ring hover:text-foreground"
                          }`}
                        >
                          <span>{a.icon}</span>
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
                  <FormLabel>{t("address")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 12 High Street, London"
                      className="h-9"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("city")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. London"
                      className="h-9"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phone")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. +44 20 7946 0958"
                      className="h-9"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("website")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. https://theredlion.co.uk"
                      className="h-9"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Thumbnail URL */}
            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("thumbnailLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://…"
                      className="h-9"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Opening hours */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("openingHours")}</span>
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
                        <span className="text-xs text-muted-foreground">{tCommon("closed")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-400 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
                {t("failedSave")}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
