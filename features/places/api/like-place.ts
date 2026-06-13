"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { useProfile } from "@/features/profile/api/get-profile";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { UserData } from "@/hooks/use-user";

export function useLikePlace() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const likedPlaces = profile?.liked_places ?? [];

  const mutation = useMutation({
    mutationFn: async (placeId: string) => {
      const isLiked = likedPlaces.includes(placeId);
      const updated = isLiked
        ? likedPlaces.filter((id: string) => id !== placeId)
        : [...likedPlaces, placeId];
      await supabase
        .from("profiles")
        .update({ liked_places: updated })
        .eq("id", user!.id);
      return updated;
    },
    onMutate: async (placeId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.USER });
      const previous = queryClient.getQueryData(QUERY_KEYS.USER);
      queryClient.setQueryData(QUERY_KEYS.USER, (old: UserData | undefined) => {
        if (!old?.profile) return old;
        const isLiked = (old.profile.liked_places ?? []).includes(placeId);
        return {
          ...old,
          profile: {
            ...old.profile,
            liked_places: isLiked
              ? (old.profile.liked_places ?? []).filter((id: string) => id !== placeId)
              : [...(old.profile.liked_places ?? []), placeId],
          },
        };
      });
      return { previous };
    },
    onError: (_err, _placeId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.USER, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
    },
  });

  return {
    toggle: mutation.mutate,
    likedPlaces,
    canLike: !!user,
  };
}
