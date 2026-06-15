"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { MutationConfig } from "@/lib/react-query";

type UserRole = "user" | "owner" | "admin";

type UseUpdateUserRoleOptions = {
  mutationConfig?: MutationConfig<(input: { id: string; role: UserRole }) => Promise<void>>;
};

type UseBanUserOptions = {
  mutationConfig?: MutationConfig<(input: { id: string; banned: boolean }) => Promise<void>>;
};

type UseDeleteUserOptions = {
  mutationConfig?: MutationConfig<(id: string) => Promise<void>>;
};

export function useUpdateUserRole({ mutationConfig }: UseUpdateUserRoleOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.rpc("set_user_role", {
        target_id: id,
        new_role: role,
      });
      if (error) throw error;
    },
  });
}

export function useBanUser({ mutationConfig }: UseBanUserOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      const { error } = await supabase.rpc("set_user_banned", {
        target_id: id,
        is_banned: banned,
      });
      if (error) throw error;
    },
  });
}

export function useDeleteUser({ mutationConfig }: UseDeleteUserOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_user", { target_id: id });
      if (error) throw error;
    },
  });
}
