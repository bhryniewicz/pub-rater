"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type Place, type Review } from "@/lib/supabase";
import { isOpenNow, DAY_KEYS } from "@/lib/opening-hours";
import type { OpeningHours } from "@/features/places/schemas";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/context/geolocation-context";
import { LuCopy, LuNavigation, LuThumbsUp, LuChevronRight, LuPencil } from "react-icons/lu";
import { PubLine } from "@/assets/icons";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { ClaimForm } from "@/features/requests/components/claim-form";
import { EditPlaceDialog } from "@/features/admin/components/edit-place-dialog";
import { Button } from "@/components/ui/button";
import { RateDialog, type GuestCheckValues } from "@/features/places/components/rate-dialog";
import { usePlace, type MarkerInfo } from "@/features/places/api/get-place";
import { useCreateReview } from "@/features/places/api/create-review";
import { useToggleThumbsUp } from "@/features/places/api/toggle-thumbs-up";

function avatarInitials(email: string): string {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PlaceDetail() {
  const t = useTranslations("places");
  const tCommon = useTranslations("common");
  const DAY_LABELS: Record<string, string> = {
    mo: t("monday"),
    tu: t("tuesday"),
    we: t("wednesday"),
    th: t("thursday"),
    fr: t("friday"),
    sa: t("saturday"),
    su: t("sunday"),
  };
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isOwner, isAdmin } = useUser();
  const { coords: userLocation } = useGeolocation();
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  function copyLink() {
    const url = place?.short_code
      ? `${window.location.origin}/p/${place.short_code}`
      : window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function navigateToPlace(lat: number, lon: number) {
    const destination = `${lat},${lon}`;
    const origin = userLocation ? `${userLocation.lat},${userLocation.lon}` : "";
    const url = `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ""}&destination=${destination}&travelmode=walking`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const { data } = usePlace(id);
  const { marker, place, reviews } = data;

  const commentMutation = useCreateReview(id);

  const commentReviews = reviews.filter((r) => r.comment);

  const avgRating =
    place?.app_rating ??
    (reviews.length
      ? Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length) * 10) / 10
      : null);

  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length,
  );
  const maxCount = Math.max(...ratingCounts, 1);

  const now = new Date();
  const jsDay = now.getDay();
  const todayKey = DAY_KEYS[jsDay === 0 ? 6 : jsDay - 1];

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 sm:mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">{t("home")}</Link>
          <LuChevronRight className="w-3 h-3" />
          {place?.city && (
            <>
              <span>{place.city}</span>
              <LuChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="pub-name text-foreground font-medium">{marker.name}</span>
        </nav>

        {/* Hero */}
        <div className="flex flex-col md:grid md:grid-cols-5 gap-6 mb-6 bg-card border border-border rounded-2xl p-5 sm:p-8">
          <div className="md:col-span-3 flex flex-col gap-4">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {marker.place_type}
            </div>
            <h1 className="pub-name text-3xl sm:text-4xl font-black text-foreground leading-tight">{marker.name}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("noDescription")}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-secondary border border-border text-xs font-medium text-muted-foreground capitalize">
                {marker.place_type}
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-end gap-3 mb-3">
              <span className="text-5xl sm:text-6xl font-black text-primary leading-none">
                {avgRating != null ? avgRating.toFixed(1) : "—"}
              </span>
              <div className="pb-1">
                <div className="flex gap-0.5 mb-0.5">
                  {[1, 2, 3, 4, 5].map((s) =>
                    avgRating != null && avgRating >= s ? (
                      <PubLine key={s} size={18} className="text-primary" />
                    ) : (
                      <PubLine key={s} size={18} className="text-muted-foreground/40" />
                    ),
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reviews.length !== 1
                    ? t("reviewsPlural", { count: reviews.length })
                    : t("reviews", { count: reviews.length })}
                </p>
              </div>
            </div>
            <RatingBreakdown
              items={[5, 4, 3, 2, 1].map((star, i) => ({ star, count: ratingCounts[i] }))}
            />
          </div>
        </div>

        {/* Main content grid — desktop: 5-col (comments left, sidebar right); mobile: stacked with sidebar first */}
        <div className="flex flex-col md:grid md:grid-cols-5 gap-6">
          {/* Sidebar — order-first on mobile so it stacks above comments */}
          <div className="order-first md:order-last md:col-span-2 space-y-4">
            {/* Get There — second section (below hero) */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {t("getThere")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigateToPlace(marker.lat, marker.lon)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  <LuNavigation className="w-4 h-4 shrink-0" />
                  {t("navigate")}
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <LuCopy className="w-4 h-4 shrink-0" />
                  {copied ? t("copied") : t("copyLink")}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {t("placeDetails")}
              </h3>
              <div className="space-y-3">
                <SidebarRow label={t("address")} value={place?.address} />
                <SidebarRow label={t("city")} value={place?.city} />
                <SidebarRow label={t("phone")} value={place?.phone} />
                <SidebarRow
                  label={t("website")}
                  value={
                    place?.website ? (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {place.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null
                  }
                />
                <SidebarRow label={t("instagram")} value={null} />
                <SidebarRow label={t("price")} value={null} />
                <SidebarRow label={t("founded")} value={null} />
                <SidebarRow label={t("capacity")} value={null} />
                <SidebarRow label={t("onTap")} value={null} />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("hours")}
                </h3>
                {place?.opening_hours && (
                  <OpenStatusBadge hours={place.opening_hours} />
                )}
              </div>
              {place?.opening_hours ? (
                <div className="space-y-1">
                  {DAY_KEYS.map((key) => {
                    const day = place.opening_hours![key];
                    const isToday = key === todayKey;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${isToday ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        <span className="text-xs w-24">{DAY_LABELS[key]}</span>
                        <span className="text-xs">
                          {day ? `${day.open} – ${day.close ?? "late"}` : tCommon("closed")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("noHours")}</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {t("amenities")}
              </h3>
              <p className="text-xs text-muted-foreground">{t("noAmenities")}</p>
            </div>

            {(isAdmin || (isOwner && marker.owner_id === user?.id)) && (
              <button
                onClick={() => setEditOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                <LuPencil className="w-4 h-4 shrink-0" />
                {t("editPlace")}
              </button>
            )}

            {(isOwner || isAdmin) && !marker.owner_id && (
              <ClaimForm markerId={marker.id} />
            )}
          </div>

          {/* Comments — order-last on mobile, left column on desktop */}
          <div className="order-last md:order-first md:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  {t("theConversation")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                  {t("comments")}
                  <span className="text-xl font-medium text-muted-foreground ml-3">· {commentReviews.length}</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {user ? (
                  <Button onClick={() => setRateOpen(true)}>
                    {t("rateThisPlace")}
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button>Rate this place</Button>
                  </Link>
                )}
                <select className="text-xs font-medium bg-secondary border border-border rounded-lg px-3 py-2 text-foreground">
                  <option>{t("newestFirst")}</option>
                  <option>{t("oldestFirst")}</option>
                  <option>{t("topRated")}</option>
                </select>
              </div>
            </div>

            <RateDialog
              open={rateOpen}
              onOpenChange={setRateOpen}
              markerName={marker.name}
              markerPlaceType={marker.place_type}
              placeCity={place?.city}
              placeShortCode={place?.short_code}
              onSubmit={(values: GuestCheckValues) => commentMutation.mutate({ ...values, userId: user!.id, userEmail: user!.email! }, { onSuccess: () => setRateOpen(false) })}
              isPending={commentMutation.isPending}
              isError={commentMutation.isError}
            />

            {commentReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noComments")}</p>
            ) : (
              <div className="space-y-3">
                {commentReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    ownerUserId={marker.owner_id}
                    userId={user?.id ?? null}
                    markerId={id}
                  />
                ))}
              </div>
            )}

            {commentReviews.length > 0 && (
              <div className="mt-6 text-center">
                <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t("loadMore")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <EditPlaceDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          markerId={marker.id}
          markerName={marker.name}
          markerPlaceType={marker.place_type}
          place={place}
        />
      )}
    </main>
  );
}

function ReviewCard({
  review,
  ownerUserId,
  userId,
  markerId,
}: {
  review: Review;
  ownerUserId: string | null;
  userId: string | null;
  markerId: string;
}) {
  const t = useTranslations("places");
  const username = review.user_email?.split("@")[0] ?? "Anonymous";
  const initials = review.user_email ? avatarInitials(review.user_email) : "?";
  const isPlaceOwner = ownerUserId != null && review.user_id === ownerUserId;
  const thumbsUps = review.thumbs_ups ?? [];
  const hasThumbedUp = userId != null && thumbsUps.includes(userId);
  const thumbsMutation = useToggleThumbsUp(markerId);

  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-foreground">{initials}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{username}</p>
              {isPlaceOwner && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                  {t("placeOwner")}
                </span>
              )}
            </div>
            {review.created_at && (
              <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
            )}
          </div>
        </div>
        {review.rating != null && (
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) =>
                review.rating! >= s ? (
                  <PubLine key={s} size={14} className="text-primary" />
                ) : (
                  <PubLine key={s} size={14} className="text-muted-foreground/30" />
                ),
              )}
            </div>
            <span className="text-xs font-bold text-muted-foreground ml-1">{review.rating}.0</span>
          </div>
        )}
      </div>

      {review.comment && (
        <p className="text-sm text-foreground leading-relaxed mb-3">{review.comment}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3" />

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <button
          onClick={() => thumbsMutation.mutate({ reviewId: review.id, userId: userId!, thumbsUps, hasThumbedUp })}
          disabled={!userId || thumbsMutation.isPending}
          className={`flex items-center gap-1 transition-colors ${hasThumbedUp ? "text-primary font-semibold" : "hover:text-foreground"} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <LuThumbsUp className="w-3.5 h-3.5" />
          {thumbsUps.length > 0 && <span className="ml-0.5">{thumbsUps.length}</span>}
        </button>
        <button className="hover:text-foreground transition-colors">{t("reply")}</button>
        <button className="hover:text-foreground transition-colors ml-auto">{t("report")}</button>
      </div>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground w-20 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground min-w-0">
        {value ?? <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  );
}

function OpenStatusBadge({ hours }: { hours: OpeningHours }) {
  const t = useTranslations("places");
  const open = isOpenNow(hours);
  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${open ? "bg-open/10 text-open" : "bg-muted text-muted-foreground"}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-open" : "bg-muted-foreground"}`} />
      {open ? t("open") : t("closed")}
    </span>
  );
}
