"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resubmitPlaceRequest } from "@/app/actions/resubmit-request";

export function useResubmitPlaceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resubmitPlaceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_requests"] });
    },
  });
}
