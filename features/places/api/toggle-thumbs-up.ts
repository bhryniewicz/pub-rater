"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { PlaceData } from "./get-place";

type ToggleThumbsUpInput = {
  reviewId: string;
  userId: string;
  thumbsUps: string[];
  hasThumbedUp: boolean;
};

export function useToggleThumbsUp(markerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, userId }: ToggleThumbsUpInput) => {
      const { data, error } = await supabase.rpc("toggle_thumbs_up", {
        p_review_id: reviewId,
        p_user_id: userId,
      });
      if (error) throw error;
      return data as string[];
    },
    onMutate: async ({ reviewId, userId, thumbsUps, hasThumbedUp }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.PLACE(markerId) });
      const previous = queryClient.getQueryData(QUERY_KEYS.PLACE(markerId));
      const optimistic = hasThumbedUp
        ? thumbsUps.filter((id) => id !== userId)
        : [...thumbsUps, userId];
      queryClient.setQueryData(QUERY_KEYS.PLACE(markerId), (old: PlaceData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          reviews: old.reviews.map((r) =>
            r.id === reviewId ? { ...r, thumbs_ups: optimistic } : r,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.PLACE(markerId), context.previous);
      }
    },
    onSuccess: (newThumbsUps, { reviewId }) => {
      queryClient.setQueryData(QUERY_KEYS.PLACE(markerId), (old: PlaceData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          reviews: old.reviews.map((r) =>
            r.id === reviewId ? { ...r, thumbs_ups: newThumbsUps } : r,
          ),
        };
      });
    },
  });
}
