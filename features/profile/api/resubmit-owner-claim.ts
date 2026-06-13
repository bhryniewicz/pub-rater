"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resubmitOwnerClaim } from "@/app/actions/resubmit-request";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useResubmitOwnerClaim(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resubmitOwnerClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_REQUESTS(userId) });
    },
  });
}
