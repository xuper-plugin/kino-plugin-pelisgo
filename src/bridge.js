// Two site-specific lookups the catalog can't answer on its own:
//  - entryFor: a TMDB-only ref (from /api/trending) -> the site's own { cuid, slug }, matched through /api/search.
//  - seriesEpisodes: a series' episodes come from NO API endpoint; they're server-rendered into /series/<slug>.
import { ORIGIN, search as apiSearch } from "./api.js";
import { episodeRef } from "./mappers.js";
import { slugify } from "./util/slug.js";

const unslug = (slug) => String(slug || "").replace(/-/g, " ").trim();
const yearClose = (a, b) => { const x = Number(a), y = Number(b); return !x || !y || Math.abs(x - y) <= 1; };

/**
 * The site's own entry for a ref: `{ cuid, slug }` or null. A `cuid` ref is already the entry; a `tmdb` ref is
 * bridged by searching its title (the slug, de-hyphenated) and taking the result that matches kind + year.
 */
export async function entryFor(kino, req, info) {
  if (info.by === "cuid") return info.id ? { cuid: info.id, slug: info.slug } : null;
  if (info.by !== "tmdb") return null;
  const q = unslug(info.slug);
  if (!q) return null;
  const wantSeries = info.kind === "series";
  const results = (await apiSearch(kino, req, q, 12))
    .filter((r) => r && r.id && ((r.type === "serie" || r.type === "series" || r.type === "tv") === wantSeries));
  if (!results.length) return null;
  const exact = results.find((r) => r.slug && slugify(r.slug) === info.slug);
  const sameYear = results.find((r) => Number(info.year) > 0 && yearClose(r.year, info.year));
  const pick = exact || sameYear || results[0];
  return { cuid: String(pick.id), slug: String(pick.slug || info.slug) };
}

// --- series episodes from the SSR page ---

/** Light unescape of a title captured from the escaped RSC payload (common cases only). */
function unesc(s) {
  return String(s || "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\\\/g, "\\").trim();
}

/**
 * Parse the series page's embedded data into a flat episode list `[{ season, number, title, ref, still? }]`.
 * The page is a Next.js RSC payload: seasons are `…"number":S,"episodes":[…]` and each episode inside is
 * `…"id":"<cuid>","number":N,"title":"…"` (quotes backslash-escaped in the HTML). A linear scan tracks the
 * current season from each season marker and attaches the episodes that follow it.
 */
export function parseEpisodes(html) {
  const text = String(html || "");
  const re = /\\"number\\":(\d+),\\"episodes\\":\[|\\"id\\":\\"(cm[a-z0-9]+)\\",\\"number\\":(\d+),\\"title\\":\\"((?:[^\\"]|\\.)*?)\\"/g;
  const out = [];
  const seen = new Set();
  let season = 1;
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) { season = Number(m[1]); continue; }
    const cuid = m[2];
    if (seen.has(cuid)) continue;
    seen.add(cuid);
    out.push({ season, number: Number(m[3]), title: unesc(m[4]) || undefined, ref: episodeRef(cuid) });
  }
  return out;
}

/** A series' episodes, from its SSR page. `slug` is the site's own slug; [] when the page can't be read. */
export async function seriesEpisodes(kino, req, slug) {
  if (!slug) return [];
  const r = await req(`${ORIGIN}/series/${encodeURIComponent(slug)}`);
  if (!r || !r.ok) return [];
  return parseEpisodes(await r.text());
}
