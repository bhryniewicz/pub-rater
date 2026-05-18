"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";

type Notification = {
  id: string;
  type: "approved" | "rejected";
  request_name: string;
  marker_id: string | null;
};

function fireToast(n: Notification, onView: (markerId: string) => void) {
  if (n.type === "approved") {
    toast.success(`"${n.request_name}" was approved`, {
      description: "Your place request has been accepted by an admin.",
      ...(n.marker_id
        ? {
            action: {
              label: "View place",
              onClick: () => onView(n.marker_id!),
            },
          }
        : {}),
    });
  } else {
    toast.error(`"${n.request_name}" was rejected`, {
      description: "Your place request was not accepted by an admin.",
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
        .select("id, type, request_name, marker_id")
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
