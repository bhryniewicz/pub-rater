import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  capture_pageview: "history_change",
  capture_pageleave: true,
  autocapture: false,
  person_profiles: "identified_only",
});
