"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest, requestMoreInfo } from "@/features/admin/api/review-request.action";
import { QUERY_KEYS } from "@/lib/query";
import type { MutationConfig } from "@/lib/query/config";

type UseApproveOwnerClaimOptions = {
  mutationConfig?: MutationConfig<typeof approveRequest>;
};

type UseRejectOwnerClaimOptions = {
  mutationConfig?: MutationConfig<typeof rejectRequest>;
};

type UseRequestMoreInfoOwnerClaimOptions = {
  mutationConfig?: MutationConfig<typeof requestMoreInfo>;
};

export function useApproveOwnerClaim({ mutationConfig }: UseApproveOwnerClaimOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: approveRequest,
  });
}

export function useRejectOwnerClaim({ mutationConfig }: UseRejectOwnerClaimOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: rejectRequest,
  });
}

export function useRequestMoreInfoOwnerClaim({ mutationConfig }: UseRequestMoreInfoOwnerClaimOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: requestMoreInfo,
  });
}
