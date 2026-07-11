"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resubmitOwnerClaim } from "@/features/requests/api/resubmit-owner-claim.action";
import { QUERY_KEYS } from "@/lib/query";
import type { MutationConfig } from "@/lib/query/config";

type UseResubmitOwnerClaimOptions = {
  mutationConfig?: MutationConfig<typeof resubmitOwnerClaim>;
};

export function useResubmitOwnerClaim(userId: string, { mutationConfig }: UseResubmitOwnerClaimOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_REQUESTS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COUNTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECENT_REQUESTS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: resubmitOwnerClaim,
  });
}
