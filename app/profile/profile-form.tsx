"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useGeolocation } from "@/context/geolocation-context";
import {
  ReviewSchema,
  LocationRequestSchema,
  type Review,
  type LocationRequest,
} from "@/lib/schemas";

type Preferences = {
  pub_preference: boolean;
  bar_preference: boolean;
};

type Props = {
  userId: string;
  email: string;
  createdAt: string;
  preferences: Preferences;
};

type Section = "profile" | "reviews" | "requests" | "preferences";

const AMENITY_LABELS: Record<string, string> = {
  pub: "Pub 🍺",
  bar: "Bar 🥂",
  restaurant: "Restaurant 🍽️",
  cafe: "Cafe ☕",
  nightclub: "Nightclub 🎶",
  biergarten: "Biergarten 🌻",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border border-red-500/30",
};

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: "profile", label: "Profile Details" },
  { id: "reviews", label: "Reviews Done" },
  { id: "requests", label: "Pending Requests" },
  { id: "preferences", label: "Preferences" },
];

export function ProfileForm({
  userId,
  email,
  createdAt,
  preferences: initialPreferences,
}: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const { status: geoStatus, address, enable: enableGeo, disable: disableGeo } =
    useGeolocation();

  const saveMutation = useMutation({
    mutationFn: async (prefs: Preferences) => {
      await supabase.from("profiles").update({ preferences: prefs }).eq("id", userId);
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ["user_reviews", userId],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ReviewSchema.parse(row));
    },
    enabled: activeSection === "reviews",
  });

  const requestsQuery = useQuery({
    queryKey: ["user_requests", userId],
    queryFn: async (): Promise<LocationRequest[]> => {
      const { data, error } = await supabase
        .from("location_requests")
        .select("*")
        .eq("requested_by", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => LocationRequestSchema.parse(row));
    },
    enabled: activeSection === "requests",
  });

  function toggle(key: keyof Preferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    saveMutation.reset();
  }

  const joinedAt = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ── Left sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-zinc-800 py-8 px-3">
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
        >
          Log out
        </button>
      </aside>

      {/* ── Right content ──────────────────────────────────────────────────── */}
      <main className="flex-1 py-10 px-12 max-w-2xl">
        {activeSection === "profile" && (
          <section>
            <h1 className="text-xl font-semibold text-white mb-8">Profile Details</h1>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Email</p>
                <p className="text-sm font-medium text-zinc-100">{email}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-1">Member since</p>
                <p className="text-sm font-medium text-zinc-100">{joinedAt}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-1">User ID</p>
                <p className="text-xs font-mono text-zinc-400 break-all">{userId}</p>
              </div>
            </div>

            <div className="border-t border-zinc-800 my-8" />

            <h2 className="text-base font-semibold text-white mb-4">Location</h2>
            {geoStatus === "granted" && (
              <p className="text-xs text-zinc-400 mb-3 truncate">{address ?? "Location active"}</p>
            )}
            {geoStatus === "denied" && (
              <p className="text-xs text-red-400 mb-3">
                Location blocked — reset in browser site settings.
              </p>
            )}
            {geoStatus === "unavailable" && (
              <p className="text-xs text-zinc-500 mb-3">Geolocation not supported.</p>
            )}
            {geoStatus === "granted" ? (
              <button
                onClick={disableGeo}
                className="text-sm font-medium text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 transition-colors"
              >
                Disable location
              </button>
            ) : (
              <button
                onClick={enableGeo}
                disabled={geoStatus === "loading" || geoStatus === "unavailable"}
                className="text-sm font-medium text-zinc-950 bg-blue-400 hover:bg-blue-300 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
              >
                {geoStatus === "loading" ? "Locating…" : "Enable location"}
              </button>
            )}
          </section>
        )}

        {activeSection === "reviews" && (
          <section>
            <h1 className="text-xl font-semibold text-white mb-8">Reviews Done</h1>

            {reviewsQuery.isLoading && (
              <p className="text-sm text-zinc-500">Loading reviews…</p>
            )}
            {reviewsQuery.isError && (
              <p className="text-sm text-red-400">Failed to load reviews.</p>
            )}
            {reviewsQuery.data && reviewsQuery.data.length === 0 && (
              <p className="text-sm text-zinc-500">No reviews yet.</p>
            )}
            {reviewsQuery.data && reviewsQuery.data.length > 0 && (
              <div className="flex flex-col gap-3">
                {reviewsQuery.data.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500 font-mono">{review.marker_id}</span>
                      {review.rating !== null && (
                        <span className="text-sm font-semibold text-yellow-400">
                          {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                        </span>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-zinc-200">{review.comment}</p>
                    )}
                    {review.created_at && (
                      <p className="text-xs text-zinc-600 mt-2">
                        {new Date(review.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "requests" && (
          <section>
            <h1 className="text-xl font-semibold text-white mb-8">Pending Requests</h1>

            {requestsQuery.isLoading && (
              <p className="text-sm text-zinc-500">Loading requests…</p>
            )}
            {requestsQuery.isError && (
              <p className="text-sm text-red-400">Failed to load requests.</p>
            )}
            {requestsQuery.data && requestsQuery.data.length === 0 && (
              <p className="text-sm text-zinc-500">No place requests submitted.</p>
            )}
            {requestsQuery.data && requestsQuery.data.length > 0 && (
              <div className="flex flex-col gap-3">
                {requestsQuery.data.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{req.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {AMENITY_LABELS[req.amenity] ?? req.amenity}
                      {req.address ? ` · ${req.address}` : ""}
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">
                      {new Date(req.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "preferences" && (
          <section>
            <h1 className="text-xl font-semibold text-white mb-8">Preferences</h1>

            <div className="flex flex-col gap-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={preferences.pub_preference}
                  onChange={() => toggle("pub_preference")}
                  className="w-4 h-4 rounded accent-yellow-400"
                />
                <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                  🍺 Pubs
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={preferences.bar_preference}
                  onChange={() => toggle("bar_preference")}
                  className="w-4 h-4 rounded accent-yellow-400"
                />
                <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                  🥂 Bars
                </span>
              </label>
            </div>

            <button
              onClick={() => saveMutation.mutate(preferences)}
              disabled={saveMutation.isPending}
              className="text-sm font-medium text-zinc-950 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 rounded-lg px-5 py-2 transition-colors"
            >
              {saveMutation.isPending
                ? "Saving…"
                : saveMutation.isSuccess
                  ? "Saved"
                  : "Save preferences"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
