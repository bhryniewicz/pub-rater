"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPlace } from "@/features/requests/api/request-place.action";
import { QUERY_KEYS } from "@/lib/query";
import type { AddPlaceValues } from "@/features/places/schemas";
import type { OpeningHours } from "@/schemas";
import type { MutationConfig } from "@/lib/query/config";

type UseRequestPlaceOptions = {
  mutationConfig?: MutationConfig<typeof requestPlace>;
};

export function useRequestPlace({ mutationConfig }: UseRequestPlaceOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["user_requests"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECENT_REQUESTS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: (values: AddPlaceValues & { opening_hours: OpeningHours | null }) =>
      requestPlace(values),
  });
}
