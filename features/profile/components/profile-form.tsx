"use client";

import { useState, useEffect } from "react";
import { useSetLocale } from "@/context/intl-context";
import { useTranslations, useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useGeolocation } from "@/context/geolocation-context";
import { type PlaceRequest } from "@/features/requests/schemas";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useUserReviews } from "@/features/profile/api/get-user-reviews";
import { useUserRequests } from "@/features/profile/api/get-user-requests";
import { useUpdatePreferences } from "@/features/profile/api/update-preferences";
import { useResubmitOwnerClaim } from "@/features/requests/api/resubmit-owner-claim";
import { ResubmitPlaceDialog } from "@/features/owner/components/resubmit-place-dialog";
import { PLACE_TYPE_LABELS } from "@/features/places/place-type";

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
  need_more_info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
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
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const setLocale = useSetLocale();

  function switchLanguage(lang: "pl" | "en") {
    setLocale(lang);
  }
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Preferences>(
    initialPreferences ?? { pub_preference: true, bar_preference: true, automatic_zoom: true }
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const { status: geoStatus, address, enable: enableGeo, disable: disableGeo } =
    useGeolocation();
  const [resubmitRequest, setResubmitRequest] = useState<PlaceRequest | null>(null);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [claimDescriptions, setClaimDescriptions] = useState<Record<string, string>>({});
  const [claimErrors, setClaimErrors] = useState<Record<string, string | null>>({});

  const saveMutation = useUpdatePreferences(userId);
  const claimResubmitMutation = useResubmitOwnerClaim(userId);

  useEffect(() => {
    const channel = supabase
      .channel(`user_requests:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `requested_by=eq.${userId}` },
        () => { queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_REQUESTS(userId) }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const { data: reviews } = useUserReviews(userId);
  const { data: requests } = useUserRequests(userId);

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
  const reviewCount = reviews.length;
  const pendingCount = requests.filter((r) => r.status === "pending" || r.status === "need_more_info").length;

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
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
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
          <p className="text-xs text-muted-foreground px-4 mb-2">{t("uploading")}</p>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 px-4 mb-5">
          {[
            { value: "—", label: t("statsVenues") },
            { value: "—", label: t("statsRating") },
            { value: reviewCount, label: t("statsReviews") },
            { value: pendingCount, label: t("statsPending") },
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
        <MobileSection label={t("account")}>
          <MobileRow icon="✉️" iconBg="bg-amber-700/30" title={t("email")} subtitle={email} />
          <MobileRow icon="📞" iconBg="bg-amber-700/30" title={t("phone")} subtitle={t("notSet")} disabled />
          <MobileRow
            icon="📅"
            iconBg="bg-amber-700/30"
            title={t("memberSince")}
            subtitle={joinedAt}
          />
          <MobileRow
            icon="#"
            iconBg="bg-secondary"
            title={t("userId")}
            subtitle={userId}
            mono
          />
        </MobileSection>

        {/* BUSINESS — skeleton */}
        <MobileSection label={t("business")}>
          <MobileRow
            icon="🏢"
            iconBg="bg-secondary"
            title={t("businessAccountTitle")}
            subtitle={t("notSetUp")}
            disabled
            badge={
              <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 mr-1">
                {t("comingSoon")}
              </span>
            }
          />
          <MobileRow
            icon="🍺"
            iconBg="bg-amber-700/30"
            title={t("myVenues")}
            subtitle={t("ownerDashboard")}
            disabled
          />
        </MobileSection>

        {/* MEMBERSHIP — skeleton */}
        <MobileSection label={t("membership")}>
          <MobileRow
            icon="⚡"
            iconBg="bg-amber-500/20"
            title={t("subscription")}
            subtitle={t("freePlan")}
            disabled
            badge={
              <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 mr-1">
                {t("comingSoon")}
              </span>
            }
          />
          <MobileRow
            icon="💳"
            iconBg="bg-secondary"
            title={t("paymentMethod")}
            subtitle={t("notSet")}
            disabled
          />
        </MobileSection>

        {/* ACTIVITY */}
        <MobileSection label={t("activity")}>
          <MobileRow
            icon="⭐"
            iconBg="bg-amber-700/30"
            title={t("reviewsDone")}
            subtitle={t("yourPubRatings")}
            badge={
              <span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded-lg tabular-nums mr-1">
                {reviewCount}
              </span>
            }
          />
          <MobileRow
            icon="⏳"
            iconBg="bg-secondary"
            title={t("pendingRequests")}
            subtitle={t("placeSubmissions")}
            badge={
              <span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded-lg tabular-nums mr-1">
                {requests.length}
              </span>
            }
          />
        </MobileSection>

        {/* LOCATION */}
        <MobileSection label={t("location")}>
          {geoStatus === "granted" ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base bg-red-500/20">
                📍
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug">
                  {address ?? t("locationActive")}
                </p>
                <p className="text-xs text-muted-foreground">{t("locationActive2")}</p>
              </div>
              <button
                onClick={disableGeo}
                className="text-xs text-muted-foreground border border-border rounded px-2.5 py-1 shrink-0"
              >
                {t("locationDisable")}
              </button>
            </div>
          ) : geoStatus === "denied" ? (
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base bg-red-500/20">
                📍
              </div>
              <p className="text-xs text-red-500 flex-1">
                {t("locationBlocked")}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base bg-red-500/20">
                📍
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("location")}</p>
                <p className="text-xs text-muted-foreground">{t("locationNotEnabled")}</p>
              </div>
              <button
                onClick={enableGeo}
                disabled={geoStatus === "loading" || geoStatus === "unavailable"}
                className="text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-3 py-1.5 shrink-0 transition-colors"
              >
                {geoStatus === "loading" ? "…" : t("locationEnable")}
              </button>
            </div>
          )}
        </MobileSection>

        {/* PREFERENCES */}
        <MobileSection label={t("preferences")}>
          <MobileToggleRow
            icon="🍺"
            iconBg="bg-amber-700/30"
            title={t("showPubs")}
            subtitle={t("showPubsDesc")}
            checked={preferences.pub_preference}
            onChange={() => toggle("pub_preference")}
          />
          <MobileToggleRow
            icon="🥂"
            iconBg="bg-amber-700/30"
            title={t("showBars")}
            subtitle={t("showBarsDesc")}
            checked={preferences.bar_preference}
            onChange={() => toggle("bar_preference")}
          />
          <MobileToggleRow
            icon="🗺️"
            iconBg="bg-secondary"
            title={t("autoZoom")}
            subtitle={t("autoZoomDesc")}
            checked={preferences.automatic_zoom}
            onChange={() => toggle("automatic_zoom")}
          />
          <MobileToggleRow
            icon="🔔"
            iconBg="bg-secondary"
            title={t("emailNotifications")}
            subtitle={t("emailNotificationsDesc")}
            checked={false}
            onChange={() => {}}
            disabled
          />
          <MobileToggleRow
            icon="📊"
            iconBg="bg-secondary"
            title={t("weeklyInsights")}
            subtitle={t("weeklyInsightsDesc")}
            checked={false}
            onChange={() => {}}
            disabled
          />
          <MobileToggleRow
            icon="🌙"
            iconBg="bg-secondary"
            title={t("darkTheme")}
            subtitle={t("darkThemeDesc")}
            checked={true}
            onChange={() => {}}
            disabled
          />
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base bg-secondary">
              🌐
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">{t("language")}</p>
              <p className="text-xs text-muted-foreground leading-snug">{t("languageDesc")}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => switchLanguage("pl")}
                className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === "pl" ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"}`}
              >
                PL
              </button>
              <span className="text-border text-xs">|</span>
              <button
                onClick={() => switchLanguage("en")}
                className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === "en" ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"}`}
              >
                EN
              </button>
            </div>
          </div>
        </MobileSection>

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
              <span>{t("title")}</span>
            </div>

            {(
              [
                { icon: "🏠", label: t("myVenues") },
                {
                  icon: "⭐",
                  label: t("reviewsDone"),
                  count: reviewCount,
                },
                {
                  icon: "📋",
                  label: t("pendingRequests"),
                  count: pendingCount > 0 ? pendingCount : undefined,
                },
                { icon: "⚡", label: t("subscription") },
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
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 overflow-y-auto py-10 px-12">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("subtitle")}
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
                    <p className="text-xs text-muted-foreground mt-0.5">{t("memberSince")} {joinedAt}</p>
                  </div>
                </div>

                <label className="text-sm font-medium text-foreground border border-border hover:border-primary/50 rounded-lg px-4 py-2 transition-colors cursor-pointer whitespace-nowrap">
                  {avatarUploading ? t("uploading") : t("editPhoto")}
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
                  value={reviewCount}
                  label={t("reviewsWritten")}
                />
                <StatCard
                  value={requests.length}
                  label={t("requestsSubmitted")}
                />
                <StatCard value={pendingCount} label={t("pending")} />
              </div>
            </div>

            {/* ── Account + Business ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">
                    👤
                  </div>
                  <span className="font-semibold text-foreground text-sm">{t("account")}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t("email")}</p>
                    <p className="text-sm font-medium text-foreground">{email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t("phone")}</p>
                    <p className="text-sm text-muted-foreground italic">{t("notSet")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      {t("memberSince")}
                    </p>
                    <p className="text-sm font-medium text-foreground">{joinedAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{t("userId")}</p>
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
                      <span className="font-semibold text-foreground text-sm">{t("business")}</span>
                      <p className="text-xs text-muted-foreground">{t("ownerAccount")}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                    {t("comingSoon")}
                  </span>
                </div>
                <div className="space-y-3">
                  {[t("legalName"), t("taxId"), t("operatingSince"), t("venues")].map((label) => (
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
                      {t("subscriptionBilling")}
                    </span>
                    <p className="text-xs text-muted-foreground">{t("freePlan")}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                  {t("comingSoon")}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[t("plan"), t("price"), t("renews"), t("payment")].map((label) => (
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
                    <span className="font-semibold text-foreground text-sm">{t("location")}</span>
                  </div>
                  {geoStatus === "granted" && (
                    <button
                      onClick={disableGeo}
                      className="text-xs text-muted-foreground border border-border hover:border-primary/50 rounded px-2.5 py-1 transition-colors"
                    >
                      {t("locationDisable")}
                    </button>
                  )}
                </div>

                {geoStatus === "granted" && (
                  <p className="text-sm text-foreground leading-snug">
                    {address ?? t("locationActive")}
                  </p>
                )}
                {geoStatus === "denied" && (
                  <p className="text-xs text-red-500">
                    {t("locationBlockedDesktop")}
                  </p>
                )}
                {geoStatus === "unavailable" && (
                  <p className="text-xs text-muted-foreground">{t("locationUnavailable")}</p>
                )}
                {(geoStatus === "idle" || geoStatus === "loading") && (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("locationEnableNearby")}
                    </p>
                    <button
                      onClick={enableGeo}
                      disabled={geoStatus === "loading"}
                      className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
                    >
                      {geoStatus === "loading" ? t("locationLocating") : t("locationEnableButton")}
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
                    <span className="font-semibold text-foreground text-sm">{t("pendingRequests")}</span>
                    <p className="text-xs text-muted-foreground">{t("pendingRequestsCount", { count: pendingCount })}</p>
                  </div>
                </div>

                {requests.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
                )}

                {requests.length > 0 && (
                  <div className="max-h-96 overflow-y-auto space-y-0">
                    {requests.map((req) => {
                      const label =
                        req.type === "owner_claim"
                          ? t("ownershipClaim")
                          : (req.type === "place_request" ? (req.name ?? PLACE_TYPE_LABELS[req.place_type] ?? req.place_type) : "");
                      const isNeedInfo = req.status === "need_more_info";
                      const isClaimExpanded = expandedClaimId === req.id;
                      return (
                        <div key={req.id} className="border-b border-border last:border-0">
                          <div className="flex items-center justify-between py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground leading-tight truncate">
                                {label}
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
                              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${STATUS_STYLES[req.status] ?? ""}`}
                            >
                              {req.status === "need_more_info" ? t("needsInfo") : req.status}
                            </span>
                          </div>
                          {isNeedInfo && req.admin_comment && (
                            <div className="mb-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                              <p className="text-blue-400 font-medium mb-0.5">{t("adminMessage")}</p>
                              <p className="text-foreground/80">{req.admin_comment}</p>
                            </div>
                          )}
                          {isNeedInfo && req.type === "place_request" && (
                            <button
                              onClick={() => setResubmitRequest(req as PlaceRequest)}
                              className="mb-2.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                              {t("provideInfo")}
                            </button>
                          )}
                          {isNeedInfo && req.type === "owner_claim" && (
                            <div className="mb-2.5 space-y-2">
                              {isClaimExpanded ? (
                                <>
                                  <textarea
                                    value={claimDescriptions[req.id] ?? (req.description ?? "")}
                                    onChange={(e) =>
                                      setClaimDescriptions((prev) => ({ ...prev, [req.id]: e.target.value }))
                                    }
                                    placeholder={t("updateOwnershipDesc")}
                                    rows={3}
                                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  {claimErrors[req.id] && (
                                    <p className="text-xs text-red-500">{claimErrors[req.id]}</p>
                                  )}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const desc = claimDescriptions[req.id] ?? req.description ?? "";
                                        if (!desc.trim()) {
                                          setClaimErrors((prev) => ({ ...prev, [req.id]: t("descRequired") }));
                                          return;
                                        }
                                        claimResubmitMutation.mutate({ requestId: req.id, description: desc }, {
                                          onSuccess: (_data, variables) => {
                                            setExpandedClaimId(null);
                                            setClaimDescriptions((prev) => { const n = { ...prev }; delete n[variables.requestId]; return n; });
                                            setClaimErrors((prev) => { const n = { ...prev }; delete n[variables.requestId]; return n; });
                                          },
                                          onError: (_err, variables) => {
                                            setClaimErrors((prev) => ({ ...prev, [variables.requestId]: "Failed to submit. Please try again." }));
                                          },
                                        });
                                      }}
                                      disabled={claimResubmitMutation.isPending && claimResubmitMutation.variables?.requestId === req.id}
                                      className="text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors"
                                    >
                                      {claimResubmitMutation.isPending && claimResubmitMutation.variables?.requestId === req.id ? tCommon("submitting") : t("resubmit")}
                                    </button>
                                    <button
                                      onClick={() => setExpandedClaimId(null)}
                                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {tCommon("cancel")}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setExpandedClaimId(req.id);
                                    setClaimDescriptions((prev) => ({
                                      ...prev,
                                      [req.id]: prev[req.id] ?? (req.description ?? ""),
                                    }));
                                  }}
                                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                  {t("provideInfo")}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                <span className="font-semibold text-foreground text-sm">{t("preferences")}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("showPubs")}</p>
                    <p className="text-xs text-muted-foreground">{t("showPubsDesc")}</p>
                  </div>
                  <Toggle
                    checked={preferences.pub_preference}
                    onChange={() => toggle("pub_preference")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("showBars")}</p>
                    <p className="text-xs text-muted-foreground">{t("showBarsDesc")}</p>
                  </div>
                  <Toggle
                    checked={preferences.bar_preference}
                    onChange={() => toggle("bar_preference")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("autoZoom")}</p>
                    <p className="text-xs text-muted-foreground">{t("autoZoomDesc")}</p>
                  </div>
                  <Toggle
                    checked={preferences.automatic_zoom}
                    onChange={() => toggle("automatic_zoom")}
                  />
                </div>

                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("weeklyInsights")}</p>
                    <p className="text-xs text-muted-foreground">{t("weeklyInsightsDesc")}</p>
                  </div>
                  <Toggle checked={false} onChange={() => {}} disabled />
                </div>

                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("promotionTips")}</p>
                    <p className="text-xs text-muted-foreground">{t("promotionTipsDesc")}</p>
                  </div>
                  <Toggle checked={false} onChange={() => {}} disabled />
                </div>

                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("darkTheme")}</p>
                    <p className="text-xs text-muted-foreground">{t("darkThemeDesc")}</p>
                  </div>
                  <Toggle checked={true} onChange={() => {}} disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("language")}</p>
                    <p className="text-xs text-muted-foreground">{t("languageDesc")}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => switchLanguage("pl")}
                      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === "pl" ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      PL
                    </button>
                    <span className="text-border text-xs">|</span>
                    <button
                      onClick={() => switchLanguage("en")}
                      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === "en" ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>

              {saveMutation.isSuccess && (
                <p className="text-xs text-green-500 mt-4">{t("preferencesSaved")}</p>
              )}
            </div>
          </div>
        </main>
      </div>

      {resubmitRequest && (
        <ResubmitPlaceDialog
          open={true}
          onOpenChange={(open) => { if (!open) setResubmitRequest(null); }}
          request={resubmitRequest}
        />
      )}
    </>
  );
}
