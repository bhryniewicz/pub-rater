"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type Review } from "@/lib/supabase";
import { isOpenNow, DAY_KEYS } from "@/lib/opening-hours";
import type { OpeningHours } from "@/schemas/entities";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/context/geolocation-context";
import { LuNavigation, LuThumbsUp, LuPencil, LuCheck, LuShare2 } from "react-icons/lu";
import { PubLine } from "@/assets/icons";
import { ClaimForm } from "@/features/requests/components/claim-form";
import { EditPlaceDialog } from "@/features/place/components/edit-place-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { RateDialog, type GuestCheckValues } from "@/features/place/components/rate-dialog";
import {
  AMENITY_CONFIG,
  OtherAmenityIcon,
  type AmenityKey,
} from "@/lib/amenities";
import { usePlace } from "@/features/place/api/get-place";
import { useCreateReview } from "@/features/place/api/create-review";
import { useToggleThumbsUp } from "@/features/place/api/toggle-thumbs-up";

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
  const tGC = useTranslations("guestCheck");
  const { id } = useParams<{ id: string }>();
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

  function avgSubRating(field: "atmosphere" | "service" | "space") {
    const vals = reviews.map((r) => r[field]).filter((v): v is number => v != null && v > 0);
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
  }
  const avgAtmosphere = avgSubRating("atmosphere");
  const avgService = avgSubRating("service");
  const avgSpace = avgSubRating("space");

  const tickedKeys = new Set(reviews.flatMap((r) => r.additional_info ?? []));

  const amenityAgreeCount = new Map<string, number>();
  for (const r of reviews) {
    for (const key of r.additional_info ?? []) {
      amenityAgreeCount.set(key, (amenityAgreeCount.get(key) ?? 0) + 1);
    }
  }
  const ownerAmenities = (place?.amenities ?? []) as AmenityKey[];
  const hasOwnerAmenities = ownerAmenities.length > 0 || !!place?.amenity_other;

  const now = new Date();
  const jsDay = now.getDay();
  const todayKey = DAY_KEYS[jsDay === 0 ? 6 : jsDay - 1];
  const todayHours = place?.opening_hours?.[todayKey];
  const todayHoursLabel = todayHours
    ? `${todayHours.open} – ${todayHours.close ?? "late"}`
    : null;

  const showEdit = isAdmin || (isOwner && marker.owner_id === user?.id);
  const showClaim = (isOwner || isAdmin) && !marker.owner_id;

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

        {/* Title */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {marker.place_type}
          </div>
          <h1 className="pub-name text-4xl sm:text-5xl font-black text-foreground leading-tight mb-2 uppercase">
            {marker.name}
          </h1>
          {place?.city && (
            <p className="text-sm text-muted-foreground">{place.city}</p>
          )}
        </div>

        {/* Rating */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Overall */}
          <div className="shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-6xl font-black text-primary leading-none">
                {avgRating != null ? avgRating.toFixed(1) : "—"}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) =>
                  avgRating != null && avgRating >= s ? (
                    <PubLine key={s} size={18} className="text-primary" />
                  ) : (
                    <PubLine key={s} size={18} className="text-muted-foreground/40" />
                  ),
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {reviews.length !== 1
                ? t("reviewsPlural", { count: reviews.length })
                : t("reviews", { count: reviews.length })}
            </p>
          </div>

          {/* Sub-rating bars */}
          <div className="flex-1 space-y-2.5 sm:pt-2">
            {[
              { label: t("atmosphere"), value: avgAtmosphere },
              { label: t("service"), value: avgService },
              { label: t("theSpace"), value: avgSpace },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24 shrink-0">
                  {label}
                </span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: value != null ? `${(value / 5) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-6 text-right">
                  {value != null ? value.toFixed(1) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button onClick={() => setRateOpen(true)}>
              {t("rateThisPlace")}
            </Button>
          ) : (
            <Link href="/login">
              <Button>{t("rateThisPlace")}</Button>
            </Link>
          )}
          <button
            onClick={() => navigateToPlace(marker.lat, marker.lon)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            <LuNavigation className="w-4 h-4 shrink-0" />
            {t("directions")}
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            <LuShare2 className="w-4 h-4 shrink-0" />
            {copied ? t("copied") : t("share")}
          </button>
          {showEdit && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
            >
              <LuPencil className="w-4 h-4 shrink-0" />
              {t("editPlace")}
            </button>
          )}
          {showClaim && (
            <Dialog>
              <DialogTrigger
                render={
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors" />
                }
              >
                {t("claimThis")}
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <ClaimForm markerId={marker.id} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* The Basics */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            {t("placeDetails")}
          </h3>
          <div className="flex flex-wrap gap-2">
            <BasicsPill label={t("address")} value={place?.address} />
            <BasicsPill label={t("phone")} value={place?.phone} />
            <BasicsPill
              label={t("website")}
              value={
                place?.website ? (
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {place.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null
              }
            />
            <BasicsPill label={t("instagram")} value={null} />
            <BasicsPill label={t("price")} value={null} />
            <BasicsPill
              label={t("hours")}
              value={
                todayHoursLabel ? (
                  <span className="flex items-center gap-1.5">
                    {place?.opening_hours && (
                      <OpenStatusBadge hours={place.opening_hours} />
                    )}
                    {todayHoursLabel}
                  </span>
                ) : (
                  place?.opening_hours ? (
                    <OpenStatusBadge hours={place.opening_hours} />
                  ) : null
                )
              }
            />
          </div>
        </div>

        {/* Owner-declared amenities */}
        {hasOwnerAmenities && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              {t("amenities")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {ownerAmenities.map((key) => {
                const config = AMENITY_CONFIG[key];
                if (!config) return null;
                const { labelKey, Icon } = config;
                const agree = amenityAgreeCount.get(key) ?? 0;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border"
                  >
                    <Icon className="w-4 h-4 shrink-0 text-primary" />
                    <span className="text-xs font-medium text-foreground capitalize">
                      {tGC(labelKey).toLowerCase()}
                    </span>
                    {agree > 0 && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {t("ratersAgree", { count: agree })}
                      </span>
                    )}
                  </div>
                );
              })}
              {place?.amenity_other && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
                  <OtherAmenityIcon className="w-4 h-4 shrink-0 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    {place.amenity_other}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What Raters Tick */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            {t("whatRatersTick")}
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {(
              [
                { key: "great_beer_selection", label: tGC("beerSelection") },
                { key: "lots_of_beers_on_tap", label: tGC("beersOnTap") },
                { key: "serves_food", label: tGC("servesFood") },
                { key: "live_music", label: tGC("liveMusic") },
                { key: "dog_friendly", label: tGC("dogFriendly") },
                { key: "outdoor_seating", label: tGC("outdoor") },
                { key: "smoking_area", label: tGC("smoking") },
              ] as const
            ).map(({ key, label }) => {
              const ticked = tickedKeys.has(key);
              return (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 shrink-0 rounded-[3px] border flex items-center justify-center transition-colors ${
                      ticked ? "bg-primary border-primary" : "border-border bg-secondary"
                    }`}
                  >
                    {ticked && <LuCheck className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />}
                  </span>
                  <span className="text-xs text-foreground capitalize">
                    {label.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* The Conversation */}
        <div>
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
            <select className="text-xs font-medium bg-secondary border border-border rounded-lg px-3 py-2 text-foreground">
              <option>{t("newestFirst")}</option>
              <option>{t("oldestFirst")}</option>
              <option>{t("topRated")}</option>
            </select>
          </div>

          <RateDialog
            open={rateOpen}
            onOpenChange={setRateOpen}
            markerName={marker.name}
            markerPlaceType={marker.place_type}
            placeCity={place?.city}
            placeShortCode={place?.short_code}
            onSubmit={(values: GuestCheckValues) =>
              commentMutation.mutate(
                { ...values, userId: user!.id, userEmail: user!.email! },
                { onSuccess: () => setRateOpen(false) },
              )
            }
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
    <div className="py-4 border-b border-border last:border-0">
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

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <button
          onClick={() => thumbsMutation.mutate({ reviewId: review.id, userId: userId!, thumbsUps, hasThumbedUp })}
          disabled={!userId || thumbsMutation.isPending}
          className={`flex items-center gap-1 transition-colors ${hasThumbedUp ? "text-primary font-semibold" : "hover:text-foreground"} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <LuThumbsUp className="w-3.5 h-3.5" />
          {thumbsUps.length > 0 && <span className="ml-0.5">{thumbsUps.length}</span>}
        </button>
        <button className="hover:text-foreground transition-colors ml-auto">{t("report")}</button>
      </div>
    </div>
  );
}

function BasicsPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground shrink-0 pt-px">
        {label}
      </span>
      <span className="text-xs text-foreground min-w-0">
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
      className={`inline-flex items-center gap-1 text-[10px] font-bold ${open ? "text-open" : "text-muted-foreground"}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${open ? "bg-open" : "bg-muted-foreground"}`} />
      {open ? t("open") : t("closed")}
    </span>
  );
}
