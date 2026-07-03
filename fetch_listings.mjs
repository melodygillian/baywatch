// fetch_listings.mjs
// Pulls fresh Bay Area sale + rental listings from the RentCast API
// and saves them to data/listings.json for the website to read.
//
// Runs on a schedule via GitHub Actions (see .github/workflows/update-listings.yml).
// Requires the RENTCAST_API_KEY environment variable.
//
// API cost: exactly 2 RentCast calls per run (1 sale + 1 rental).
// At the default every-other-day schedule that's ~30 calls/month,
// safely inside the 50/month free tier.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// ------------------------- CONFIG (edit me) -------------------------

// One circle that covers the search area, instead of one call per city.
// Default: centered between San Mateo and Fremont, 30-mile radius —
// covers SF, the Peninsula, South Bay, and most of the East Bay.
// Tweak the center/radius if you want a tighter or different area.
const SEARCH = {
  latitude: 37.55,
  longitude: -122.15,
  radius: 30, // miles
};

// Only ask the API for listings posted in the last N days.
const DAYS_OLD = 7;

// Keep listings in our local store for this many days before pruning.
// Larger than DAYS_OLD so nothing flickers out between runs.
const KEEP_DAYS = 14;

// Max results per API call (RentCast caps at 500).
const LIMIT = 500;

const OUTPUT_FILE = "data/listings.json";

// ---------------------------------------------------------------------

const API_KEY = process.env.RENTCAST_API_KEY;
if (!API_KEY) {
  console.error("Missing RENTCAST_API_KEY environment variable.");
  console.error("Locally: RENTCAST_API_KEY=your-key node fetch_listings.mjs");
  console.error("On GitHub: add it under Settings > Secrets and variables > Actions.");
  process.exit(1);
}

const BASE = "https://api.rentcast.io/v1";

const ENDPOINTS = [
  { path: "/listings/sale", kind: "sale" },
  { path: "/listings/rental/long-term", kind: "rental" },
];

function buildUrl(path) {
  const params = new URLSearchParams({
    latitude: String(SEARCH.latitude),
    longitude: String(SEARCH.longitude),
    radius: String(SEARCH.radius),
    status: "Active",
    daysOld: String(DAYS_OLD),
    limit: String(LIMIT),
  });
  return `${BASE}${path}?${params}`;
}

async function fetchListings({ path, kind }) {
  const url = buildUrl(path);
  console.log(`Fetching ${kind} listings...`);
  const res = await fetch(url, {
    headers: { "X-Api-Key": API_KEY, Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`RentCast ${kind} request failed: HTTP ${res.status} ${body.slice(0, 300)}`);
  }

  const raw = await res.json();
  const items = Array.isArray(raw) ? raw : [];
  console.log(`  -> ${items.length} ${kind} listings returned`);
  return items.map((l) => normalize(l, kind));
}

// Keep only the fields the website needs, in a stable shape.
function normalize(l, kind) {
  return {
    id: l.id ?? `${l.formattedAddress}-${kind}`,
    kind, // "sale" or "rental"
    address: l.formattedAddress ?? [l.addressLine1, l.city, l.state].filter(Boolean).join(", "),
    city: l.city ?? "Unknown",
    state: l.state ?? "CA",
    zip: l.zipCode ?? "",
    price: l.price ?? null,
    bedrooms: l.bedrooms ?? null,
    bathrooms: l.bathrooms ?? null,
    squareFootage: l.squareFootage ?? null,
    lotSize: l.lotSize ?? null,
    yearBuilt: l.yearBuilt ?? null,
    propertyType: l.propertyType ?? "Residential",
    listedDate: l.listedDate ?? null,
    daysOnMarket: l.daysOnMarket ?? null,
    status: l.status ?? "Active",
  };
}

function loadExisting() {
  if (!existsSync(OUTPUT_FILE)) return { listings: [] };
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
    // Ignore the bundled mock data on the first real run.
    if (parsed.mock) return { listings: [] };
    return { listings: Array.isArray(parsed.listings) ? parsed.listings : [] };
  } catch {
    return { listings: [] };
  }
}

function isFresh(listing, cutoffMs) {
  if (!listing.listedDate) return false;
  const t = Date.parse(listing.listedDate);
  return Number.isFinite(t) && t >= cutoffMs;
}

async function main() {
  const results = [];
  for (const endpoint of ENDPOINTS) {
    results.push(...(await fetchListings(endpoint)));
  }

  // Merge with the previous store so listings the API has rotated out
  // (e.g. beyond the 500-per-call cap) aren't lost between runs.
  const { listings: previous } = loadExisting();
  const byId = new Map();
  for (const l of previous) byId.set(l.id, l);
  for (const l of results) byId.set(l.id, l); // new data wins

  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const merged = [...byId.values()]
    .filter((l) => isFresh(l, cutoff) && l.price)
    .sort((a, b) => Date.parse(b.listedDate) - Date.parse(a.listedDate));

  mkdirSync("data", { recursive: true });
  writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        search: SEARCH,
        daysOld: DAYS_OLD,
        count: merged.length,
        listings: merged,
      },
      null,
      2
    )
  );

  console.log(`Saved ${merged.length} listings to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
