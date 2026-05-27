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
  avatarUrl: string | null;
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
  pending: "bg-yellow-500/20 text-yellow-600 border border-yellow-500/30",
  approved: "bg-green-500/20 text-green-600 border border-green-500/30",
  rejected: "bg-red-500/20 text-red-600 border border-red-500/30",
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
  avatarUrl: initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarError(null);

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarError("Upload failed. Try again.");
      setAvatarUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    setAvatarUrl(publicUrl);
    setAvatarUploading(false);
  }

  const joinedAt = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-52 shrink-0 flex flex-col border-r border-border py-8 px-3 overflow-y-auto">
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
          className="text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 py-10 px-12 max-w-2xl overflow-y-auto">
        {activeSection === "profile" && (
          <section>
            <h1 className="text-xl font-semibold text-foreground mb-8">Profile Details</h1>

            <div className="mb-8">
              <p className="text-xs text-muted-foreground mb-3">Profile photo</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xl font-semibold">
                      {email[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors cursor-pointer inline-block">
                    {avatarUploading ? "Uploading…" : "Change photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={avatarUploading}
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {avatarError && (
                    <p className="text-xs text-red-500">{avatarError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF · max 2 MB</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Member since</p>
                <p className="text-sm font-medium text-foreground">{joinedAt}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">User ID</p>
                <p className="text-xs font-mono text-muted-foreground break-all">{userId}</p>
              </div>
            </div>

            <div className="border-t border-border my-8" />

            <h2 className="text-base font-semibold text-foreground mb-4">Location</h2>
            {geoStatus === "granted" && (
              <p className="text-xs text-muted-foreground mb-3 truncate">{address ?? "Location active"}</p>
            )}
            {geoStatus === "denied" && (
              <p className="text-xs text-red-500 mb-3">
                Location blocked — reset in browser site settings.
              </p>
            )}
            {geoStatus === "unavailable" && (
              <p className="text-xs text-muted-foreground mb-3">Geolocation not supported.</p>
            )}
            {geoStatus === "granted" ? (
              <button
                onClick={disableGeo}
                className="text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/50 rounded-lg px-4 py-2 transition-colors"
              >
                Disable location
              </button>
            ) : (
              <button
                onClick={enableGeo}
                disabled={geoStatus === "loading" || geoStatus === "unavailable"}
                className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
              >
                {geoStatus === "loading" ? "Locating…" : "Enable location"}
              </button>
            )}
          </section>
        )}

        {activeSection === "reviews" && (
          <section>
            <h1 className="text-xl font-semibold text-foreground mb-8">Reviews Done</h1>

            {reviewsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading reviews…</p>
            )}
            {reviewsQuery.isError && (
              <p className="text-sm text-red-500">Failed to load reviews.</p>
            )}
            {reviewsQuery.data && reviewsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
            {reviewsQuery.data && reviewsQuery.data.length > 0 && (
              <div className="flex flex-col gap-3">
                {reviewsQuery.data.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-border bg-card px-4 py-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-mono">{review.marker_id}</span>
                      {review.rating !== null && (
                        <span className="text-sm font-semibold text-primary">
                          {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                        </span>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-foreground">{review.comment}</p>
                    )}
                    {review.created_at && (
                      <p className="text-xs text-muted-foreground mt-2">
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
            <h1 className="text-xl font-semibold text-foreground mb-8">Pending Requests</h1>

            {requestsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading requests…</p>
            )}
            {requestsQuery.isError && (
              <p className="text-sm text-red-500">Failed to load requests.</p>
            )}
            {requestsQuery.data && requestsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">No place requests submitted.</p>
            )}
            {requestsQuery.data && requestsQuery.data.length > 0 && (
              <div className="flex flex-col gap-3">
                {requestsQuery.data.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-border bg-card px-4 py-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {req.type === "owner_claim" ? "Ownership claim" : req.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.type === "owner_claim"
                        ? req.description ?? "No description"
                        : `${AMENITY_LABELS[req.amenity] ?? req.amenity}${req.address ? ` · ${req.address}` : ""}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
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
            <h1 className="text-xl font-semibold text-foreground mb-8">Preferences</h1>

            <div className="flex flex-col gap-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={preferences.pub_preference}
                  onChange={() => toggle("pub_preference")}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  🍺 Pubs
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={preferences.bar_preference}
                  onChange={() => toggle("bar_preference")}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  🥂 Bars
                </span>
              </label>
            </div>

            <button
              onClick={() => saveMutation.mutate(preferences)}
              disabled={saveMutation.isPending}
              className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-5 py-2 transition-colors"
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
