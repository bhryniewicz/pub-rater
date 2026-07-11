"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Review } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";
import type { PlaceData } from "./get-place";
import type { GuestCheckValues } from "@/features/place/components/rate-dialog";
import type { MutationConfig } from "@/lib/query/config";

type CreateReviewInput = GuestCheckValues & { userId: string; userEmail: string };

type UseCreateReviewOptions = {
  mutationConfig?: MutationConfig<(values: CreateReviewInput) => Promise<Review>>;
};

export function useCreateReview(markerId: string, { mutationConfig }: UseCreateReviewOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (newReview, ...args) => {
      queryClient.setQueryData(QUERY_KEYS.PLACE(markerId), (old: PlaceData | undefined) => {
        if (!old) return old;
        return { ...old, reviews: [newReview, ...old.reviews] };
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKERS });
      onSuccess?.(newReview, ...args);
    },
    ...restConfig,
    mutationFn: async (values: CreateReviewInput) => {
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
  });
}
