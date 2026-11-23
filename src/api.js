// The Pelisgo REST API. Pelisgo is a Next.js site with a clean JSON API; this plugin never scrapes HTML.
//
//   GET  /api/search?q=<q>&limit=<n>         -> { results: [{ id(cuid), title, slug, poster, year, rating, type }], people }
//   GET  /api/trending                       -> [{ id(tmdb), title, originalTitle, year, poster, backdrop, overview,
//                                                  rating, popularity, mediaType, genreIds }]
//   GET  /api/movies/<cuid>/stream           -> { links: [{ id, url, server, quality, language, label, serverOrder }] }
//   GET  /api/series/episode/<cuid>/stream   -> { links: [...] }   (same shape)
//
// The two id spaces: listing/metadata is keyed by TMDB id (trending), playback is keyed by the site's own cuid
// (search, detail). `/stream` and `/downloads` are gated by an anti-bot token (NOT a login): POST /api/session/sync
// hands out `{ token }`, sent back as the `x-session-id` header. kino.fetch keeps cookies between calls, which is
// what the token rides on. The token is cached ~10 min, as the site caches it.

import { makeRequester } from "./util/http.js";

export const ORIGIN = "https://pelisgo.online";

// Pelisgo's anti-bot ("Acceso denegado a herramientas automatizadas") rejects any request to /session/sync or
// /stream that does not look like its own web app's fetch: it needs the browser fetch headers below, and
// /session/sync must carry NO body (a body makes it answer "Petición no válida"). The public endpoints
// (/search, /trending) have no such gate. kino.fetch already sends a Chrome User-Agent (util/http.js).
const APP_HEADERS = {
  Origin: ORIGIN,
  Accept: "*/*",
  "Accept-Language": "es-ES,es;q=0.9",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "X-Requested-With": "XMLHttpRequest",
};
const appHeaders = (referer) => ({ ...APP_HEADERS, Referer: referer || ORIGIN + "/" });

/** A requester for one Kino call: declared-host gated, retrying, budget- and deadline-bound (util/http.js). */
export function requester(kino, { untilMs, budget = 24 } = {}) {
  return makeRequester(kino, { budget, deadline: untilMs || Date.now() + 8000, maxMs: 8000 });
}

/**
 * A listing page of the site (/movies, /series, /genre/<slug>): its cards, read from the page's own data (the server-rendered
 * payload holds each card as { id(cuid), title, slug, poster, year, rating, type }, the shape /api/search answers). [] on failure.
 */
export async function listPage(kino, req, path) {
  const r = await req(ORIGIN + path, { headers: { Accept: "text/html" } });
  if (!r || !r.ok) return [];
  const html = String(await r.text()).replace(/\\"/g, "\"");
  const out = [];
  const seen = new Set();
  const re = /\{"id":"([a-z0-9]{20,40})","title":"((?:[^"\\]|\\.)*)","slug":"([a-z0-9-]+)","poster":"([^"]*)","year":(\d{4}|null),"rating":([\d.]+|null),"type":"([a-z]+)"/g;
  for (let m; (m = re.exec(html)) !== null;) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    let title = m[2];
    try { title = JSON.parse("\"" + m[2] + "\""); } catch (_) { /* keep it raw */ }
    out.push({ id: m[1], title, slug: m[3], poster: /^https:\/\//.test(m[4]) ? m[4] : "", year: m[5] === "null" ? "" : m[5],
      rating: m[6] === "null" ? undefined : Number(m[6]), type: m[7] });
  }
  return out;
}

/** A JSON body, or null when the request failed or the body is not JSON. */
async function getJson(req, url, opts) {
  const r = await req(url, opts || {});
  if (!r || !r.ok) return null;
  try { return JSON.parse(await r.text()); } catch (_) { return null; }
}

// ---------- the anti-bot session token ----------

let tokenCache = { token: null, exp: 0 };
const TOKEN_TTL_MS = 9 * 60 * 1000;

/** The current anti-bot token (cached), or null when the site would not hand one out. */
export async function sessionToken(kino, req) {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.exp) return tokenCache.token;
  try {
    // No body on purpose: a body makes the anti-bot answer "Petición no válida".
    const r = await req(ORIGIN + "/api/session/sync", {
      method: "POST", headers: { "Content-Type": "application/json", ...appHeaders() }, retry: false,
    });
    if (!r || !r.ok) return null;
    const j = JSON.parse(await r.text());
    const tok = j && (j.sid || j.sessionId || j.token);
    if (tok) { tokenCache = { token: String(tok), exp: now + TOKEN_TTL_MS }; return tokenCache.token; }
  } catch (_) { /* no token this time */ }
  return null;
}

/** Forgets the cached token so the next gated call fetches a fresh one. */
export function clearToken() { tokenCache = { token: null, exp: 0 }; }

// ---------- public catalog (no token) ----------

/** `/api/search`: the site's own search. Returns the raw result rows ({ id(cuid), title, slug, year, poster, type }). */
export async function search(kino, req, q, limit = 12) {
  const query = String(q || "").trim();
  if (!query) return [];
  const url = `${ORIGIN}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const j = await getJson(req, url);
  return j && Array.isArray(j.results) ? j.results : [];
}

/** `/api/trending`: the home rail, keyed by TMDB id ({ id(tmdb), title, poster, backdrop, mediaType, genreIds, ... }). */
export async function trending(kino, req) {
  const j = await getJson(req, `${ORIGIN}/api/trending`);
  return Array.isArray(j) ? j : [];
}

// ---------- playback (token) ----------

const streamPath = (kind, id) =>
  kind === "episode" ? `/api/series/episode/${encodeURIComponent(id)}/stream`
    : `/api/movies/${encodeURIComponent(id)}/stream`;

const invalidSession = (j) => !!j && typeof j.error === "string" && /sesi[oó]n/i.test(j.error);

/**
 * The play links for a movie (kind "movie", id = movie cuid) or an episode (kind "episode", id = episode cuid):
 * `[{ id, url, server, quality, language, label, serverOrder }]`. Sends the anti-bot token; on an "invalid session"
 * answer it fetches a fresh token once and retries. Empty when nothing plays.
 */
export async function streamLinks(kino, req, kind, id, referer) {
  const url = ORIGIN + streamPath(kind, id);
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await sessionToken(kino, req);
    const headers = { ...appHeaders(referer), ...(token ? { "x-session-id": token } : {}) };
    const r = await req(url, { headers, retry: false });
    if (!r) return [];
    let j = null;
    try { j = JSON.parse(await r.text()); } catch (_) { j = null; }
    if (r.status === 401 || r.status === 403 || invalidSession(j)) { clearToken(); continue; }
    if (!r.ok || !j) return [];
    return Array.isArray(j.links) ? j.links : [];
  }
  return [];
}
