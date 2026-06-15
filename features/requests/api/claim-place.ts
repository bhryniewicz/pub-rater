"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { claimPlace } from "@/features/requests/api/claim-place.action";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { MutationConfig } from "@/lib/react-query";

type UseClaimPlaceOptions = {
  mutationConfig?: MutationConfig<typeof claimPlace>;
};

export function useClaimPlace({ mutationConfig }: UseClaimPlaceOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["user_requests"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECENT_REQUESTS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: claimPlace,
  });
}
