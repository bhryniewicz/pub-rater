"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClaimPlaceSchema, type ClaimPlaceValues } from "@/features/requests/schemas";
import { useClaimPlace } from "@/features/requests/api/claim-place";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

type Props = {
  markerId: string;
};

export function ClaimForm({ markerId }: Props) {
  const t = useTranslations("places");
  const tCommon = useTranslations("common");
  const mutation = useClaimPlace();

  const form = useForm<ClaimPlaceValues>({
    resolver: zodResolver(ClaimPlaceSchema),
    defaultValues: { marker_id: markerId, description: "" },
  });

  function onSubmit(values: ClaimPlaceValues) {
    mutation.mutate(values);
  }

  if (mutation.isSuccess) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
          {t("claimTitle")}
        </p>
        <p className="text-sm text-green-600 font-medium">
          {t("claimSubmitted")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
        {t("claimTitle")}
      </p>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t("claimThis")}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {t("claimDescription")}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder={t("claimPlaceholder")}
                    rows={3}
                    className="resize-none text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root && (
            <p className="text-xs text-red-500">{form.formState.errors.root.message}</p>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-500">{String(mutation.error)}</p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? tCommon("sending") : t("sendClaim")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
