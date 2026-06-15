"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest, requestMoreInfo } from "@/features/admin/api/review-request.action";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { MutationConfig } from "@/lib/react-query";

type UseApprovePlaceRequestOptions = {
  mutationConfig?: MutationConfig<typeof approveRequest>;
};

type UseRejectPlaceRequestOptions = {
  mutationConfig?: MutationConfig<typeof rejectRequest>;
};

type UseRequestMoreInfoPlaceRequestOptions = {
  mutationConfig?: MutationConfig<typeof requestMoreInfo>;
};

export function useApprovePlaceRequest({ mutationConfig }: UseApprovePlaceRequestOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKERS });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: approveRequest,
  });
}

export function useRejectPlaceRequest({ mutationConfig }: UseRejectPlaceRequestOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: rejectRequest,
  });
}

export function useRequestMoreInfoPlaceRequest({ mutationConfig }: UseRequestMoreInfoPlaceRequestOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: requestMoreInfo,
  });
}
