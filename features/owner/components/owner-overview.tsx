"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { LuMapPin, LuStar, LuMessageSquare, LuHash } from "react-icons/lu";
import { PubLine } from "@/assets/icons";
import { useOwnerStats } from "@/features/owner/api/get-owner-stats";
import type { OwnedPlaceStat } from "@/features/owner/api/get-owner-stats";
import { useOwnerRecentComments } from "@/features/owner/api/get-owner-recent-comments";
import type { RecentReview } from "@/features/owner/api/get-owner-recent-comments";
import { useOwnerChartData } from "@/features/owner/api/get-owner-chart-data";
import { useOwnerRatingBreakdown } from "@/features/owner/api/get-owner-rating-breakdown";
import { BeerRating } from "@/components/beer-rating";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { EditPlaceDialog } from "@/features/place/components/edit-place-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlaceTypeIcon,
  PLACE_TYPE_LABELS,
  placeTypeColor,
} from "@/lib/place-type";
import { supabase } from "@/lib/supabase";
import type { Place } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(email: string | null): string {
  if (!email) return "?";
  const username = email.split("@")[0];
  const parts = username.split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : username.slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 text-primary mb-3">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ── Edit place dialog (fetches place data on mount) ───────────────────────────

function OwnerEditDialog({
  markerId,
  markerName,
  placeType,
  onClose,
}: {
  markerId: string;
  markerName: string;
  placeType: string;
  onClose: () => void;
}) {
  const [place, setPlace] = useState<Place | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("places")
      .select("*")
      .eq("marker_id", markerId)
      .single()
      .then(({ data }) => setPlace(data ?? null));
  }, [markerId]);

  if (place === undefined) return null;

  return (
    <EditPlaceDialog
      open={true}
      onOpenChange={(o: boolean) => {
        if (!o) onClose();
      }}
      markerId={markerId}
      markerName={markerName}
      markerPlaceType={placeType}
      place={place}
    />
  );
}

// ── Review details dialog ─────────────────────────────────────────────────────

function ReviewDetailsDialog({
  review,
  onClose,
}: {
  review: RecentReview;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(o: boolean) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Reviewed by</p>
            <p className="text-sm font-medium text-foreground">
              {review.userEmail ?? "Anonymous"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(review.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Place</p>
            <p className="text-sm text-foreground">{review.placeName}</p>
          </div>

          {review.rating !== null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Overall rating</p>
              <BeerRating rating={review.rating} />
            </div>
          )}

          {review.comment && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Comment</p>
              <p className="text-sm text-foreground">{review.comment}</p>
            </div>
          )}

          {(review.atmosphere !== null ||
            review.service !== null ||
            review.space !== null) && (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground">Detailed ratings</p>
              {review.atmosphere !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Atmosphere</span>
                  <BeerRating rating={review.atmosphere} />
                </div>
              )}
              {review.service !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Service</span>
                  <BeerRating rating={review.service} />
                </div>
              )}
              {review.space !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Space</span>
                  <BeerRating rating={review.space} />
                </div>
              )}
            </div>
          )}

          {review.priceTier !== null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Price tier</span>
              <span className="text-xs font-medium text-foreground">
                {"£".repeat(review.priceTier)}
              </span>
            </div>
          )}

          {review.additionalInfo && review.additionalInfo.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {review.additionalInfo.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main overview ─────────────────────────────────────────────────────────────

export function OwnerOverview() {
  const { data: stats } = useOwnerStats();
  const { data: recentReviews } = useOwnerRecentComments();
  const { data: chartData } = useOwnerChartData();
  const { data: ratingBreakdown } = useOwnerRatingBreakdown();

  const [editingPlace, setEditingPlace] = useState<OwnedPlaceStat | null>(null);
  const [viewingReview, setViewingReview] = useState<RecentReview | null>(null);

  const kpis = [
    {
      icon: <LuMapPin size={20} />,
      label: "Owned Places",
      value: stats.ownedPlacesCount,
    },
    {
      icon: <LuStar size={20} />,
      label: "Average Rating",
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—",
    },
    {
      icon: <LuHash size={20} />,
      label: "Total Ratings",
      value: stats.totalRatings,
    },
    {
      icon: <LuMessageSquare size={20} />,
      label: "Total Comments",
      value: stats.totalComments,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <KpiCard key={i} icon={kpi.icon} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_504px] gap-6 items-start">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Comments chart */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 pt-4 pb-0">
              <h2 className="text-sm font-semibold text-foreground">
                Comments — Last 7 Days
              </h2>
            </div>
            <div className="px-4 py-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="commentsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--foreground)" }}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "var(--foreground)" }}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                    cursor={{
                      stroke: "var(--chart-1)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="comments"
                    name="Comments"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#commentsGradient)"
                    dot={{ fill: "var(--chart-1)", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "var(--chart-1)", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rating breakdown */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 pt-4 pb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Rating Breakdown
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.totalRatings} ratings across all venues
              </p>
            </div>
            <div className="px-5 pb-4">
              <RatingBreakdown items={ratingBreakdown} />
            </div>
          </div>

          {/* My places */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 pt-4 pb-3">
              <h2 className="text-sm font-semibold text-foreground">My Places</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.ownedPlacesCount}{" "}
                {stats.ownedPlacesCount === 1 ? "venue" : "venues"}
              </p>
            </div>
            {stats.places.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-xs">
                No places assigned yet.
              </p>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.places.map((place) => (
                  <div
                    key={place.id}
                    className="border border-border rounded-xl p-4 flex flex-col"
                  >
                    {/* Header: icon + name + subtitle */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="size-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${placeTypeColor(place.placeType)}25` }}
                      >
                        <PlaceTypeIcon
                          placeType={place.placeType}
                          size={24}
                          color={placeTypeColor(place.placeType)}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate leading-snug">
                          {place.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {PLACE_TYPE_LABELS[place.placeType] ?? place.placeType}
                          {place.address
                            ? ` · ${place.address}`
                            : place.city
                            ? ` · ${place.city}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border mb-4" />

                    {/* Rating */}
                    {place.appRating != null ? (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-3xl font-bold text-foreground leading-none">
                          {place.appRating.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const full = place.appRating! >= s;
                            const half = !full && place.appRating! >= s - 0.5;
                            if (half) {
                              return (
                                <span
                                  key={s}
                                  className="relative inline-flex items-center justify-center w-[16px] h-[16px]"
                                >
                                  <PubLine size={16} className="text-muted-foreground/40" />
                                  <span
                                    className="absolute top-0 left-0 bottom-0 overflow-hidden"
                                    style={{ width: "50%" }}
                                  >
                                    <PubLine size={16} className="text-primary" />
                                  </span>
                                </span>
                              );
                            }
                            return (
                              <span
                                key={s}
                                className="inline-flex items-center justify-center w-[16px] h-[16px]"
                              >
                                <PubLine
                                  size={16}
                                  className={full ? "text-primary" : "text-muted-foreground/40"}
                                />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-4">No ratings yet</p>
                    )}

                    <div className="border-t border-border mb-4" />

                    {/* Stats row */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-foreground leading-none">
                          {place.reviewCount ?? 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                          Reviews
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          place.isOpen
                            ? "bg-green-500/15 text-green-400 border border-green-500/20"
                            : "bg-red-500/15 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {place.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <Link
                        href={`/places/${place.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View
                      </Link>
                      <span className="text-border text-xs">·</span>
                      <button
                        onClick={() => setEditingPlace(place)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column — Latest reviews ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Latest Reviews</h2>
          </div>
          <div className="divide-y divide-border">
            {recentReviews.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-xs">
                No reviews yet.
              </p>
            ) : (
              recentReviews.map((r) => (
                <div key={r.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(r.userEmail)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {r.userEmail?.split("@")[0] ?? "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {timeAgo(r.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-1.5">
                        on {r.placeName}
                      </p>
                      {r.rating !== null && (
                        <div className="mb-1.5">
                          <BeerRating rating={r.rating} />
                        </div>
                      )}
                      {r.comment && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {r.comment}
                        </p>
                      )}
                      <button
                        onClick={() => setViewingReview(r)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit place dialog */}
      {editingPlace && (
        <OwnerEditDialog
          markerId={editingPlace.id}
          markerName={editingPlace.name}
          placeType={editingPlace.placeType}
          onClose={() => setEditingPlace(null)}
        />
      )}

      {/* Review details dialog */}
      {viewingReview && (
        <ReviewDetailsDialog
          review={viewingReview}
          onClose={() => setViewingReview(null)}
        />
      )}
    </div>
  );
}
