"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClaimPlaceSchema, type ClaimPlaceValues } from "@/lib/schemas";
import { claimPlace } from "@/app/actions/claim-place";
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
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ClaimPlaceValues>({
    resolver: zodResolver(ClaimPlaceSchema),
    defaultValues: { marker_id: markerId, description: "" },
  });

  async function onSubmit(values: ClaimPlaceValues) {
    await claimPlace(values);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Ownership
        </p>
        <p className="text-sm text-green-600 font-medium">
          Claim submitted — an admin will review it shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
        Ownership
      </p>
      <h3 className="text-base font-semibold text-foreground mb-1">
        Claim this place
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Tell us why you should be the owner of this place. An admin will review your request.
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
                    placeholder="I'm the manager of this pub and would like to keep the information up to date…"
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

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Sending…" : "Send claim request"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
