"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EditPlaceSchema, type EditPlaceValues, type AmenityKey } from "@/schemas/forms";
import {
  AMENITY_KEYS,
  AMENITY_CONFIG,
} from "@/lib/amenities";
import { AMENITY_OTHER_MAX } from "@/lib/constants";
import type { Place } from "@/lib/supabase";
import { useUpdatePlace } from "@/features/place/api/update-place";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AdminLayout } from "@/components/forms/_layout/admin-layout";
import { OpeningHoursField } from "@/components/forms/_fields/opening-hours-field";
import { PlaceTypeToggle } from "@/components/forms/_fields/place-type-toggle";
import { MutationErrorMessage } from "@/components/forms/_fields/mutation-error-message";
import { DialogFormFooter } from "@/components/forms/_fields/dialog-form-footer";
import {
  type Day,
  type DayState,
  hoursToState,
  stateToHours,
  DAY_LABELS,
} from "@/lib/opening-hours/form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markerId: string;
  markerName: string;
  markerPlaceType: string;
  place: Place | null;
};

export function EditPlaceDialog({
  open,
  onOpenChange,
  markerId,
  markerName,
  markerPlaceType,
  place,
}: Props) {
  const t = useTranslations("places");
  const tCommon = useTranslations("common");
  const tGC = useTranslations("guestCheck");
  const [dayStates, setDayStates] = useState<Record<Day, DayState>>(() =>
    hoursToState(place?.opening_hours ?? null)
  );

  const form = useForm<EditPlaceValues>({
    resolver: zodResolver(EditPlaceSchema),
    defaultValues: {
      name: markerName,
      place_type: markerPlaceType as EditPlaceValues["place_type"],
      address: place?.address ?? null,
      city: place?.city ?? null,
      phone: place?.phone ?? null,
      website: place?.website ?? null,
      opening_hours: place?.opening_hours ?? null,
      thumbnail: place?.thumbnail ?? null,
      amenities: (place?.amenities ?? []) as AmenityKey[],
      amenity_other: place?.amenity_other ?? null,
    },
  });

  const mutation = useUpdatePlace(markerId);

  function onSubmit(values: EditPlaceValues) {
    mutation.mutate({ ...values, opening_hours: stateToHours(dayStates) }, {
      onSuccess: () => {
        toast.success("Place updated successfully.");
        onOpenChange(false);
      },
    });
  }

  function setDay(day: Day, patch: Partial<DayState>) {
    setDayStates((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  return (
    <AdminLayout
      open={open}
      onOpenChange={onOpenChange}
      title={t("editTitle")}
      contentClassName="sm:max-w-lg max-h-[90vh] overflow-y-auto"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-2">

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

          <FormField
            control={form.control}
            name="place_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("categoryLabel")}</FormLabel>
                <FormControl>
                  <PlaceTypeToggle value={field.value} onChange={field.onChange} />
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

          <FormField
            control={form.control}
            name="thumbnail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("thumbnailLabel")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://..."
                    className="h-9"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amenities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("amenitiesLabel")}</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    {AMENITY_KEYS.map((key) => {
                      const { labelKey, Icon } = AMENITY_CONFIG[key];
                      const checked = field.value.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            field.onChange(
                              checked
                                ? field.value.filter((k) => k !== key)
                                : [...field.value, key],
                            )
                          }
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                            checked
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="capitalize">{tGC(labelKey).toLowerCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amenity_other"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("amenityOtherLabel")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("amenityOtherPlaceholder")}
                    className="h-9"
                    maxLength={AMENITY_OTHER_MAX}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <OpeningHoursField
            days={dayStates}
            onDayChange={setDay}
            dayLabels={DAY_LABELS}
            label={t("openingHours")}
          />

          {mutation.isError && (
            <MutationErrorMessage message={t("failedSave")} />
          )}

          <DialogFormFooter
            onCancel={() => onOpenChange(false)}
            cancelLabel={tCommon("cancel")}
            submitLabel={mutation.isPending ? t("saving") : t("saveChanges")}
            isPending={mutation.isPending}
          />
        </form>
      </Form>
    </AdminLayout>
  );
}
