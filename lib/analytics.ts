import { posthog } from "@/lib/posthog";

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
};
