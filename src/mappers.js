// Pelisgo's two row shapes -> Kino items. Pelisgo is TMDB-keyed for listing and cuid-keyed for playback, so a ref
// carries whichever id it has:
//   pg:c:m:<cuid>[:<slug>]         a movie with the site's own id (from /api/search) -> /stream plays it directly
//   pg:c:s:<cuid>[:<slug>]         a series with the site's own id (its slug lists episodes from the SSR page)
//   pg:t:m:<tmdbId>:<year>:<slug>  a movie known only by TMDB id (from /api/trending); year+slug bridge it to the
//   pg:t:s:<tmdbId>:<year>:<slug>  site's cuid/slug through /api/search at play/episodes time
//   pg:e:<episodeCuid>             one episode (its /api/series/episode/<cuid>/stream)
//   pg:x:<embedUrl>                a lazy alternative copy: resolve() hands the embed to the shared resolver
import { slugify } from "./util/slug.js";

const year4 = (v) => { const m = /\d{4}/.exec(String(v || "")); return m ? m[0] : ""; };
const posNum = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : undefined; };

export const movieRefByCuid = (cuid, slug) => `pg:c:m:${cuid}` + (slug ? ":" + slugify(slug) : "");
export const seriesRefByCuid = (cuid, slug) => `pg:c:s:${cuid}` + (slug ? ":" + slugify(slug) : "");
export const movieRefByTmdb = (tmdb, year, title) => `pg:t:m:${tmdb}:${year4(year)}:${slugify(title)}`;
export const seriesRefByTmdb = (tmdb, year, title) => `pg:t:s:${tmdb}:${year4(year)}:${slugify(title)}`;
export const episodeRef = (cuid) => `pg:e:${cuid}`;
export const lazyRef = (embedUrl) => `pg:x:${embedUrl}`;

/** A parsed Pelisgo ref, or null. `{ by: "cuid"|"tmdb"|"episode"|"lazy", kind, id, year?, slug, url? }`. */
export function parseRef(ref) {
  const r = String(ref || "");
  let m = /^pg:c:(m|s):([a-z0-9]+)(?::([a-z0-9-]*))?$/i.exec(r);
  if (m) return { by: "cuid", kind: m[1] === "s" ? "series" : "movie", id: m[2], slug: m[3] || "" };
  m = /^pg:t:(m|s):(\d{1,10}):(\d{0,4}):([a-z0-9-]*)$/.exec(r);
  if (m) return { by: "tmdb", kind: m[1] === "s" ? "series" : "movie", id: Number(m[2]), year: m[3] || "", slug: m[4] || "" };
  m = /^pg:e:([a-z0-9]+)$/i.exec(r);
  if (m) return { by: "episode", kind: "episode", id: m[1], slug: "" };
  m = /^pg:x:(.+)$/s.exec(r);
  if (m) return { by: "lazy", kind: "movie", id: "", slug: "", url: m[1] };
  return null;
}

/** A `/api/trending` row ({ id(tmdb), title, year, poster, backdrop, overview, rating, mediaType }) -> a Kino item. */
export function itemFromTrending(row) {
  if (!row || row.id == null) return null;
  const tmdb = Number(row.id);
  const isTv = row.mediaType === "tv" || row.mediaType === "serie";
  const kind = isTv ? "series" : "movie";
  const title = String(row.title || row.originalTitle || "").trim();
  const yr = row.year || row.releaseDate;
  const item = {
    id: `pg-t-${tmdb}`,
    ref: isTv ? seriesRefByTmdb(tmdb, yr, title) : movieRefByTmdb(tmdb, yr, title),
    title,
    kind,
    ...(year4(row.year || row.releaseDate) ? { year: year4(row.year || row.releaseDate) } : {}),
    ...(row.poster ? { poster: row.poster } : {}),
    ...(row.backdrop ? { backdrop: row.backdrop } : {}),
    ...(row.overview ? { overview: String(row.overview).trim() } : {}),
    ...(posNum(row.rating) ? { rating: posNum(row.rating) } : {}),
    ...(Number.isFinite(tmdb) ? { ids: { tmdb } } : {}),
  };
  const orig = String(row.originalTitle || "").trim();
  if (orig && orig !== item.title) item.originalTitle = orig;
  return item.title ? item : null;
}

/** A `/api/search` result ({ id(cuid), title, slug, poster, year, rating, type }) -> a Kino item. */
export function itemFromSearch(row) {
  if (!row || !row.id) return null;
  const isTv = row.type === "serie" || row.type === "series" || row.type === "tv";
  const kind = isTv ? "series" : "movie";
  const title = String(row.title || "").trim();
  if (!title) return null;
  return {
    id: `pg-c-${row.id}`,
    ref: isTv ? seriesRefByCuid(row.id, row.slug) : movieRefByCuid(row.id, row.slug),
    title,
    kind,
    ...(year4(row.year) ? { year: year4(row.year) } : {}),
    ...(row.poster ? { poster: row.poster } : {}),
    ...(posNum(row.rating) ? { rating: posNum(row.rating) } : {}),
  };
}
