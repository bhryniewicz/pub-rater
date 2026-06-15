"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resubmitPlaceRequest } from "@/features/requests/api/resubmit-place-request.action";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { MutationConfig } from "@/lib/react-query";

type UseResubmitPlaceRequestOptions = {
  mutationConfig?: MutationConfig<typeof resubmitPlaceRequest>;
};

export function useResubmitPlaceRequest({ mutationConfig }: UseResubmitPlaceRequestOptions = {}) {
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
    mutationFn: resubmitPlaceRequest,
  });
}
