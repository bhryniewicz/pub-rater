@AGENTS.md

# Project

Pub Rater — a map + list app for rating pubs. Users sign up, get onboarded, browse pubs on a Mapbox/Leaflet map, and rate them.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5**
- **Tailwind CSS v4** — use PostCSS plugin, not the v3 config style
- **Supabase** — auth via `@supabase/ssr`, data via `@supabase/supabase-js`
- **Mapbox GL / react-map-gl** and **Leaflet / react-leaflet** for maps
- **pnpm** — always use `pnpm`, never `npm` or `yarn`

## Commands

```bash
pnpm dev       # start dev server
pnpm build     # production build
pnpm lint      # eslint
```

## Rules

### Code style
- TypeScript everywhere — no `any`, no `@ts-ignore` without a comment explaining why
- Prefer `type` over `interface` unless you need declaration merging
- Named exports only — no default exports except for Next.js pages/layouts (required by the framework)
- Tailwind for all styling — no inline styles, no CSS modules
- File naming: kebab-case for all files (`onboarding-modal.tsx`, `use-user.ts`) — no camelCase filenames; Next.js reserved names (`page.tsx`, `layout.tsx`, `route.ts`, etc.) are exempt

### Next.js / React
- Map components must be loaded with `dynamic(..., { ssr: false })` — Leaflet and Mapbox break on SSR
- Keep data fetching in Server Components where possible; push `"use client"` as low in the tree as needed
- Do not add `"use client"` to a file just because it's easier — justify it

### Supabase
- Use the client from `@/lib/supabase` — do not instantiate a new client inline
- RLS is enabled — never bypass it with the service role key on the client side
- For paginated reads use the `fetchAll` pattern (1000-row pages) already in `app/page.tsx`

### Workflow
- Read the file before editing it
- Do not add features, refactoring, or comments beyond what was asked
- Do not add error handling for scenarios that cannot happen
- Before reporting UI work done, verify it visually in the browser

### Clarifying questions
- If a task is vague, large, or touches multiple systems — stop and ask before writing any code
- Ask one focused question at a time, not a list of 10
- If a request could be interpreted in more than one way, state your interpretation and ask for confirmation before proceeding
- Never silently pick an interpretation and run with it on anything non-trivial
