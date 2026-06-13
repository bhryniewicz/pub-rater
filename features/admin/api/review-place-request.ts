"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest, requestMoreInfo } from "@/app/actions/review-request";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useApprovePlaceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKERS });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
    },
  });
}

export function useRejectPlaceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
    },
  });
}

export function useRequestMoreInfoPlaceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestMoreInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
    },
  });
}
