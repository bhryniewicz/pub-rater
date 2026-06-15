"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editPlace } from "@/features/places/api/edit-place.action";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { EditPlaceValues } from "@/features/places/schemas";
import type { MutationConfig } from "@/lib/react-query";

type UseUpdatePlaceOptions = {
  mutationConfig?: MutationConfig<(values: EditPlaceValues) => ReturnType<typeof editPlace>>;
};

export function useUpdatePlace(markerId: string, { mutationConfig }: UseUpdatePlaceOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE(markerId) });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKERS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: (values: EditPlaceValues) => editPlace(markerId, values),
  });
}
