// The catalog comes from Pelisgo's own API (a plugin OF pelisgo). Home is /api/trending, split into a Movies row
// and a Series row; search is /api/search. Both are TMDB-keyed rows the resolve bridge turns into playable copies.
import { requester, trending, listPage, search as apiSearch } from "./api.js";

/** The type Kino's Home by categories files a row under (the row's `genre`); a genre row (Acción, Terror) carries none. */
const ROW_TYPE = { "pg-trending-movie": "peliculas", "pg-trending-series": "series", "pg-list-movies": "peliculas", "pg-list-series": "series", "pg-list-genre-familia": "infantil" };
const typed = (row) => (ROW_TYPE[row.id] ? { ...row, genre: ROW_TYPE[row.id] } : row);
import { itemFromTrending, itemFromSearch } from "./mappers.js";

/** `home()` rows: Pelisgo's trending, split by kind, then its Familia listing (Infantil; the site has no anime). `[{ id, title, titleEn, genre, items }]`. */
export async function homeRows(kino, { untilMs } = {}) {
  const req = requester(kino, { untilMs });
  const items = (await trending(kino, req)).map(itemFromTrending).filter(Boolean);
  const movies = items.filter((i) => i.kind === "movie");
  const series = items.filter((i) => i.kind === "series");
  const rows = [];
  if (movies.length) rows.push({ id: "pg-trending-movie", title: "Tendencias en películas", titleEn: "Trending movies", items: movies });
  if (series.length) rows.push({ id: "pg-trending-series", title: "Tendencias en series", titleEn: "Trending series", items: series });
  // The site's own family page: its cards carry the site id, so they play without a bridge. One more gentle request; a failure leaves the row out.
  const family = (await listPage(kino, req, "/genre/familia").catch(() => [])).map(itemFromSearch).filter(Boolean);
  if (family.length) rows.push({ id: "pg-list-genre-familia", title: "Para toda la familia", titleEn: "For the whole family", items: family });
  return rows.map(typed);
}

/** The site's listing pages the screen shows as rows, per tab (each card carries its cuid: it plays without a bridge). */
export const LIST_ROWS = {
  inicio: [["/movies", "Películas recientes", "Latest movies"], ["/series", "Series recientes", "Latest series"],
    ["/genre/familia", "Para toda la familia", "For the whole family"],
    ["/genre/accion", "Acción", "Action"], ["/genre/comedia", "Comedia", "Comedy"], ["/genre/terror", "Terror", "Horror"]],
  peliculas: [["/movies", "Películas recientes", "Latest movies"], ["/genre/accion", "Acción", "Action"], ["/genre/comedia", "Comedia", "Comedy"],
    ["/genre/terror", "Terror", "Horror"], ["/genre/drama", "Drama", "Drama"], ["/genre/animacion", "Animación", "Animation"],
    ["/genre/ciencia-ficcion", "Ciencia ficción", "Science fiction"]],
  series: [["/series", "Series recientes", "Latest series"]],
};

/** A tab of the screen: the trending rows of its kind, then the site's listing pages (LIST_ROWS), fetched together. */
export async function tabRows(kino, tab, { untilMs } = {}) {
  const trendingRows = await homeRows(kino, { untilMs }).catch(() => []);
  const want = tab === "peliculas" ? ["pg-trending-movie"] : tab === "series" ? ["pg-trending-series"] : ["pg-trending-movie", "pg-trending-series"];
  const rows = trendingRows.filter((r) => want.includes(r.id));
  const lists = LIST_ROWS[tab] || LIST_ROWS.inicio;
  const req = requester(kino, { untilMs });
  const pages = await Promise.all(lists.map(([path]) => listPage(kino, req, path).catch(() => [])));
  // A page that came back empty (the site refusing a burst) is asked once more, alone.
  for (const [i, [path]] of lists.entries()) if (pages[i].length === 0) pages[i] = await listPage(kino, req, path).catch(() => []);
  lists.forEach(([path, title, titleEn], i) => {
    const items = pages[i].map(itemFromSearch).filter(Boolean);
    if (items.length) rows.push(typed({ id: "pg-list" + path.replace(/[^a-z0-9]+/g, "-"), title, titleEn, items }));
  });
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
