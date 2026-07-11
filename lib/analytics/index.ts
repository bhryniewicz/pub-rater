import { posthog } from "@/lib/analytics/posthog";

// Central catalog of product analytics events. Components call these wrappers
// instead of posthog.capture(...) directly, so event names and property shapes
// live in one typed place — no stringly-typed drift across the app.
export const analytics = {
  markerClicked: (m: { id: string; name: string; place_type: string }) =>
    posthog.capture("marker clicked", {
      marker_id: m.id,
      name: m.name,
      place_type: m.place_type,
    }),
  categoryFilterClicked: (category: string) =>
    posthog.capture("category filter clicked", {
      category,
    }),
  logoClicked: (path: string) =>
    posthog.capture("logo clicked", {
      path,
    }),
  searchPerformed: (p: {
    query: string;
    mode: "select" | "submit";
    result_count: number;
    matched_place_id?: string;
    matched_place_name?: string;
    matched_place_type?: string;
  }) => posthog.capture("search performed", p),
  mapButtonClicked: (m: { id: string; name: string; place_type: string }) =>
    posthog.capture("map button clicked", {
      marker_id: m.id,
      name: m.name,
      place_type: m.place_type,
    }),
  pubCardOpened: (m: { id: string; name: string; place_type: string }) =>
    posthog.capture("pub card opened", {
      marker_id: m.id,
      name: m.name,
      place_type: m.place_type,
    }),
  pubCardLikeToggled: (m: {
    id: string;
    name: string;
    place_type: string;
    liked: boolean;
  }) =>
    posthog.capture("pub card like toggled", {
      marker_id: m.id,
      name: m.name,
      place_type: m.place_type,
      liked: m.liked,
    }),
};
