"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AddPlaceSchema, type AddPlaceValues } from "@/schemas/forms";
import type { PlaceRequest } from "@/features/requests/schemas";
import { useResubmitPlaceRequest } from "@/features/requests/api/resubmit-place-request";
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
import { OpeningHoursField } from "@/components/forms/_fields/opening-hours-field";
import { PlaceTypeToggle } from "@/components/forms/_fields/place-type-toggle";
import { MutationErrorMessage } from "@/components/forms/_fields/mutation-error-message";
import { DialogFormFooter } from "@/components/forms/_fields/dialog-form-footer";
import {
  DAYS,
  type Day,
  type DayState,
  hoursToState,
  stateToHours,
} from "@/lib/opening-hours/form";

const LocationPickerMap = dynamic(
  () =>
    import("@/components/location-picker-map").then((m) => ({
      default: m.LocationPickerMap,
    })),
  { ssr: false },
);

const DAY_T_KEYS: Record<Day, string> = {
  mo: "mon", tu: "tue", we: "wed", th: "thu", fr: "fri", sa: "sat", su: "sun",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PlaceRequest;
};

export function ResubmitPlaceDialog({ open, onOpenChange, request }: Props) {
  const t = useTranslations("resubmit");
  const tCommon = useTranslations("common");

  const dayLabels = DAYS.reduce((acc, day) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    acc[day] = t(DAY_T_KEYS[day] as any);
    return acc;
  }, {} as Record<Day, string>);

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
      { ...values, opening_hours: stateToHours(dayStates), requestId: request.id },
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
                        <PlaceTypeToggle
                          value={field.value}
                          onChange={field.onChange}
                          labels={{
                            pub: t("pub"),
                            bar: t("bar"),
                            biergarten: t("beerGarden"),
                          }}
                        />
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

                <OpeningHoursField
                  days={dayStates}
                  onDayChange={setDay}
                  dayLabels={dayLabels}
                  label={t("openingHoursLabel")}
                />

                {mutation.isError && (
                  <MutationErrorMessage message={t("failed")} />
                )}

                <DialogFormFooter
                  onCancel={() => onOpenChange(false)}
                  cancelLabel={tCommon("cancel")}
                  submitLabel={mutation.isPending ? t("submitting") : t("resubmitButton")}
                  isPending={mutation.isPending}
                />
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
