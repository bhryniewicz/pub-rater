"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Review } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { PlaceData } from "./get-place";
import type { GuestCheckValues } from "@/components/guest-check-dialog";

export function useCreateReview(markerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: GuestCheckValues & { userId: string; userEmail: string }) => {
      const { data: review, error } = await supabase
        .from("reviews")
        .insert({
          marker_id: markerId,
          user_id: values.userId,
          user_email: values.userEmail,
          comment: values.comment.trim() || null,
          rating: values.rating,
          atmosphere: values.atmosphere > 0 ? values.atmosphere : null,
          service: values.service > 0 ? values.service : null,
          space: values.space > 0 ? values.space : null,
          price_tier: values.priceTier,
          additional_info: values.additionalInfo.length > 0 ? values.additionalInfo : null,
        })
        .select()
        .single();
      if (error) throw error;
      return review as Review;
    },
    onSuccess: (newReview) => {
      queryClient.setQueryData(QUERY_KEYS.PLACE(markerId), (old: PlaceData | undefined) => {
        if (!old) return old;
        return { ...old, reviews: [newReview, ...old.reviews] };
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKERS });
    },
  });
}
