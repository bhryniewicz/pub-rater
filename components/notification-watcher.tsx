"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/features/profile/api/get-user";
import { QUERY_KEYS } from "@/lib/query-keys";

type Notification = {
  id: string;
  type: "approved" | "rejected" | "need_more_info";
  request_type: "place_request" | "owner_claim";
  request_name: string;
  marker_id: string | null;
  message: string | null;
};

function fireToast(n: Notification, onView: (markerId: string) => void) {
  const label =
    n.request_type === "owner_claim" ? "ownership claim" : "place request";

  if (n.type === "approved") {
    toast.success(`Your ${label} was approved`, {
      description:
        n.request_type === "owner_claim"
          ? "You are now the owner of this place."
          : "Your place has been accepted by an admin.",
      ...(n.marker_id
        ? {
            action: {
              label: "View place",
              onClick: () => onView(n.marker_id!),
            },
          }
        : {}),
    });
  } else if (n.type === "need_more_info") {
    toast.info(
      n.request_type === "owner_claim"
        ? "More info needed for your ownership claim"
        : "More info needed for your place request",
      {
        description: n.message ?? "An admin has requested additional information. Check your profile.",
        duration: 8000,
      }
    );
  } else {
    toast.error(`Your ${label} was rejected`, {
      description: "The request was not accepted by an admin.",
    });
  }
}

export function NotificationWatcher() {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const userId = user.id;

    function invalidatePlacesIfApproved(n: Notification) {
      if (n.type === "approved" && n.request_type === "place_request") {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKERS });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
      }
    }

    async function showUnread() {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, request_type, request_name, marker_id, message")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: true });

      if (!data?.length) return;

      for (const n of data) {
        fireToast(n as Notification, (id) => router.push(`/places/${id}`));
        invalidatePlacesIfApproved(n as Notification);
      }

      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
    }

    showUnread();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          fireToast(n, (id) => router.push(`/places/${id}`));
          invalidatePlacesIfApproved(n);
          supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", n.id)
            .then(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, router, queryClient]);

  return null;
}
