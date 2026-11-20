// src/util/time.js
var LIMIT_MS = {
  search: 15e3,
  scopedSearch: 6e3,
  home: 2e4,
  section: 2e4,
  browse: 2e4,
  categories: 2e4,
  episodes: 2e4,
  details: 2e4,
  resolve: 2e4,
  action: 3e4,
  settingsStatus: 1e4,
  validateSettings: 2e4,
  panel: 2e4,
  panelAction: 2e4,
  playerEvent: 5e3
};
var BROWSER_RESOLVE_MS = 45e3;
function callDeadline(kino, call) {
  const limit = call === "resolve" && kino && kino.browser ? BROWSER_RESOLVE_MS : LIMIT_MS[call] || 15e3;
  const margin = limit <= 6e3 ? 1e3 : 1500;
  const end = Date.now() + limit - margin;
  return { end, left: () => Math.max(0, end - Date.now()) };
}

// src/settings.js
var bool = (v, d) => v === true || v === "true" ? true : v === false || v === "false" ? false : d;
function readSettings(kino) {
  const get = (key) => {
    try {
      return kino && kino.config ? kino.config.get(key) : void 0;
    } catch (_) {
      return void 0;
    }
  };
  const pref = get("preferred");
  const preferred = ["lat", "esp", "sub"].includes(pref) ? pref : "lat";
  const mq = get("maxQuality");
  const maxQuality = ["auto", "1080p", "720p", "480p"].includes(mq) ? mq : "auto";
  return { preferred, maxQuality, homeRows: bool(get("homeRows"), true) };
}

// kino-plugin.json
var kino_plugin_default = {
  id: "pelisgo",
  name: "Pelisgo",
  version: "0.1.3",
  apiVersion: 20,
  recommends: [
    "xuper-plugin/kino-plugin-kino-resolver"
  ],
  consumes: {
    resolver: {
      repo: "xuper-plugin/kino-plugin-kino-resolver",
      door: "resolver",
      calls: [
        "resolve",
        "normalizeHost"
      ]
    }
  },
  entry: "plugin.js",
  icon: "icon.png",
  description: "Pel\xEDculas y series en espa\xF1ol latino, castellano o subtituladas desde Pelisgo",
  author: "xuper-plugin",
  homepage: "https://github.com/xuper-plugin/kino-plugin-pelisgo",
  hosts: [
    "pelisgo.online",
    "www.pelisgo.online",
    "image.tmdb.org",
    "api.themoviedb.org",
    "voe.sx",
    "*.voe.sx",
    "streamwish.com",
    "*.streamwish.com",
    "streamwish.to",
    "*.streamwish.to",
    "hlswish.com",
    "*.hlswish.com",
    "strwish.com",
    "*.strwish.com",
    "wishembed.com",
    "*.wishembed.com",
    "filelions.com",
    "*.filelions.com",
    "filelions.to",
    "*.filelions.to",
    "vidhide.com",
    "*.vidhide.com",
    "vidhidepro.com",
    "*.vidhidepro.com",
    "vidhideplus.com",
    "*.vidhideplus.com",
    "vidhidefast.com",
    "*.vidhidefast.com",
    "fastream.to",
    "*.fastream.to",
    "goodstream.one",
    "*.goodstream.one",
    "ok.ru",
    "*.ok.ru",
    "mixdrop.ag",
    "*.mixdrop.ag"
  ],
  capabilities: [
    "search",
    "home",
    "browse",
    "episodes",
    "resolve",
    "screen"
  ],
  streamHosts: "any",
  categories: [
    "movies",
    "series"
  ],
  color: "#1E6FD9",
  section: {
    label: "Pelisgo",
    labelEn: "Pelisgo"
  },
  theme: {
    accent: "#1E6FD9",
    onAccent: "#FFFFFF",
    background: "#080B12",
    surface: "#111725",
    highlight: "#9EC5FF"
  },
  browser: true,
  settings: [
    {
      key: "langSection",
      type: "section",
      label: "Idioma y calidad",
      labelEn: "Language and quality",
      hint: "Qu\xE9 copia se abre primero cuando un t\xEDtulo tiene varias.",
      hintEn: "Which copy opens first when a title has several."
    },
    {
      key: "preferred",
      type: "select",
      label: "Idioma preferido",
      labelEn: "Preferred language",
      default: "lat",
      options: [
        { value: "lat", label: "Latino", labelEn: "Latin Spanish" },
        { value: "esp", label: "Castellano", labelEn: "Spain Spanish" },
        { value: "sub", label: "Subtitulado", labelEn: "Subtitled" }
      ]
    },
    {
      key: "maxQuality",
      type: "select",
      label: "Calidad m\xE1xima",
      labelEn: "Maximum quality",
      default: "auto",
      options: [
        { value: "auto", label: "Autom\xE1tica", labelEn: "Automatic" },
        { value: "1080p", label: "Hasta 1080p", labelEn: "Up to 1080p" },
        { value: "720p", label: "Hasta 720p", labelEn: "Up to 720p" },
        { value: "480p", label: "Hasta 480p (ahorra datos)", labelEn: "Up to 480p (saves data)" }
      ]
    },
    {
      key: "homeSection",
      type: "section",
      label: "Inicio",
      labelEn: "Home"
    },
    {
      key: "homeRows",
      type: "toggle",
      label: "Filas en Inicio",
      labelEn: "Rows on Home",
      default: true,
      hint: "Muestra los estrenos de Pelisgo en el Inicio de Kino.",
      hintEn: "Shows Pelisgo's new releases on Kino's Home."
    }
  ],
  screen: {
    label: "Pelisgo",
    labelEn: "Pelisgo",
    icon: "movie",
    menuOpens: "screen",
    opensFrom: [
      "menu",
      "settings"
    ],
    settingsButton: {
      label: "Abrir Pelisgo",
      labelEn: "Open Pelisgo"
    },
    settingsIn: "screen"
  }
};

// src/util/hosts.js
function hostMatcher(entries) {
  const exact = /* @__PURE__ */ new Set();
  const suffixes = [];
  for (const raw of entries || []) {
    const h = String(typeof raw === "string" ? raw : raw && raw.host || "").toLowerCase();
    if (!h) continue;
    if (h.startsWith("*.")) suffixes.push(h.slice(1));
    else exact.add(h);
  }
  return (host) => {
    const h = String(host || "").toLowerCase();
    return exact.has(h) || suffixes.some((s) => h.length > s.length && h.endsWith(s));
  };
}
var hostDeclared = hostMatcher(kino_plugin_default.hosts);
function urlDeclared(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch (_) {
    return false;
  }
  return hostDeclared(host);
}

// src/util/http.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var RETRY_STATUS = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 524]);
var SLOW_ATTEMPT_MS = 3e3;
var fetchAllowed = (kino, url) => kino && kino.fetchAnyHost === true || urlDeclared(url);
function makeRequester(kino, { budget = 12, deadline = Date.now() + 8e3, pools = [], concurrency = Infinity, maxMs = 8e3 } = {}) {
  let used = 0;
  let active = 0;
  const waiting = [];
  const acquire = () => active < concurrency ? (active++, Promise.resolve()) : new Promise((r) => waiting.push(r));
  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else active--;
  };
  function makeLocalError(code, message) {
    const e = kino.error(code, message);
    e.local = true;
    return e;
  }
  async function once(url, opts, timing = {}) {
    if (!fetchAllowed(kino, url)) throw makeLocalError("host_not_allowed", "host not declared: " + hostOf(url));
    await acquire();
    try {
      if (used >= budget) throw makeLocalError("unavailable", "budget spent at " + url);
      if (pools.some((p) => p.left <= 0)) throw makeLocalError("unavailable", "call allowance spent at " + url);
      const left = deadline - Date.now();
      if (left <= 0) throw makeLocalError("unavailable", "deadline before " + url);
      used++;
      for (const p of pools) p.left--;
      const headers = { "User-Agent": UA, ...opts.headers || {} };
      const { retry, ...rest } = opts;
      const sentAt = Date.now();
      try {
        return await kino.fetch(url, { ...rest, headers, timeoutMs: Math.min(maxMs, left) });
      } finally {
        timing.spentMs = Date.now() - sentAt;
      }
    } finally {
      release();
    }
  }
  let degraded = false;
  const roomToRetry = () => used < budget && !pools.some((p) => p.left <= 0) && deadline - Date.now() > 600;
  async function send(url, opts = {}) {
    const timing = {};
    try {
      const r = await once(url, opts, timing);
      if (opts.retry === false || !RETRY_STATUS.has(r.status)) return r;
      if (roomToRetry() && timing.spentMs < SLOW_ATTEMPT_MS) {
        await kino.sleep(600);
        return once(url, opts);
      }
      return r;
    } catch (e) {
      if (opts.retry === false || e && (e.local || e.code === "host_not_allowed")) throw e;
      if (roomToRetry() && !(timing.spentMs >= SLOW_ATTEMPT_MS)) {
        await kino.sleep(600);
        return once(url, opts);
      }
      throw e;
    }
  }
  async function req(url, opts = {}) {
    const r = await send(url, opts);
    if (r && (r.status === 429 || r.status >= 500)) degraded = true;
    return r;
  }
  req.degraded = () => degraded;
  req.used = () => used;
  req.exhausted = () => used >= budget || deadline - Date.now() <= 0 || pools.some((p) => p.left <= 0);
  req.left = () => Math.max(0, deadline - Date.now());
  return req;
}
var hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch (_) {
    return String(url).slice(0, 80);
  }
};

// src/api.js
var ORIGIN = "https://pelisgo.online";
var APP_HEADERS = {
  Origin: ORIGIN,
  Accept: "*/*",
  "Accept-Language": "es-ES,es;q=0.9",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "X-Requested-With": "XMLHttpRequest"
};
var appHeaders = (referer) => ({ ...APP_HEADERS, Referer: referer || ORIGIN + "/" });
function requester(kino, { untilMs, budget = 24 } = {}) {
  return makeRequester(kino, { budget, deadline: untilMs || Date.now() + 8e3, maxMs: 8e3 });
}
async function getJson(req, url, opts) {
  const r = await req(url, opts || {});
  if (!r || !r.ok) return null;
  try {
    return JSON.parse(await r.text());
  } catch (_) {
    return null;
  }
}
var tokenCache = { token: null, exp: 0 };
var TOKEN_TTL_MS = 9 * 60 * 1e3;
async function sessionToken(kino, req) {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.exp) return tokenCache.token;
  try {
    const r = await req(ORIGIN + "/api/session/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...appHeaders() },
      retry: false
    });
    if (!r || !r.ok) return null;
    const j = JSON.parse(await r.text());
    const tok = j && (j.sid || j.sessionId || j.token);
    if (tok) {
      tokenCache = { token: String(tok), exp: now + TOKEN_TTL_MS };
      return tokenCache.token;
    }
  } catch (_) {
  }
  return null;
}
function clearToken() {
  tokenCache = { token: null, exp: 0 };
}
async function search(kino, req, q, limit = 12) {
  const query = String(q || "").trim();
  if (!query) return [];
  const url = `${ORIGIN}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const j = await getJson(req, url);
  return j && Array.isArray(j.results) ? j.results : [];
}
async function trending(kino, req) {
  const j = await getJson(req, `${ORIGIN}/api/trending`);
  return Array.isArray(j) ? j : [];
}
var streamPath = (kind, id) => kind === "episode" ? `/api/series/episode/${encodeURIComponent(id)}/stream` : `/api/movies/${encodeURIComponent(id)}/stream`;
var invalidSession = (j) => !!j && typeof j.error === "string" && /sesi[oó]n/i.test(j.error);
async function streamLinks(kino, req, kind, id, referer) {
  const url = ORIGIN + streamPath(kind, id);
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await sessionToken(kino, req);
    const headers = { ...appHeaders(referer), ...token ? { "x-session-id": token } : {} };
    const r = await req(url, { headers, retry: false });
    if (!r) return [];
    let j = null;
    try {
      j = JSON.parse(await r.text());
    } catch (_) {
      j = null;
    }
    if (r.status === 401 || r.status === 403 || invalidSession(j)) {
      clearToken();
      continue;
    }
    if (!r.ok || !j) return [];
    return Array.isArray(j.links) ? j.links : [];
  }
  return [];
}

// src/util/slug.js
function slugify(title) {
  return String(title || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// src/mappers.js
var year4 = (v) => {
  const m = /\d{4}/.exec(String(v || ""));
  return m ? m[0] : "";
};
var posNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : void 0;
};
var movieRefByCuid = (cuid, slug) => `pg:c:m:${cuid}` + (slug ? ":" + slugify(slug) : "");
var seriesRefByCuid = (cuid, slug) => `pg:c:s:${cuid}` + (slug ? ":" + slugify(slug) : "");
var movieRefByTmdb = (tmdb, year, title) => `pg:t:m:${tmdb}:${year4(year)}:${slugify(title)}`;
var seriesRefByTmdb = (tmdb, year, title) => `pg:t:s:${tmdb}:${year4(year)}:${slugify(title)}`;
var episodeRef = (cuid) => `pg:e:${cuid}`;
var lazyRef = (embedUrl) => `pg:x:${embedUrl}`;
function parseRef(ref) {
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
function itemFromTrending(row) {
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
    ...year4(row.year || row.releaseDate) ? { year: year4(row.year || row.releaseDate) } : {},
    ...row.poster ? { poster: row.poster } : {},
    ...row.backdrop ? { backdrop: row.backdrop } : {},
    ...row.overview ? { overview: String(row.overview).trim() } : {},
    ...posNum(row.rating) ? { rating: posNum(row.rating) } : {},
    ...Number.isFinite(tmdb) ? { ids: { tmdb } } : {}
  };
  const orig = String(row.originalTitle || "").trim();
  if (orig && orig !== item.title) item.originalTitle = orig;
  return item.title ? item : null;
}
function itemFromSearch(row) {
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
    ...year4(row.year) ? { year: year4(row.year) } : {},
    ...row.poster ? { poster: row.poster } : {},
    ...posNum(row.rating) ? { rating: posNum(row.rating) } : {}
  };
}

// src/catalog.js
async function homeRows(kino, { untilMs } = {}) {
  const req = requester(kino, { untilMs });
  const items = (await trending(kino, req)).map(itemFromTrending).filter(Boolean);
  const movies = items.filter((i) => i.kind === "movie");
  const series = items.filter((i) => i.kind === "series");
  const rows = [];
  if (movies.length) rows.push({ id: "pg-trending-movie", title: "Tendencias en pel\xEDculas", titleEn: "Trending movies", items: movies });
  if (series.length) rows.push({ id: "pg-trending-series", title: "Tendencias en series", titleEn: "Trending series", items: series });
  return rows;
}
async function searchItems(kino, q, { untilMs, lean } = {}) {
  const query = typeof q === "string" ? q : q && q.q || "";
  if (!String(query).trim()) return [];
  const req = requester(kino, { untilMs });
  const items = (await search(kino, req, query, 24)).map(itemFromSearch).filter(Boolean);
  const want = lean === "movie" || lean === "series" ? lean : null;
  return want ? [...items.filter((i) => i.kind === want), ...items.filter((i) => i.kind !== want)] : items;
}
async function browsePage(kino, ref, cursor, opts) {
  if (cursor) return { items: [], cursor: null };
  const rows = await homeRows(kino, opts);
  const row = rows.find((r) => r.id === ref);
  return { items: row ? row.items : [], cursor: null };
}

// src/bridge.js
var unslug = (slug) => String(slug || "").replace(/-/g, " ").trim();
var yearClose = (a, b) => {
  const x = Number(a), y = Number(b);
  return !x || !y || Math.abs(x - y) <= 1;
};
async function entryFor(kino, req, info) {
  if (info.by === "cuid") return info.id ? { cuid: info.id, slug: info.slug } : null;
  if (info.by !== "tmdb") return null;
  const q = unslug(info.slug);
  if (!q) return null;
  const wantSeries = info.kind === "series";
  const results = (await search(kino, req, q, 12)).filter((r) => r && r.id && (r.type === "serie" || r.type === "series" || r.type === "tv") === wantSeries);
  if (!results.length) return null;
  const exact = results.find((r) => r.slug && slugify(r.slug) === info.slug);
  const sameYear = results.find((r) => Number(info.year) > 0 && yearClose(r.year, info.year));
  const pick = exact || sameYear || results[0];
  return { cuid: String(pick.id), slug: String(pick.slug || info.slug) };
}
function unesc(s) {
  return String(s || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\\\/g, "\\").trim();
}
function parseEpisodes(html) {
  const text = String(html || "");
  const re = /\\"number\\":(\d+),\\"episodes\\":\[|\\"id\\":\\"(cm[a-z0-9]+)\\",\\"number\\":(\d+),\\"title\\":\\"((?:[^\\"]|\\.)*?)\\"/g;
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  let season = 1;
  for (const m of text.matchAll(re)) {
    if (m[1] !== void 0) {
      season = Number(m[1]);
      continue;
    }
    const cuid = m[2];
    if (seen.has(cuid)) continue;
    seen.add(cuid);
    out.push({ season, number: Number(m[3]), title: unesc(m[4]) || void 0, ref: episodeRef(cuid) });
  }
  return out;
}
async function seriesEpisodes(kino, req, slug) {
  if (!slug) return [];
  const r = await req(`${ORIGIN}/series/${encodeURIComponent(slug)}`);
  if (!r || !r.ok) return [];
  return parseEpisodes(await r.text());
}

// src/util/servers.js
var HLS_MIME = "application/vnd.apple.mpegurl";

// src/resolve-door.js
var RESOLVER_ALIAS = "resolver";
var RESOLVER_REPO = "xuper-plugin/kino-plugin-kino-resolver";
var CAPTURE_MS = 18e3;
function headersOf(s) {
  const out = {};
  if (s.referer) out.Referer = s.referer;
  const h = s.headers;
  if (Array.isArray(h)) for (const x of h) {
    if (x && x.name) out[x.name] = String(x.value);
  }
  else if (h && typeof h === "object") for (const [k, v] of Object.entries(h)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}
function pickBest(streams) {
  return streams.find((s) => s && s.url && (s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url))) || streams.find((s) => s && s.url) || null;
}
async function captureStreams(kino, embedUrl, referer) {
  const b = kino && kino.browser;
  if (!b || typeof b.capture !== "function") return [];
  const opts = { timeoutMs: CAPTURE_MS };
  if (referer) opts.headers = { Referer: referer };
  let cap;
  try {
    cap = await b.capture(embedUrl, opts);
  } catch {
    return [];
  }
  const out = [];
  for (const m of cap && cap.media || []) {
    if (!m || !m.url) continue;
    out.push({ url: m.url, kind: /\.m3u8(\?|$)/i.test(m.url) ? "hls" : "mp4", server: "browser", headers: m.headers || {} });
  }
  return out;
}
async function resolveViaHelper(e, kino, source) {
  const embedUrl = e.embedUrl;
  const referer = source && source.ORIGIN ? String(source.ORIGIN).replace(/\/+$/, "") + "/" : void 0;
  let res = null;
  try {
    res = await kino.plugins.call(RESOLVER_ALIAS, "resolve", { url: embedUrl, referer });
  } catch (err) {
    if (kino && kino.log) kino.log("[latino]", "resolver", err && err.code || "call_failed");
  }
  let streams = res && Array.isArray(res.streams) ? res.streams.slice() : [];
  const subtitles = res && Array.isArray(res.subtitles) ? res.subtitles.filter((x) => x && x.lang && x.url) : [];
  if (!streams.length) streams = await captureStreams(kino, embedUrl, referer);
  const s = pickBest(streams);
  if (!s) return null;
  const headers = headersOf(s);
  return {
    url: s.url,
    ...s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url) ? { mime: HLS_MIME } : {},
    ...Object.keys(headers).length ? { headers } : {},
    ...subtitles.length ? { subtitles } : {}
  };
}

// src/util/lang.js
function normLang(text) {
  const s = String(text || "").toLowerCase();
  if (/\b(sub|subs|vose|subtitulado|subtitulada)\b/.test(s)) return "sub";
  if (/\b(lat|latino|latam|mx|mex|col|es-mx)\b/.test(s)) return "lat";
  if (/\b(cast|castellano|esp|español|espanol|es-es|spain)\b/.test(s)) return "esp";
  if (/(?:^|[^a-z0-9ñ])(españa|espana)(?:$|[^a-z0-9ñ])/.test(s)) return "esp";
  return null;
}

// src/resolve.js
var HLS_MIME2 = "application/vnd.apple.mpegurl";
var isHls = (u) => /\.m3u8(\?|$)/i.test(String(u));
var isDirect = (u) => /\.(m3u8|mp4)(\?|$)/i.test(String(u));
var LANG_FALLBACK = { lat: 0, esp: 1, sub: 2 };
var qNum = (q) => {
  const m = /(\d{3,4})p/.exec(String(q || ""));
  return m ? Number(m[1]) : 0;
};
function labelOf(link) {
  return [link.language, link.name || link.server, link.quality].filter(Boolean).join(" \xB7 ").slice(0, 48);
}
function rank(links, preferred) {
  const lr = (l) => {
    const n = normLang(l);
    return n === preferred ? -1 : LANG_FALLBACK[n] ?? 3;
  };
  return [...links].sort((a, b) => lr(a.language) - lr(b.language) || qNum(b.quality) - qNum(a.quality) || (isDirect(a.url) ? 1 : 0) - (isDirect(b.url) ? 1 : 0) || (a.serverOrder || 0) - (b.serverOrder || 0));
}
var directStream = (link) => ({
  url: link.url,
  ...isHls(link.url) ? { mime: HLS_MIME2 } : {},
  headers: { Referer: ORIGIN + "/" },
  label: labelOf(link)
});
async function embedStream(kino, link) {
  const s = await resolveViaHelper({ embedUrl: link.url }, kino, { ORIGIN });
  return s ? { ...s, label: labelOf(link) } : null;
}
async function resolve(kino, ref, { untilMs, preferred = "lat" } = {}) {
  const req = requester(kino, { untilMs });
  const info = parseRef(ref);
  if (!info) throw kino.error("not_found", "bad ref");
  if (info.by === "lazy") {
    const s = await resolveViaHelper({ embedUrl: info.url }, kino, { ORIGIN });
    if (!s) throw kino.error("not_found", "alt unresolved", { userMessage: "No se pudo abrir ese servidor" });
    return s;
  }
  let kind, id;
  if (info.by === "episode") {
    kind = "episode";
    id = info.id;
  } else {
    const entry = await entryFor(kino, req, info);
    if (!entry) throw kino.error("not_found", "not on pelisgo", { userMessage: "No est\xE1 disponible en Pelisgo" });
    kind = "movie";
    id = entry.cuid;
  }
  const links = await streamLinks(kino, req, kind, id);
  if (!links.length) throw kino.error("not_found", "no streams", { userMessage: "Sin enlaces de reproducci\xF3n" });
  const ranked = rank(links, preferred);
  let main = null, mainUrl = null;
  for (const l of ranked) {
    main = isDirect(l.url) ? directStream(l) : await embedStream(kino, l);
    if (main) {
      mainUrl = l.url;
      break;
    }
  }
  if (!main) throw kino.error("not_found", "unresolved", { userMessage: "No se pudo resolver el video" });
  const alts = [];
  for (const l of ranked) {
    if (alts.length >= 8 || l.url === mainUrl) continue;
    alts.push(isDirect(l.url) ? { url: l.url, ...isHls(l.url) ? { mime: HLS_MIME2 } : {}, headers: { Referer: ORIGIN + "/" }, label: labelOf(l) } : { label: labelOf(l), ref: lazyRef(l.url) });
  }
  return { ...main, ...alts.length ? { alternatives: alts } : {}, expiresInSeconds: 1800 };
}

// src/episodes.js
async function episodes(kino, ref, { untilMs } = {}) {
  const req = requester(kino, { untilMs });
  const info = parseRef(ref);
  if (!info || info.kind !== "series") throw kino.error("not_found", "not a series ref");
  let slug = info.by === "cuid" ? info.slug : "";
  if (!slug) {
    const e = await entryFor(kino, req, info);
    slug = e && e.slug;
  }
  if (!slug) throw kino.error("not_found", "series not found", { userMessage: "No se encontr\xF3 la serie en Pelisgo" });
  const eps = await seriesEpisodes(kino, req, slug);
  if (!eps.length) throw kino.error("not_found", "no episodes", { userMessage: "No se pudieron cargar los episodios" });
  return { episodes: eps };
}

// src/screen.js
var TABS = [
  { id: "inicio", es: "Inicio", en: "Home" },
  { id: "peliculas", es: "Pel\xEDculas", en: "Movies" },
  { id: "series", es: "Series", en: "Series" }
];
var TAB_IDS = TABS.map((t) => t.id);
var SUPPORT_URL = "https://ko-fi.com/xuperplugins";
var twin = (es, en, field = "text") => ({ [field]: es, [field + "En"]: en });
var keyOf = (s) => String(s || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40);
function supportNode(device) {
  if (device === "tv") {
    return {
      type: "QrImage",
      value: SUPPORT_URL,
      size: "large",
      labelText: "Si te gusta mi trabajo, escan\xE9alo y ap\xF3yame",
      labelTextEn: "If you like my work, scan it and support me"
    };
  }
  return {
    type: "ElevatedButton",
    key: "donate",
    icon: "heart",
    labelText: "Si te gusta mi trabajo, ap\xF3yame",
    labelTextEn: "If you like my work, support me",
    onPressed: { go: { url: { href: SUPPORT_URL } } }
  };
}
function installGateView(device) {
  return {
    type: "Scaffold",
    key: "pg-install",
    body: { type: "SingleChildScrollView", key: "installScroll", children: [
      { type: "Column", padding: 24, gap: 16, crossAxisAlignment: "stretch", children: [
        { type: "Text", text: "Necesitas el motor de reproducci\xF3n", textEn: "You need the playback engine", style: "h3" },
        {
          type: "Text",
          color: "secondary",
          text: "Pelisgo reproduce a trav\xE9s de Kino Resolver (gratis). Inst\xE1lalo una vez y sirve para este y para otros plugins de sitios.",
          textEn: "Pelisgo plays through Kino Resolver (free). Install it once and it works here and in other site plugins."
        },
        {
          type: "ElevatedButton",
          key: "installResolver",
          labelText: "Instalar Kino Resolver",
          labelTextEn: "Install Kino Resolver",
          onPressed: { go: { installPlugin: { repo: RESOLVER_REPO } } }
        },
        supportNode(device)
      ] }
    ] }
  };
}
var card = (it, scope) => ({
  type: "titleCard",
  key: `${scope}-${it.id}`,
  size: "medium",
  item: it,
  onTap: { go: { title: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } } }
});
var cardRow = (items, key) => ({
  type: "SingleChildScrollView",
  key: key + "-s",
  direction: "horizontal",
  children: [{ type: "Row", key: key + "-r", gap: 12, children: items.slice(0, 24).map((it) => card(it, key)) }]
});
var slide = (it) => ({
  type: "heroCard",
  key: "s-" + it.id,
  h: { compact: 200, expanded: 240 },
  title: it.title,
  ...it.overview ? { text: it.overview.length <= 160 ? it.overview : it.overview.slice(0, 159).trimEnd() + "\u2026" } : {},
  ...it.backdrop || it.poster ? { image: it.backdrop || it.poster } : {},
  buttons: [
    {
      type: "ElevatedButton",
      key: "watch-" + it.id,
      ...twin("Ver", "Watch", "labelText"),
      icon: "play",
      onPressed: { go: it.kind === "movie" ? { play: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } } : { title: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } } }
    },
    {
      type: "TextButton",
      key: "info-" + it.id,
      ...twin("Info", "Info", "labelText"),
      onPressed: { go: { title: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } } }
    }
  ]
});
var hero = (items) => items.length === 1 ? slide(items[0]) : { type: "PageView", key: "hero" + items.length, autoPlayMs: 6e3, children: items.map(slide) };
var railSkeleton = (n) => ({ type: "Column", key: "sk" + n, gap: 8, children: [
  { type: "Skeleton", shape: "line", width: 140 },
  { type: "Row", gap: 12, children: [1, 2, 3, 4].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}-${i}`, flex: 1 })) }
] });
var tabBar = (active) => ({
  type: "TabBar",
  key: "tabs",
  divider: false,
  value: active,
  onChanged: "tab",
  tabs: TABS.map((t) => ({ value: t.id, ...twin(t.es, t.en, "label") }))
});
function makeScreen({ kino, loadHome }) {
  let home2 = null;
  const log = (...a) => {
    try {
      kino.log("[pelisgo]", ...a);
    } catch (_) {
    }
  };
  const rowsFor = (tab) => {
    if (!home2) return null;
    if (tab === "peliculas") return [{ title: "Pel\xEDculas", titleEn: "Movies", items: home2.movies }];
    if (tab === "series") return [{ title: "Series", titleEn: "Series", items: home2.series }];
    return [
      ...home2.movies.length ? [{ title: "Tendencias en pel\xEDculas", titleEn: "Trending movies", items: home2.movies }] : [],
      ...home2.series.length ? [{ title: "Tendencias en series", titleEn: "Trending series", items: home2.series }] : []
    ];
  };
  function settingsView(device) {
    return {
      type: "Scaffold",
      appBar: {
        type: "AppBar",
        mergeWithKinoBar: true,
        dense: true,
        divider: false,
        leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("Atr\xE1s", "Back", "labelText"), onPressed: "back" },
        title: "Pelisgo"
      },
      body: { type: "SingleChildScrollView", key: "setp", children: [
        { type: "Column", padding: 24, gap: 16, crossAxisAlignment: "stretch", children: [
          { type: "Text", text: "Ajustes", textEn: "Settings", style: "h3" },
          supportNode(device)
        ] }
      ] }
    };
  }
  function browseView(tab, st, device) {
    const appBar = st.searching ? {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "backSearch", icon: "arrow_back", ...twin("Cerrar", "Close", "labelText"), onPressed: "close_search" },
      title: {
        type: "TextField",
        key: "q",
        kind: "search",
        autofocus: true,
        hintText: "Buscar en Pelisgo",
        hintTextEn: "Search Pelisgo",
        onSubmitted: "search",
        trailingIcon: "search",
        trailingLabel: "Buscar",
        trailingLabelEn: "Search",
        onTrailingTap: "search"
      }
    } : {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "close", icon: "close", ...twin("Cerrar", "Close", "labelText"), onPressed: { go: { close: true } } },
      actions: [
        { type: "IconButton", key: "searchBtn", icon: "search", ...twin("Buscar", "Search", "labelText"), onPressed: "open_search" },
        { type: "IconButton", key: "settingsBtn", icon: "settings", ...twin("Ajustes", "Settings", "labelText"), onPressed: { event: "go", arg: "settings" } }
      ],
      title: "Pelisgo"
    };
    const rows = rowsFor(tab);
    const body = [];
    let banner = null;
    if (rows) {
      const slides = (tab === "series" ? home2.series : home2.movies).filter((i) => i.backdrop || i.poster).slice(0, 6);
      if (slides.length) banner = hero(slides);
      for (const r of rows) {
        if (!r.items.length) continue;
        body.push({ type: "Column", key: "row-" + keyOf(r.title), gap: 8, children: [
          { type: "Text", style: "h4", text: r.title, textEn: r.titleEn },
          cardRow(r.items, "cr-" + keyOf(r.title))
        ] });
      }
      if (!body.length) body.push({ type: "Text", ...twin("No hay nada por aqu\xED todav\xEDa.", "Nothing here yet.", "text"), color: "muted" });
    } else if (st.failed) {
      body.push({
        type: "MaterialBanner",
        key: "fail",
        role: "error",
        ...twin("No se pudo cargar.", "Could not load."),
        action: { ...twin("Reintentar", "Retry", "label"), onTap: "retry" }
      });
    } else {
      banner = { type: "Skeleton", key: "heroSk", shape: "block", height: { compact: 200, expanded: 320 } };
      body.push(railSkeleton(1), railSkeleton(2));
    }
    return {
      type: "Scaffold",
      appBar,
      body: { type: "Column", key: "page", children: [
        tabBar(tab),
        { type: "SingleChildScrollView", key: "scroll-" + tab, flex: 1, children: [
          ...banner ? [banner] : [],
          { type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }
        ] }
      ] },
      ...home2 || st.failed ? {} : { every: { ms: 1200, event: "tick" } }
    };
  }
  function view(ctx) {
    const c = ctx && typeof ctx === "object" ? ctx : {};
    if (!(c.installed && c.installed[RESOLVER_REPO])) return installGateView(c.device);
    const st = c.state && typeof c.state === "object" ? c.state : {};
    if (c.route && c.route.name === "settings") return settingsView(c.device);
    const tab = TAB_IDS.includes(st.tab) ? st.tab : TAB_IDS[0];
    return browseView(tab, st, c.device);
  }
  const events = {
    open({ state }) {
      return { state: { tab: TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0], failed: false, searching: false } };
    },
    async tick() {
      if (home2) return null;
      try {
        home2 = await loadHome();
        return { state: { v: Date.now() } };
      } catch (e) {
        log("home", e && e.code || "error");
        return { state: { failed: true } };
      }
    },
    retry() {
      home2 = null;
      return { state: { failed: false } };
    },
    tab({ value, arg }) {
      const t = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      return t ? { state: { tab: t } } : null;
    },
    // Search: the bar becomes a field; submitting hands the query to Kino's native search.
    open_search() {
      return { state: { searching: true } };
    },
    close_search() {
      return { state: { searching: false } };
    },
    search({ value, state }) {
      const typed = value != null && String(value).trim() ? value : state.inputs && state.inputs.q;
      const q = String(typed == null ? "" : typed).trim().slice(0, 100);
      return q ? { go: { search: { q } }, state: { searching: false } } : { state: { searching: false } };
    },
    go({ arg }) {
      return arg === "settings" ? { route: { push: "settings" }, state: { fromBrowse: true } } : null;
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true } };
    }
  };
  async function event(ev) {
    const h = Object.hasOwn(events, ev.name) ? events[ev.name] : null;
    return h ? await h({ ...ev, state: ev.state || {} }) ?? null : null;
  }
  return { view, event };
}

// src/plugin.js
var getKino = () => globalThis.kino;
async function search2(query) {
  const kino = getKino();
  const dl = callDeadline(kino, "search");
  const lean = query && (query.type === "movie" || query.type === "series") ? query.type : null;
  return searchItems(kino, query, { untilMs: dl.end, lean });
}
async function home() {
  const kino = getKino();
  if (!readSettings(kino).homeRows) return [];
  const dl = callDeadline(kino, "home");
  try {
    return await homeRows(kino, { untilMs: dl.end });
  } catch (e) {
    kino.log("[pelisgo]", "home", e && e.code || "error");
    return [];
  }
}
async function browse(ref, cursor) {
  const kino = getKino();
  const dl = callDeadline(kino, "browse");
  return browsePage(kino, ref, cursor, { untilMs: dl.end });
}
async function section() {
  const kino = getKino();
  const dl = callDeadline(kino, "section");
  let rows = [];
  try {
    rows = await homeRows(kino, { untilMs: dl.end });
  } catch (e) {
    kino.log("[pelisgo]", "section", e && e.code || "error");
  }
  const first = rows[0] && rows[0].items.find((i) => i.backdrop);
  return { rows, ...first ? { hero: { title: first.title, image: first.backdrop } } : {} };
}
async function episodes2(ref) {
  const kino = getKino();
  const dl = callDeadline(kino, "episodes");
  return episodes(kino, ref, { untilMs: dl.end });
}
async function resolve2(ref) {
  const kino = getKino();
  const dl = callDeadline(kino, "resolve");
  const { preferred } = readSettings(kino);
  return resolve(kino, ref, { untilMs: dl.end, preferred });
}
var screenInstance = null;
var theScreen = () => screenInstance ?? (screenInstance = makeScreen({
  kino: getKino(),
  loadHome: async () => {
    const kino = getKino();
    const rows = await homeRows(kino, { untilMs: callDeadline(kino, "section").end });
    const byId = (id) => (rows.find((r) => r.id === id) || { items: [] }).items;
    return { movies: byId("pg-trending-movie"), series: byId("pg-trending-series") };
  }
}));
async function screen(ctx) {
  await null;
  return theScreen().view(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return theScreen().event(ev && typeof ev === "object" ? ev : {});
}
globalThis.__kinoDropPendingFetches = true;
export {
  browse,
  episodes2 as episodes,
  home,
  resolve2 as resolve,
  screen,
  screenEvent,
  search2 as search,
  section
};
