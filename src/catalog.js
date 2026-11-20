// The catalog comes from Pelisgo's own API (a plugin OF pelisgo). Home is /api/trending, split into a Movies row
// and a Series row; search is /api/search. Both are TMDB-keyed rows the resolve bridge turns into playable copies.
import { requester, trending, search as apiSearch } from "./api.js";
import { itemFromTrending, itemFromSearch } from "./mappers.js";

/** `home()` rows: Pelisgo's trending, split by kind. `[{ id, title, titleEn, items }]`. */
export async function homeRows(kino, { untilMs } = {}) {
  const req = requester(kino, { untilMs });
  const items = (await trending(kino, req)).map(itemFromTrending).filter(Boolean);
  const movies = items.filter((i) => i.kind === "movie");
  const series = items.filter((i) => i.kind === "series");
  const rows = [];
  if (movies.length) rows.push({ id: "pg-trending-movie", title: "Tendencias en películas", titleEn: "Trending movies", items: movies });
  if (series.length) rows.push({ id: "pg-trending-series", title: "Tendencias en series", titleEn: "Trending series", items: series });
  return rows;
}

/** `search(q)`: Pelisgo's own search, as Kino items (each carries the site cuid, so it plays without a bridge). */
export async function searchItems(kino, q, { untilMs, lean } = {}) {
  const query = typeof q === "string" ? q : (q && q.q) || "";
  if (!String(query).trim()) return [];
  const req = requester(kino, { untilMs });
  const items = (await apiSearch(kino, req, query, 24)).map(itemFromSearch).filter(Boolean);
  const want = lean === "movie" || lean === "series" ? lean : null;
  return want ? [...items.filter((i) => i.kind === want), ...items.filter((i) => i.kind !== want)] : items;
}

/** One home row by id, for a "Ver más" page (browse). Trending has no pagination, so page 0 is the row, later pages empty. */
export async function browsePage(kino, ref, cursor, opts) {
  if (cursor) return { items: [], cursor: null };
  const rows = await homeRows(kino, opts);
  const row = rows.find((r) => r.id === ref);
  return { items: row ? row.items : [], cursor: null };
}
