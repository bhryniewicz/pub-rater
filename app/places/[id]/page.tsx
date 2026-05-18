"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase, type Place, type Review } from "@/lib/supabase";
import { isOpenNow, DAY_KEYS, type OpeningHours } from "@/lib/opening-hours";
import { useUser } from "@/hooks/use-user";
import { useGeolocation } from "@/context/geolocation-context";
import { ReviewFormSchema, type ReviewFormValues } from "@/lib/schemas";
import { LuArrowLeft, LuCopy, LuNavigation } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const PlaceMap = dynamic(() => import("@/components/place-map"), {
  ssr: false,
});

type MarkerInfo = {
  id: string;
  name: string;
  amenity: string;
  lat: number;
  lon: number;
};

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎶",
  biergarten: "🌻",
};

async function fetchPlaceData(markerId: string) {
  const [markerRes, placeRes, reviewsRes] = await Promise.all([
    supabase
      .from("markers")
      .select("id, name, amenity, lat, lon")
      .eq("id", markerId)
      .single(),
    supabase.from("places").select("*").eq("marker_id", markerId).single(),
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

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { coords: userLocation } = useGeolocation();
  const queryClient = useQueryClient();
  const [hoverRating, setHoverRating] = useState(0);
  const [copied, setCopied] = useState(false);

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: { comment: "", rating: 0 },
  });

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function navigateToPlace(lat: number, lon: number) {
    const destination = `${lat},${lon}`;
    const origin = userLocation
      ? `${userLocation.lat},${userLocation.lon}`
      : "";
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
    mutationFn: async ({ comment, rating }: ReviewFormValues) => {
      const { data: review, error } = await supabase
        .from("reviews")
        .insert({
          marker_id: id,
          user_id: user!.id,
          user_email: user!.email,
          comment,
          rating,
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
      reviewForm.reset();
      setHoverRating(0);
    },
  });

  if (isLoading) {
    return (
      <main className="flex items-center justify-center flex-1 bg-zinc-950">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </main>
    );
  }

  if (isError || !data) return null;

  const { marker, place, reviews } = data;

  console.log(place?.opening_hours, "hours");

  return (
    <main className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <LuArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header */}
        <div className="flex gap-4 mb-8">
          <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-zinc-800">
            {place?.thumbnail ? (
              <Image
                src={place.thumbnail}
                alt={marker.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {AMENITY_ICONS[marker.amenity] ?? "🍺"}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-1.5 min-w-0">
            <h1 className="text-xl font-black text-white leading-tight">
              {marker.name}
            </h1>
            <span className="inline-flex items-center gap-1 w-fit px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 capitalize">
              {AMENITY_ICONS[marker.amenity] && (
                <span>{AMENITY_ICONS[marker.amenity]}</span>
              )}
              {marker.amenity}
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="mb-8 rounded-xl overflow-hidden border border-zinc-800 h-56">
          <PlaceMap
            lat={marker.lat}
            lon={marker.lon}
            amenity={marker.amenity}
            userLocation={userLocation}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <LuCopy className="w-4 h-4 shrink-0" />
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => navigateToPlace(marker.lat, marker.lon)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 text-zinc-950 text-sm font-bold hover:bg-yellow-300 transition-colors"
          >
            <LuNavigation className="w-4 h-4 shrink-0" />
            {userLocation ? "Navigate from my location" : "Navigate"}
          </button>
        </div>

        {/* Details */}
        {place && (
          <section className="mb-8 space-y-3">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
              Details
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
              {place.address && (
                <Detail label="Address" value={place.address} />
              )}
              {place.city && <Detail label="City" value={place.city} />}
              {place.phone && <Detail label="Phone" value={place.phone} />}
              {place.website && (
                <Detail
                  label="Website"
                  value={
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:underline truncate"
                    >
                      {place.website}
                    </a>
                  }
                />
              )}
              {place.opening_hours && (
                <OpeningHoursTable hours={place.opening_hours} />
              )}
              {place.google_rating != null && (
                <Detail
                  label="Google rating"
                  value={`${place.google_rating} ★ (${place.google_review_count ?? 0} reviews)`}
                />
              )}
            </div>
          </section>
        )}

        {/* Comments */}
        <section>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
            Comments ({reviews.length})
          </h2>

          {user ? (
            <Form {...reviewForm}>
              <form
                onSubmit={reviewForm.handleSubmit((values) =>
                  commentMutation.mutate(values)
                )}
                className="mb-6 space-y-4"
              >
                <FormField
                  control={reviewForm.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => field.onChange(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="text-2xl leading-none transition-colors"
                          >
                            <span
                              className={
                                (hoverRating || field.value) >= star
                                  ? "text-yellow-400"
                                  : "text-zinc-600"
                              }
                            >
                              ★
                            </span>
                          </button>
                        ))}
                        {field.value > 0 && (
                          <span className="text-xs text-zinc-500 ml-1">
                            {field.value}/5
                          </span>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={reviewForm.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comment</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write a comment..."
                          rows={3}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {commentMutation.isError && (
                  <p className="text-xs text-red-400">
                    Failed to post comment. Please try again.
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={commentMutation.isPending}
                >
                  {commentMutation.isPending ? "Posting…" : "Post comment"}
                </Button>
              </form>
            </Form>
          ) : (
            <p className="text-sm text-zinc-500 mb-6">
              <Link href="/" className="text-yellow-400 hover:underline">
                Sign in
              </Link>{" "}
              to leave a comment.
            </p>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No comments yet. Be the first!
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-400">
                      {review.user_email ?? "Anonymous"}
                    </span>
                    {review.created_at && (
                      <span className="text-xs text-zinc-600">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {review.rating != null && (
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-base leading-none ${review.rating! >= star ? "text-yellow-400" : "text-zinc-700"}`}
                        >
                          ★
                        </span>
                      ))}
                      <span className="text-xs text-zinc-500 ml-1">
                        {review.rating}/5
                      </span>
                    </div>
                  )}
                  {review.comment && (
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="text-xs font-medium text-zinc-500 w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-zinc-200 min-w-0 break-words">{value}</span>
    </div>
  );
}

const DAY_LABELS: Record<string, string> = {
  mo: "Monday",
  tu: "Tuesday",
  we: "Wednesday",
  th: "Thursday",
  fr: "Friday",
  sa: "Saturday",
  su: "Sunday",
};

function OpeningHoursTable({ hours }: { hours: OpeningHours }) {
  const now = new Date();
  const jsDay = now.getDay();
  const todayKey = DAY_KEYS[jsDay === 0 ? 6 : jsDay - 1];
  const open = isOpenNow(hours);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-500">Hours</span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${open ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-500"}`}
        >
          {open ? "Open now" : "Closed now"}
        </span>
      </div>
      <div className="space-y-1">
        {DAY_KEYS.map((key) => {
          const day = hours[key];
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`flex items-center justify-between py-1 ${isToday ? "text-white" : "text-zinc-500"}`}
            >
              <span
                className={`text-xs w-24 ${isToday ? "font-bold" : "font-medium"}`}
              >
                {DAY_LABELS[key]}
              </span>
              <span className="text-xs">
                {day ? `${day.open} – ${day.close ?? "late"}` : "Closed"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
