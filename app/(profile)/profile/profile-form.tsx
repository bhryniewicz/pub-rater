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
  automatic_zoom: boolean;
};

type Props = {
  userId: string;
  email: string;
  createdAt: string;
  preferences: Preferences | undefined;
  avatarUrl: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30",
  approved: "bg-green-500/20 text-green-500 border border-green-500/30",
  rejected: "bg-red-500/20 text-red-500 border border-red-500/30",
};

const AMENITY_LABELS: Record<string, string> = {
  pub: "Pub",
  bar: "Bar",
  restaurant: "Restaurant",
  cafe: "Cafe",
  nightclub: "Nightclub",
  biergarten: "Biergarten",
};

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function StatCard({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-4 py-3">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

/** Mobile settings-style list row */
function MobileRow({
  icon,
  iconBg = "bg-secondary",
  title,
  subtitle,
  badge,
  mono = false,
  disabled = false,
}: {
  icon: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
        {subtitle && (
          <p
            className={`text-xs text-muted-foreground truncate leading-snug ${mono ? "font-mono" : ""}`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {badge}
      <span className="text-muted-foreground text-lg leading-none shrink-0">›</span>
    </div>
  );
}

/** Mobile section with label + grouped card */
function MobileSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 px-4">{label}</p>
      <div className="mx-4 rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/** Mobile toggle row */
function MobileToggleRow({
  icon,
  iconBg = "bg-secondary",
  title,
  subtitle,
  checked,
  onChange,
  disabled = false,
}: {
  icon: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function ProfileForm({
  userId,
  email,
  createdAt,
  preferences: initialPreferences,
  avatarUrl: initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>(
    initialPreferences ?? { pub_preference: true, bar_preference: true, automatic_zoom: true }
  );
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
  });

  const requestsQuery = useQuery({
    queryKey: ["user_requests", userId],
    queryFn: async (): Promise<LocationRequest[]> => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("requested_by", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => LocationRequestSchema.parse(row));
    },
  });

  function toggle(key: keyof Preferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    saveMutation.mutate(next);
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
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", userId);
    setAvatarUrl(urlData.publicUrl);
    setAvatarUploading(false);
  }

  const joinedAt = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const displayName = email.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();
  const reviewCount = reviewsQuery.data?.length ?? 0;
  const pendingCount =
    requestsQuery.data?.filter((r) => r.status === "pending").length ?? 0;

  const avatarEl = avatarUrl ? (
    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center font-bold text-foreground">
      {initials}
    </div>
  );

  return (
    <>
      {/* ════════════════════════════════════
          MOBILE  (hidden on md+)
      ════════════════════════════════════ */}
      <div className="flex flex-col md:hidden h-screen bg-background overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-background/95 backdrop-blur z-10">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <label className="cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
              {avatarEl}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={avatarUploading}
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        {/* Profile header */}
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-14 h-14 rounded-full bg-secondary overflow-hidden shrink-0 text-lg">
            {avatarEl}
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
          </div>
        </div>

        {avatarError && <p className="text-xs text-red-500 px-4 mb-2">{avatarError}</p>}
        {avatarUploading && (
          <p className="text-xs text-muted-foreground px-4 mb-2">Uploading photo…</p>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 px-4 mb-5">
          {[
            { value: "—", label: "Venues" },
            { value: "—", label: "Rating" },
            { value: reviewsQuery.isLoading ? "…" : reviewCount, label: "Reviews" },
            { value: pendingCount, label: "Pending" },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-xl bg-secondary/60 px-2 py-2.5 text-center">
              <p className="text-base font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ACCOUNT */}
        <MobileSection label="Account">
          <MobileRow icon="✉️" iconBg="bg-amber-700/30" title="Email" subtitle={email} />
          <MobileRow icon="📞" iconBg="bg-amber-700/30" title="Phone" subtitle="Not set" disabled />
          <MobileRow
            icon="📅"
            iconBg="bg-amber-700/30"
            title="Member since"
            subtitle={joinedAt}
          />
          <MobileRow
            icon="#"
            iconBg="bg-secondary"
            title="User ID"
            subtitle={userId}
            mono
          />
        </MobileSection>

        {/* BUSINESS — skeleton */}
        <MobileSection label="Business">
          <MobileRow
            icon="🏢"
            iconBg="bg-secondary"
            title="Business account"
            subtitle="Not set up"
            disabled
            badge={
              <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 mr-1">
                Soon
              </span>
            }
          />
          <MobileRow
            icon="🍺"
            iconBg="bg-amber-700/30"
            title="My venues"
            subtitle="Owner dashboard"
            disabled
          />
        </MobileSection>

        {/* MEMBERSHIP — skeleton */}
        <MobileSection label="Membership">
          <MobileRow
            icon="⚡"
            iconBg="bg-amber-500/20"
            title="Subscription"
            subtitle="Free plan"
            disabled
            badge={
              <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 mr-1">
                Soon
              </span>
            }
          />
          <MobileRow
            icon="💳"
            iconBg="bg-secondary"
            title="Payment method"
            subtitle="Not set"
            disabled
          />
        </MobileSection>

        {/* ACTIVITY */}
        <MobileSection label="Activity">
          <MobileRow
            icon="⭐"
            iconBg="bg-amber-700/30"
            title="Reviews done"
            subtitle="Your pub ratings"
            badge={
              reviewsQuery.data ? (
                <span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded-lg tabular-nums mr-1">
                  {reviewCount}
                </span>
              ) : undefined
            }
          />
          <MobileRow
            icon="⏳"
            iconBg="bg-secondary"
            title="Pending requests"
            subtitle="Place submissions"
            badge={
              requestsQuery.data ? (
                <span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded-lg tabular-nums mr-1">
                  {requestsQuery.data.length}
                </span>
              ) : undefined
            }
          />
        </MobileSection>

        {/* LOCATION */}
        <MobileSection label="Location">
          {geoStatus === "granted" ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base bg-red-500/20">
                📍
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug">
                  {address ?? "Location active"}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <button
                onClick={disableGeo}
                className="text-xs text-muted-foreground border border-border rounded px-2.5 py-1 shrink-0"
              >
                Disable
              </button>
            </div>
          ) : geoStatus === "denied" ? (
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base bg-red-500/20">
                📍
              </div>
              <p className="text-xs text-red-500 flex-1">
                Blocked — reset in browser site settings.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base bg-red-500/20">
                📍
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Location</p>
                <p className="text-xs text-muted-foreground">Not enabled</p>
              </div>
              <button
                onClick={enableGeo}
                disabled={geoStatus === "loading" || geoStatus === "unavailable"}
                className="text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-3 py-1.5 shrink-0 transition-colors"
              >
                {geoStatus === "loading" ? "…" : "Enable"}
              </button>
            </div>
          )}
        </MobileSection>

        {/* PREFERENCES */}
        <MobileSection label="Preferences">
          <MobileToggleRow
            icon="🍺"
            iconBg="bg-amber-700/30"
            title="Show pubs on map"
            subtitle="Filter map results"
            checked={preferences.pub_preference}
            onChange={() => toggle("pub_preference")}
          />
          <MobileToggleRow
            icon="🥂"
            iconBg="bg-amber-700/30"
            title="Show bars on map"
            subtitle="Filter map results"
            checked={preferences.bar_preference}
            onChange={() => toggle("bar_preference")}
          />
          <MobileToggleRow
            icon="🗺️"
            iconBg="bg-secondary"
            title="Auto-zoom to location"
            subtitle="On map load"
            checked={preferences.automatic_zoom}
            onChange={() => toggle("automatic_zoom")}
          />
          <MobileToggleRow
            icon="🔔"
            iconBg="bg-secondary"
            title="Email notifications"
            subtitle="Reviews & replies"
            checked={false}
            onChange={() => {}}
            disabled
          />
          <MobileToggleRow
            icon="📊"
            iconBg="bg-secondary"
            title="Weekly insights"
            subtitle="Every Monday, 8:00"
            checked={false}
            onChange={() => {}}
            disabled
          />
          <MobileToggleRow
            icon="🌙"
            iconBg="bg-secondary"
            title="Dark theme"
            subtitle="Match system"
            checked={true}
            onChange={() => {}}
            disabled
          />
        </MobileSection>

        {/* Log out */}
        <div className="px-4 mb-8">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="w-full text-center py-3 rounded-2xl border border-border bg-card text-sm font-medium text-red-500 hover:bg-red-500/5 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════
          DESKTOP  (hidden below md)
      ════════════════════════════════════ */}
      <div className="hidden md:flex h-screen bg-background overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 flex flex-col border-r border-border py-8 px-3 overflow-y-auto">
          <nav className="flex flex-col gap-0.5 flex-1">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">
              <span className="text-base leading-none">👤</span>
              <span>Profile</span>
            </div>

            {(
              [
                { icon: "🏠", label: "My venues" },
                {
                  icon: "⭐",
                  label: "Reviews done",
                  count: reviewsQuery.data ? reviewCount : undefined,
                },
                {
                  icon: "📋",
                  label: "Pending requests",
                  count:
                    requestsQuery.data && pendingCount > 0 ? pendingCount : undefined,
                },
                { icon: "⚡", label: "Subscription" },
              ] as { icon: string; label: string; count?: number }[]
            ).map(({ icon, label, count }) => (
              <div
                key={label}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-muted-foreground text-sm cursor-not-allowed opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{icon}</span>
                  <span>{label}</span>
                </div>
                {count !== undefined && (
                  <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full tabular-nums">
                    {count}
                  </span>
                )}
              </div>
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

        {/* ── Main ── */}
        <main className="flex-1 overflow-y-auto py-10 px-12">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Profile</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account and how Pub Rater works for you.
              </p>
            </div>

            {/* ── Profile header card ── */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden shrink-0 text-xl">
                    {avatarEl}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Member since {joinedAt}</p>
                  </div>
                </div>

                <label className="text-sm font-medium text-foreground border border-border hover:border-primary/50 rounded-lg px-4 py-2 transition-colors cursor-pointer whitespace-nowrap">
                  {avatarUploading ? "Uploading…" : "Edit photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={avatarUploading}
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              {avatarError && <p className="text-xs text-red-500 mb-4">{avatarError}</p>}

              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  value={reviewsQuery.isLoading ? "—" : reviewCount}
                  label="Reviews written"
                />
                <StatCard
                  value={requestsQuery.isLoading ? "—" : (requestsQuery.data?.length ?? 0)}
                  label="Requests submitted"
                />
                <StatCard value={pendingCount} label="Pending" />
              </div>
            </div>

            {/* ── Account + Business ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">
                    👤
                  </div>
                  <span className="font-semibold text-foreground text-sm">Account</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Email</p>
                    <p className="text-sm font-medium text-foreground">{email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Phone</p>
                    <p className="text-sm text-muted-foreground italic">Not set</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Member since
                    </p>
                    <p className="text-sm font-medium text-foreground">{joinedAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">User ID</p>
                    <p className="text-xs font-mono text-muted-foreground break-all">{userId}</p>
                  </div>
                </div>
              </div>

              {/* Business — not yet implemented */}
              <div className="rounded-2xl border border-border bg-card p-5 opacity-60">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">
                      🏢
                    </div>
                    <div>
                      <span className="font-semibold text-foreground text-sm">Business</span>
                      <p className="text-xs text-muted-foreground">Owner account</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                    Coming soon
                  </span>
                </div>
                <div className="space-y-3">
                  {["Legal name", "Tax ID", "Operating since", "Venues"].map((label) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                        {label}
                      </p>
                      <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Subscription — not yet implemented ── */}
            <div className="rounded-2xl border border-border bg-card p-5 opacity-60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">
                    ⚡
                  </div>
                  <div>
                    <span className="font-semibold text-foreground text-sm">
                      Subscription & billing
                    </span>
                    <p className="text-xs text-muted-foreground">Free plan</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                  Coming soon
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {["Plan", "Price", "Renews", "Payment"].map((label) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      {label}
                    </p>
                    <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Location + Pending requests ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-sm">
                      📍
                    </div>
                    <span className="font-semibold text-foreground text-sm">Location</span>
                  </div>
                  {geoStatus === "granted" && (
                    <button
                      onClick={disableGeo}
                      className="text-xs text-muted-foreground border border-border hover:border-primary/50 rounded px-2.5 py-1 transition-colors"
                    >
                      Disable
                    </button>
                  )}
                </div>

                {geoStatus === "granted" && (
                  <p className="text-sm text-foreground leading-snug">
                    {address ?? "Location active"}
                  </p>
                )}
                {geoStatus === "denied" && (
                  <p className="text-xs text-red-500">
                    Location blocked — reset in browser site settings.
                  </p>
                )}
                {geoStatus === "unavailable" && (
                  <p className="text-xs text-muted-foreground">Geolocation not supported.</p>
                )}
                {(geoStatus === "idle" || geoStatus === "loading") && (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      Enable location to see nearby pubs.
                    </p>
                    <button
                      onClick={enableGeo}
                      disabled={geoStatus === "loading"}
                      className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
                    >
                      {geoStatus === "loading" ? "Locating…" : "Enable location"}
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">
                    📋
                  </div>
                  <div>
                    <span className="font-semibold text-foreground text-sm">Pending requests</span>
                    {requestsQuery.data && (
                      <p className="text-xs text-muted-foreground">{pendingCount} in review</p>
                    )}
                  </div>
                </div>

                {requestsQuery.isLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-secondary/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                )}

                {requestsQuery.isError && (
                  <p className="text-sm text-red-500">Failed to load requests.</p>
                )}

                {requestsQuery.data && requestsQuery.data.length === 0 && (
                  <p className="text-sm text-muted-foreground">No requests submitted yet.</p>
                )}

                {requestsQuery.data && requestsQuery.data.length > 0 && (
                  <div className="max-h-52 overflow-y-auto">
                    {requestsQuery.data.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">
                            {req.type === "owner_claim"
                              ? "Ownership claim"
                              : (req.name ?? AMENITY_LABELS[req.amenity] ?? req.amenity)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${STATUS_STYLES[req.status]}`}
                        >
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Preferences ── */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">
                  ⚙️
                </div>
                <span className="font-semibold text-foreground text-sm">Preferences</span>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Show pubs on map</p>
                    <p className="text-xs text-muted-foreground">🍺 Filter map results</p>
                  </div>
                  <Toggle
                    checked={preferences.pub_preference}
                    onChange={() => toggle("pub_preference")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Show bars on map</p>
                    <p className="text-xs text-muted-foreground">🥂 Filter map results</p>
                  </div>
                  <Toggle
                    checked={preferences.bar_preference}
                    onChange={() => toggle("bar_preference")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto-zoom to my location</p>
                    <p className="text-xs text-muted-foreground">Zoom to your position on map load</p>
                  </div>
                  <Toggle
                    checked={preferences.automatic_zoom}
                    onChange={() => toggle("automatic_zoom")}
                  />
                </div>

                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Weekly insights digest</p>
                    <p className="text-xs text-muted-foreground">Every Monday, 8:00</p>
                  </div>
                  <Toggle checked={false} onChange={() => {}} disabled />
                </div>

                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Promotion tips</p>
                    <p className="text-xs text-muted-foreground">Boost suggestions</p>
                  </div>
                  <Toggle checked={false} onChange={() => {}} disabled />
                </div>

                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Dark theme</p>
                    <p className="text-xs text-muted-foreground">Match system</p>
                  </div>
                  <Toggle checked={true} onChange={() => {}} disabled />
                </div>
              </div>

              {saveMutation.isSuccess && (
                <p className="text-xs text-green-500 mt-4">Preferences saved.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
