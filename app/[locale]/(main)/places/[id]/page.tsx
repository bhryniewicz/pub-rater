"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Place, type Review } from "@/lib/supabase";
import { isOpenNow, DAY_KEYS, type OpeningHours } from "@/lib/opening-hours";
import { useUser } from "@/hooks/use-user";
import { useGeolocation } from "@/context/geolocation-context";
import { LuCopy, LuNavigation, LuThumbsUp, LuChevronRight, LuPencil } from "react-icons/lu";
import { PubLine } from "@/components/icons";
import { ClaimForm } from "./claim-form";
import { EditPlaceDialog } from "./edit-place-dialog";
import { Button } from "@/components/ui/button";
import { GuestCheckDialog, type GuestCheckValues } from "@/components/guest-check-dialog";

type MarkerInfo = {
  id: string;
  name: string;
  amenity: string;
  lat: number;
  lon: number;
  owner_id: string | null;
};

async function fetchPlaceData(markerId: string) {
  const [markerRes, placeRes, reviewsRes] = await Promise.all([
    supabase
      .from("markers")
      .select("id, name, amenity, lat, lon, owner_id")
      .eq("id", markerId)
      .single(),
    supabase.from("places").select("*, short_code").eq("marker_id", markerId).single(),
    supabase
      .from("reviews")
      .select("*")
      .eq("marker_id", markerId)
      .order("created_at", { ascending: false }),
  ]);

  if (markerRes.error || !markerRes.data) throw new Error("Place not found");

  return {
    marker: markerRes.data as MarkerInfo,
    place: placeRes.data as Place | null,
    reviews: (reviewsRes.data ?? []) as Review[],
  };
}

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

// DAY_LABELS built inside component with translations

export default function PlaceDetailPage() {
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
  const queryClient = useQueryClient();
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["place", id],
    queryFn: () => fetchPlaceData(id),
  });

  useEffect(() => {
    if (isError) router.push("/");
  }, [isError, router]);

  const commentMutation = useMutation({
    mutationFn: async (values: GuestCheckValues) => {
      const { data: review, error } = await supabase
        .from("reviews")
        .insert({
          marker_id: id,
          user_id: user!.id,
          user_email: user!.email,
          comment: values.comment.trim() || null,
          rating: values.rating,
          atmosphere: values.atmosphere > 0 ? values.atmosphere : null,
          service: values.service > 0 ? values.service : null,
          space: values.space > 0 ? values.space : null,
          price_tier: values.priceTier,
          additional_info: values.additionalInfo.length > 0 ? values.additionalInfo : null,
        })
        .select()
        .single();
      if (error) throw error;
      return review as Review;
    },
    onSuccess: (newReview) => {
      queryClient.setQueryData(["place", id], (old: typeof data) => {
        if (!old) return old;
        return { ...old, reviews: [newReview, ...old.reviews] };
      });
      queryClient.invalidateQueries({ queryKey: ["pub_list"] });
      queryClient.invalidateQueries({ queryKey: ["markers"] });
      setRateOpen(false);
    },
  });

  if (isLoading) {
    return (
      <main className="flex items-center justify-center flex-1 bg-background">
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      </main>
    );
  }

  if (isError || !data) return null;

  const { marker, place, reviews } = data;

  const commentReviews = reviews.filter((r) => r.comment);

  const avgRating =
    place?.app_rating ??
    (reviews.length
      ? Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length) * 10) / 10
      : null);

  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );
  const maxCount = Math.max(...ratingCounts, 1);

  const now = new Date();
  const jsDay = now.getDay();
  const todayKey = DAY_KEYS[jsDay === 0 ? 6 : jsDay - 1];

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
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
        <div className="grid grid-cols-5 gap-6 mb-8 bg-card border border-border rounded-2xl p-8">
          {/* Left: title + tags */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {marker.amenity}
            </div>
            <h1 className="pub-name text-4xl font-black text-foreground leading-tight">{marker.name}</h1>
            {/* No description field in DB — placeholder container */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("noDescription")}
            </p>
            {/* Feature tags — no DB field, placeholder */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-secondary border border-border text-xs font-medium text-muted-foreground capitalize">
                {marker.amenity}
              </span>
            </div>
          </div>

          {/* Right: rating */}
          <div className="col-span-2">
            <div className="flex items-end gap-3 mb-3">
              <span className="text-6xl font-black text-primary leading-none">
                {avgRating != null ? avgRating.toFixed(1) : "—"}
              </span>
              <div className="pb-1">
                <div className="flex gap-0.5 mb-0.5">
                  {[1, 2, 3, 4, 5].map((s) =>
                    avgRating != null && avgRating >= s ? (
                      <PubLine key={s} size={18} className="text-primary" />
                    ) : (
                      <PubLine key={s} size={18} className="text-muted-foreground/40" />
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reviews.length !== 1 ? t("reviewsPlural", { count: reviews.length }) : t("reviews", { count: reviews.length })}
                </p>
              </div>
            </div>
            {/* Rating breakdown */}
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star, i) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground w-5">
                    {star}<PubLine size={10} className="text-muted-foreground" />
                  </span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(ratingCounts[i] / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-4 text-right">
                    {ratingCounts[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-5 gap-6">

          {/* Left: comments */}
          <div className="col-span-3">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  {t("theConversation")}
                </p>
                <h2 className="text-3xl font-black text-foreground">
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

            {/* Rate dialog */}
            <GuestCheckDialog
              open={rateOpen}
              onOpenChange={setRateOpen}
              markerName={marker.name}
              markerAmenity={marker.amenity}
              placeCity={place?.city}
              placeShortCode={place?.short_code}
              onSubmit={(values: GuestCheckValues) => commentMutation.mutate(values)}
              isPending={commentMutation.isPending}
              isError={commentMutation.isError}
            />

            {/* Reviews list */}
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

          {/* Right: sidebar */}
          <div className="col-span-2 space-y-4">

            {/* Place details */}
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
                {/* Fields not yet in DB — containers shown empty */}
                <SidebarRow label={t("instagram")} value={null} />
                <SidebarRow label={t("price")} value={null} />
                <SidebarRow label={t("founded")} value={null} />
                <SidebarRow label={t("capacity")} value={null} />
                <SidebarRow label={t("onTap")} value={null} />
              </div>
            </div>

            {/* Hours */}
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

            {/* Amenities */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {t("amenities")}
              </h3>
              <p className="text-xs text-muted-foreground">{t("noAmenities")}</p>
            </div>

            {/* Get there */}
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

            {/* Edit button — admin always, owner only if they own this place */}
            {(isAdmin || (isOwner && marker.owner_id === user?.id)) && (
              <button
                onClick={() => setEditOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                <LuPencil className="w-4 h-4 shrink-0" />
                {t("editPlace")}
              </button>
            )}

            {/* Claim form — owner/admin only if place has no owner */}
            {(isOwner || isAdmin) && !marker.owner_id && (
              <ClaimForm markerId={marker.id} />
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
          markerAmenity={marker.amenity}
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
  const queryClient = useQueryClient();
  const username = review.user_email?.split("@")[0] ?? "Anonymous";
  const initials = review.user_email ? avatarInitials(review.user_email) : "?";
  const isPlaceOwner = ownerUserId != null && review.user_id === ownerUserId;
  const thumbsUps = review.thumbs_ups ?? [];
  const hasThumbedUp = userId != null && thumbsUps.includes(userId);

  const thumbsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("toggle_thumbs_up", {
        p_review_id: review.id,
        p_user_id: userId!,
      });
      if (error) throw error;
      return data as string[];
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["place", markerId] });
      const previous = queryClient.getQueryData(["place", markerId]);
      const optimistic = hasThumbedUp
        ? thumbsUps.filter((id) => id !== userId)
        : [...thumbsUps, userId!];
      queryClient.setQueryData(["place", markerId], (old: { marker: MarkerInfo; place: Place | null; reviews: Review[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          reviews: old.reviews.map((r) =>
            r.id === review.id ? { ...r, thumbs_ups: optimistic } : r
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["place", markerId], context.previous);
      }
    },
    onSuccess: (newThumbsUps) => {
      queryClient.setQueryData(["place", markerId], (old: { marker: MarkerInfo; place: Place | null; reviews: Review[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          reviews: old.reviews.map((r) =>
            r.id === review.id ? { ...r, thumbs_ups: newThumbsUps } : r
          ),
        };
      });
    },
  });

  function handleThumbsUp() {
    if (!userId) return;
    thumbsMutation.mutate();
  }

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
                )
              )}
            </div>
            <span className="text-xs font-bold text-muted-foreground ml-1">{review.rating}.0</span>
          </div>
        )}
      </div>

      {review.comment && (
        <p className="text-sm text-foreground leading-relaxed mb-3">{review.comment}</p>
      )}

      {/* Tags — no DB field, container shown empty */}
      <div className="flex flex-wrap gap-1.5 mb-3" />

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <button
          onClick={handleThumbsUp}
          disabled={!userId || thumbsMutation.isPending}
          className={`flex items-center gap-1 transition-colors ${hasThumbedUp ? "text-primary font-semibold" : "hover:text-foreground"} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <LuThumbsUp className="w-3.5 h-3.5" />
          {thumbsUps.length > 0 && (
            <span className="ml-0.5">{thumbsUps.length}</span>
          )}
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
