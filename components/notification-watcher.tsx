"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";

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

  useEffect(() => {
    if (!user) return;

    const userId = user.id;

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
  }, [user?.id, router]);

  return null;
}
