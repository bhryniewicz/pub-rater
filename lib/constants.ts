// Central table of app-wide constant values. Import from here instead of
// hardcoding or scattering these across feature modules.

// --- Colors ---

// Semantic accent trio — same saturation/tone family (Tailwind ~600 level).
export const ACCENT = {
  green: "#16a34a", // open / outdoor
  red: "#ef4444", // closed — brighter so it reads on the dark card
  yellow: "#f59e0b", // closing soon
} as const;

// Place-type / category colors.
export const CATEGORY_COLORS = {
  pub: "#d97706",
  bar: "#7c3aed",
  biergarten: ACCENT.green,
  events: "#f97316",
  topRated: "#facc15",
  sport: ACCENT.green,
  liked: "#db2777",
  owned: "#1d4ed8",
} as const;

// --- Pub list ---

export const PUB_LIST_PAGE_SIZE = 20;

// --- Geography ---

// Polish voivodeships — `key` matches the stored value, `label` is displayed.
export const VOIVODESHIPS: { key: string; label: string }[] = [
  { key: "Dolnoslaskie", label: "Dolnośląskie" },
  { key: "Kujawsko-Pomorskie", label: "Kujawsko-Pomorskie" },
  { key: "Lubelskie", label: "Lubelskie" },
  { key: "Lubuskie", label: "Lubuskie" },
  { key: "Lodzkie", label: "Łódzkie" },
  { key: "Malopolskie", label: "Małopolskie" },
  { key: "Mazowieckie", label: "Mazowieckie" },
  { key: "Opolskie", label: "Opolskie" },
  { key: "Podkarpackie", label: "Podkarpackie" },
  { key: "Podlaskie", label: "Podlaskie" },
  { key: "Pomorskie", label: "Pomorskie" },
  { key: "Slaskie", label: "Śląskie" },
  { key: "Swietokrzyskie", label: "Świętokrzyskie" },
  { key: "Warminsko-Mazurskie", label: "Warmińsko-Mazurskie" },
  { key: "Wielkopolskie", label: "Wielkopolskie" },
  { key: "Zachodniopomorskie", label: "Zachodniopomorskie" },
];

// --- Amenities ---

// Max characters for the free-text "other" amenity field.
export const AMENITY_OTHER_MAX = 20;

// --- Map clustering ---

// Above this zoom: individual markers
export const CLUSTER_THRESHOLD = 14;
// At this zoom and above: split 100+ clusters into 2 geographic halves
export const SPLIT_ZOOM = 9;
// Cluster with this many places triggers a geographic split
export const LARGE_CLUSTER = 100;
