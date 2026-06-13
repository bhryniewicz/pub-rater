"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { UserData } from "@/hooks/use-user";

type LikePlaceInput = {
  markerId: string;
  currentLikedPlaces: string[];
};

export function useLikePlace(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ markerId, currentLikedPlaces }: LikePlaceInput) => {
      const isLiked = currentLikedPlaces.includes(markerId);
      const updated = isLiked
        ? currentLikedPlaces.filter((id) => id !== markerId)
        : [...currentLikedPlaces, markerId];
      const { error } = await supabase
        .from("profiles")
        .update({ liked_places: updated })
        .eq("id", userId);
      if (error) throw error;
      return updated;
    },
    onMutate: async ({ markerId, currentLikedPlaces }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.USER });
      const previous = queryClient.getQueryData(QUERY_KEYS.USER);
      const isLiked = currentLikedPlaces.includes(markerId);
      queryClient.setQueryData(QUERY_KEYS.USER, (old: UserData | undefined) => {
        if (!old?.profile) return old;
        return {
          ...old,
          profile: {
            ...old.profile,
            liked_places: isLiked
              ? currentLikedPlaces.filter((id) => id !== markerId)
              : [...currentLikedPlaces, markerId],
          },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.USER, context.previous);
      }
    },
  });
}
