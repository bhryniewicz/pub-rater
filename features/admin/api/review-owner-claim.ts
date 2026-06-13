"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest, requestMoreInfo } from "@/app/actions/review-request";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useApproveOwnerClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
    },
  });
}

export function useRejectOwnerClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
    },
  });
}

export function useRequestMoreInfoOwnerClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestMoreInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
    },
  });
}
