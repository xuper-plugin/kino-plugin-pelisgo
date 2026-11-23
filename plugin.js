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
  version: "0.2.2",
  apiVersion: 30,
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
  if (!streams.length && !(res && res.error === "dead")) streams = await captureStreams(kino, embedUrl, referer);
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
async function resolverInstalled(kino) {
  try {
    await kino.plugins.call(RESOLVER_ALIAS, "normalizeHost", { url: "https://probe.invalid/" });
    return true;
  } catch (err) {
    return (err && err.code) !== "provider_missing";
  }
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

// src/std/model.js
var MAX_SLIDES = 5;
var MAX_RAILS = 8;
var MAX_RAIL_ITEMS = 20;
var MAX_SLIDE_TEXT = 160;
var HTTPS = /^https:\/\//;
function cardOf(item) {
  const out = { id: item.id, ref: item.ref, title: item.title, kind: item.kind };
  if (item.poster && HTTPS.test(item.poster)) out.poster = item.poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.badges) out.badges = item.badges;
  if (item.rating !== void 0) out.rating = item.rating;
  if (item.year !== void 0) out.year = item.year;
  if (item.ids && item.ids.tmdb) out.ids = { tmdb: item.ids.tmdb };
  if (item.lang) out.lang = item.lang;
  if (item.adult === true) out.adult = true;
  return out;
}
var slidesOf = (rows) => pickSlides(rows, (item) => item.backdrop);
var posterSlidesOf = (rows) => pickSlides(rows, (item) => item.poster);
function slideText(overview, item = {}) {
  const text = typeof overview === "string" ? overview.trim() : "";
  if (text === "") return [item.year, item.rating ? "\u2605 " + item.rating : null].filter(Boolean).join(" \xB7 ");
  return text.length <= MAX_SLIDE_TEXT ? text : `${text.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}\u2026`;
}
function pickSlides(rows, pictureOf) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    for (const item of row.items || []) {
      if (out.length >= MAX_SLIDES) return out;
      const image = pictureOf(item);
      if (item.adult === true || seen.has(item.id) || !image || !HTTPS.test(image)) continue;
      seen.add(item.id);
      out.push({ id: item.id, ref: item.ref, kind: item.kind, title: item.title, image, text: slideText(item.overview, item) });
    }
  }
  return out;
}
var uniform = (items) => items.every((i) => i.backdrop) ? items : items.map(({ backdrop, ...rest }) => rest);
function railsOf(rows) {
  return rows.filter((r) => !r.hidden && r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...r.titleEn ? { titleEn: r.titleEn } : {},
    ...r.ref ? { ref: r.ref } : {},
    items: uniform(r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf))
  }));
}
function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), posterSlides: posterSlidesOf(rows), rails };
}
function playedKey(ref) {
  const m = /^(?:m|s|e):(\d{1,10})(?::|$)/.exec(String(ref || ""));
  return m ? `t:${m[1]}` : String(ref || "");
}
function recentOf(keys, tabs) {
  if (keys.length === 0) return [];
  const byKey = /* @__PURE__ */ new Map();
  for (const data of tabs) {
    for (const rail2 of data.rails) {
      for (const card of rail2.items) {
        const ks = [card.ref];
        if (card.ids && card.ids.tmdb) ks.push(`t:${card.ids.tmdb}`);
        for (const k of ks) if (!byKey.has(k)) byKey.set(k, card);
      }
    }
  }
  const out = [];
  const used = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}

// src/std/strings.js
var WORDS = {
  watch: ["Ver", "Watch"],
  info: ["M\xE1s informaci\xF3n", "More info"],
  recent: ["Continuar viendo", "Continue watching"],
  search: ["Buscar", "Search"],
  searchHint: ["Buscar en {name}", "Search {name}"],
  failed: ["No se pudo cargar esta secci\xF3n. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  retry: ["Reintentar", "Retry"],
  empty: ["A\xFAn no hay nada aqu\xED.", "Nothing here yet."],
  back: ["Atr\xE1s", "Back"],
  close: ["Cerrar", "Close"],
  settings: ["Ajustes", "Settings"],
  supportTv: ["Si te gusta mi trabajo, escan\xE9alo y ap\xF3yame", "If you like my work, scan it and support me"],
  support: ["Si te gusta mi trabajo, ap\xF3yame", "If you like my work, support me"],
  gateTitle: ["Necesitas el motor de reproducci\xF3n", "You need the playback engine"],
  gateText: [
    "{name} reproduce a trav\xE9s de Kino Resolver (gratis). Inst\xE1lalo una vez y sirve para este y para otros plugins de sitios.",
    "{name} plays through Kino Resolver (free). Install it once and it works here and in other site plugins."
  ],
  gateInstall: ["Instalar Kino Resolver", "Install Kino Resolver"]
};
var fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] != null ? String(vars[k]) : m);
function twin(key, field = "text", vars) {
  const [es, en] = WORDS[key];
  const pick = (i) => vars && Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, Array.isArray(v) ? v[i] : v]));
  return { [field]: fill(es, pick(0)), [field + "En"]: fill(en, pick(1)) };
}
var STRING_KEYS = Object.keys(WORDS);

// src/std/view.js
var SUPPORT_URL = "https://ko-fi.com/xuperplugins";
var RESOLVER_REPO = "xuper-plugin/kino-plugin-kino-resolver";
var POLL_MS = 1500;
function brand(cfg) {
  return {
    type: "Row",
    key: "brand",
    gap: 12,
    crossAxisAlignment: "center",
    children: [
      ...cfg.logo ? [{ type: "Image", key: "logo", url: cfg.logo, aspect: cfg.logoAspect || "1:1", fit: "contain", h: 32, alt: cfg.name, altEn: cfg.nameEn || cfg.name }] : [],
      { type: "Text", key: "name", style: "h4", text: cfg.name, textEn: cfg.nameEn || cfg.name }
    ]
  };
}
var tabBar = (tabs, active) => ({
  type: "TabBar",
  key: "tabs",
  divider: false,
  value: active,
  onChanged: "tab",
  tabs: tabs.map((t) => ({ value: t.id, label: t.label, labelEn: t.labelEn || t.label }))
});
var iconButton = (key, icon, word, onPressed) => ({ type: "IconButton", key, icon, ...twin(word, "labelText"), ...twin(word, "tooltip"), onPressed });
var searchOpenOps = (tabsInBar) => [
  { hide: "brand" },
  { hide: "searchButton" },
  { hide: "settingsButton" },
  ...tabsInBar ? [{ hide: "tabs" }] : [],
  { show: "closeSearch" },
  { show: "q" },
  { focus: "q" }
];
var searchClosedOps = (tabsInBar) => [
  { hide: "closeSearch" },
  { hide: "q" },
  { clear: "q" },
  { show: "brand" },
  { show: "searchButton" },
  { show: "settingsButton" },
  ...tabsInBar ? [{ show: "tabs" }] : []
];
function supportNode(device) {
  if (device === "tv") return { type: "QrImage", key: "donate", value: SUPPORT_URL, size: "large", ...twin("supportTv", "labelText") };
  return { type: "ElevatedButton", key: "donate", icon: "heart", ...twin("support", "labelText"), onPressed: { go: { url: { href: SUPPORT_URL } } } };
}
var bar = ({ leading, title, actions = [] }) => ({ type: "AppBar", mergeWithKinoBar: true, dense: true, divider: false, leading, title, actions });
var railSkeleton = (n) => ({
  type: "Column",
  key: "skel" + n,
  gap: 8,
  children: [
    { type: "Skeleton", shape: "line", width: 120 },
    { type: "Row", gap: 12, sizes: ["compact"], children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}c${i}`, flex: 1 })) },
    { type: "Row", gap: 12, sizes: ["medium", "expanded"], children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}w${i}`, flex: 1 })) }
  ]
});
var heroSkeleton = () => ({ type: "Skeleton", key: "heroSkeleton", shape: "block", height: { compact: 200, expanded: 320 } });
var titleOf = (s) => ({ ref: s.ref, kind: s.kind, id: s.id, title: s.title });
var withHeaders = (headers) => headers ? { headers } : {};
var slideNode = (s, headers) => ({
  type: "heroCard",
  key: "slide-" + s.id,
  h: { compact: 200, expanded: 240 },
  ...s.logo ? { logo: s.logo } : {},
  title: s.title,
  text: s.text,
  image: s.image,
  ...withHeaders(headers),
  buttons: [
    { type: "ElevatedButton", key: "watch-" + s.id, ...twin("watch", "labelText"), icon: "play", onPressed: { go: { play: titleOf(s) } } },
    { type: "TextButton", key: "info-" + s.id, ...twin("info", "labelText"), onPressed: { go: { title: titleOf(s) } } }
  ]
});
var hero = (slides, headers) => slides.length === 1 ? slideNode(slides[0], headers) : {
  type: "PageView",
  key: "hero" + slides.length,
  autoPlayMs: 6e3,
  children: slides.map((s) => slideNode(s, headers))
};
var rail = (r, key, words, headers) => ({
  type: "titleRail",
  key,
  ...words || { title: r.title, titleEn: r.titleEn || r.title },
  ...r.ref ? { ref: r.ref } : {},
  items: r.items,
  ...withHeaders(headers)
});
function browseView(cfg, { tab, data, recent, pending, failed, searching = false, device = "phone" }) {
  const tv = device === "tv";
  const tabs = cfg.tabs;
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const withTabs = tabs.length > 1;
  const body = [];
  if (data) {
    const h = cfg.imageHeaders;
    if (data.slides.length > 0) body.push(hero(data.slides, h));
    if (recent.length > 0) body.push(rail({ items: recent }, "recent", twin("recent", "title"), h));
    for (const r of data.rails) body.push(rail(r, "rail-" + String(r.id).replace(/[^A-Za-z0-9_-]/g, "_"), null, h));
    if (data.rails.length === 0) body.push({ type: "Text", key: "empty", ...twin("empty"), color: "muted" });
  } else if (failed) {
    body.push({ type: "MaterialBanner", key: "loadFailed", role: "error", ...twin("failed"), action: { ...twin("retry", "label"), onTap: "retry" } });
  } else {
    body.push(heroSkeleton(), railSkeleton(1), railSkeleton(2), railSkeleton(3));
  }
  const isBanner = (n) => !!n && (n.type === "heroCard" || n.key === "heroSkeleton" || n.type === "PageView" && String(n.key).startsWith("hero"));
  const banner = body.length > 0 && isBanner(body[0]) ? body.shift() : null;
  const tabsInBar = tv && withTabs;
  const appBar = bar({
    leading: iconButton("close", "close", "close", { go: { close: true } }),
    title: { type: "Row", key: "titleRow", gap: tabsInBar ? 24 : 8, crossAxisAlignment: "center", children: [
      { ...iconButton("closeSearch", "arrow_back", "back", { ui: searchClosedOps(tabsInBar), event: "closeSearch" }), hidden: !searching },
      { ...brand(cfg), hidden: searching },
      ...tabsInBar ? [{ ...tabBar(tabs, active), hidden: searching }] : [],
      {
        type: "TextField",
        key: "q",
        hidden: !searching,
        ...searching ? { autofocus: true } : {},
        flex: 1,
        kind: "search",
        maxLength: 200,
        ...twin("searchHint", "hintText", { name: [cfg.name, cfg.nameEn || cfg.name] }),
        onSubmitted: "search",
        trailingIcon: "search",
        ...twin("search", "trailingLabel"),
        onTrailingTap: "search"
      }
    ] },
    actions: [
      { ...iconButton("searchButton", "search", "search", { ui: searchOpenOps(tabsInBar), event: "searchRoute" }), hidden: searching },
      { ...iconButton("settingsButton", "settings", "settings", "openSettings"), hidden: searching }
    ]
  });
  return {
    type: "Scaffold",
    appBar,
    body: { type: "Column", key: "page", children: [
      ...withTabs && !tv ? [{ type: "Column", key: "tabsRow", padding: { compact: 0, expanded: 24 }, children: [tabBar(tabs, active)] }] : [],
      { type: "SingleChildScrollView", key: "browse-" + active, flex: 1, children: [...banner ? [banner] : [], { type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] }
    ] },
    ...pending ? { every: { ms: POLL_MS, event: "tick" } } : {}
  };
}
function settingsView(cfg, device = "phone") {
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("back", "arrow_back", "back", "back"), title: brand(cfg) }),
    body: { type: "SingleChildScrollView", key: "settings-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: [
      ...cfg.hasSettings ? [{ type: "settings", key: "form" }, { type: "Divider", key: "supportDivider" }] : [],
      supportNode(device)
    ] }] }
  };
}
function gateView(cfg, device = "phone") {
  const name = [cfg.name, cfg.nameEn || cfg.name];
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("close", "close", "close", { go: { close: true } }), title: brand(cfg) }),
    body: { type: "Column", key: "gate", mainAxisAlignment: "center", crossAxisAlignment: "center", padding: 24, gap: 16, children: [
      { type: "Text", key: "gateTitle", style: "h3", ...twin("gateTitle") },
      { type: "Text", key: "gateText", style: "p", ...twin("gateText", "text", { name }) },
      { type: "ElevatedButton", key: "installResolver", ...twin("gateInstall", "labelText"), onPressed: { go: { installPlugin: { repo: RESOLVER_REPO } } } },
      supportNode(device)
    ] }
  };
}

// src/std/metaCache.js
var KEY = "meta3";
var MAX = 160;
var CONCURRENCY = 3;
var OVERVIEW_MAX = 160;
var HTTPS2 = /^https:\/\//;
function makeMetaCache({ kino, titleOf: titleOf2 = (c) => c.title, typeOf = (c) => c.kind === "series" ? "series" : "movie", tmdbPictures = false, clock = { now: () => Date.now() } }) {
  const usable = () => {
    try {
      return typeof kino.meta === "function" && kino.meta.byTitle === true;
    } catch (_) {
      return false;
    }
  };
  let book = null;
  function read() {
    if (book) return book;
    try {
      const o = JSON.parse(kino.storage.get(KEY) || "null");
      book = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      book = {};
    }
    return book;
  }
  function write() {
    try {
      const ids = Object.keys(book);
      if (ids.length > MAX) for (const id of ids.slice(0, ids.length - MAX)) delete book[id];
      kino.storage.set(KEY, JSON.stringify(book));
    } catch (_) {
    }
  }
  function known(id) {
    const e = read()[id];
    if (!e) return {};
    return {
      ...e.t > 0 ? { tmdb: e.t } : {},
      ...e.l && HTTPS2.test(e.l) ? { logo: e.l } : {},
      ...e.p && HTTPS2.test(e.p) ? { poster: e.p } : {},
      ...e.b && HTTPS2.test(e.b) ? { backdrop: e.b } : {},
      ...typeof e.o === "string" && e.o ? { overview: e.o } : {}
    };
  }
  const asked = (id) => Object.hasOwn(read(), id);
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      const poster = tmdbPictures && k.poster ? k.poster : null;
      if (!k.tmdb && !poster) return c;
      return { ...c, ...k.tmdb && !(c.ids && c.ids.tmdb) ? { ids: { ...c.ids || {}, tmdb: k.tmdb } } : {}, ...poster ? { poster } : {} };
    });
  }
  async function fill2(cards, budgetMs) {
    if (!usable()) return 0;
    const b = read();
    const end = clock.now() + budgetMs;
    let count = 0;
    let stop = false;
    const seen = /* @__PURE__ */ new Set();
    const todo = cards.filter((c) => {
      if (!c || typeof c.id !== "string" || seen.has(c.id) || Object.hasOwn(b, c.id) || c.ids && c.ids.tmdb && c.noLogo) return false;
      seen.add(c.id);
      return true;
    });
    let next = 0;
    const str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
    const worker = async () => {
      while (!stop && next < todo.length && clock.now() < end) {
        const c = todo[next++];
        const year = c.year !== void 0 ? { year: c.year } : {};
        try {
          const a = await kino.meta({ type: typeOf(c), title: titleOf2(c), ...year });
          b[c.id] = {
            t: a && a.ids && Number.isInteger(a.ids.tmdb) ? a.ids.tmdb : 0,
            l: str(a && a.logo, 2048),
            p: str(a && a.poster, 2048),
            b: str(a && a.backdrop, 2048),
            o: str(a && a.overview, OVERVIEW_MAX)
          };
          count++;
        } catch (e) {
          if (e && e.code === "rate_limited") stop = true;
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (count > 0) write();
    return count;
  }
  return { known, asked, dress, fill: fill2, usable, tmdbPictures };
}

// src/std/index.js
var TAB_KEY = "browseTab";
var SNAP_PREFIX = "browse1:";
var SNAP_TTL_MS = 7 * 24 * 3600 * 1e3;
var SNAP_MAX = 20 * 1024;
var SNAPS_TOTAL = 96 * 1024;
var RECENT_KEY = "recent1";
var RECENT_MAX = 12;
var Q_MAX = 200;
var META_TICK_MS = 3e3;
var META_TICK_CARDS = 24;
var INFLIGHT_KEY = "std:inflight";
var INFLIGHT_STALE_MS = 18e3;
var MAX_META_TICKS = 10;
var DEFAULT_TABS = [{ id: "inicio", label: "Inicio", labelEn: "Home" }];
function makeStandardScreen({ kino, name, nameEn, logo = null, logoAspect = "1:1", needsResolver, hasSettings, tabs, loadTab, homeKey = null, titleOf: titleOf2, typeOf, tmdbPictures = false, imageHeaders = null }) {
  const cfg = { name, nameEn, logo, logoAspect, imageHeaders, hasSettings: !!hasSettings, tabs: Array.isArray(tabs) && tabs.length > 0 ? tabs : DEFAULT_TABS };
  const TAB_IDS = cfg.tabs.map((t) => t.id);
  const meta = makeMetaCache({ kino, titleOf: titleOf2, typeOf, tmdbPictures });
  function slidesFromMeta(rails) {
    const out = [];
    for (const r of rails) {
      for (const c of r.items) {
        if (out.length >= MAX_SLIDES) return out;
        const k = meta.known(c.id);
        if (!k.backdrop || c.adult === true || out.some((x) => x.id === c.id)) continue;
        out.push({ id: c.id, ref: c.ref, kind: c.kind, title: c.title, image: k.backdrop, text: slideText(k.overview, c), ...k.logo ? { logo: k.logo } : {} });
      }
    }
    return out;
  }
  const enrich = (data) => {
    if (!data) return data;
    const own = data.slides.map((s) => {
      const k = meta.known(s.id);
      const image = tmdbPictures && k.backdrop ? k.backdrop : null;
      return k.logo || image ? { ...s, ...k.logo ? { logo: k.logo } : {}, ...image ? { image } : {} } : s;
    });
    const learned = own.length > 0 ? [] : slidesFromMeta(data.rails);
    return {
      // The site's own backdrops, else TMDB's, else the posters: every plugin has a hero.
      slides: own.length > 0 ? own : learned.length > 0 ? learned : data.posterSlides || [],
      rails: data.rails.map((r) => ({ ...r, items: meta.dress(r.items) }))
    };
  };
  const metaTicks = /* @__PURE__ */ new Map();
  const memo = /* @__PURE__ */ new Map();
  const log = (...a) => {
    try {
      kino.log("[std]", ...a);
    } catch (_) {
    }
  };
  const get = (k) => {
    try {
      return kino.storage.get(k);
    } catch (_) {
      return null;
    }
  };
  const set = (k, v, opts) => {
    try {
      kino.storage.set(k, v, opts);
    } catch (_) {
    }
  };
  function readSnap(tab) {
    try {
      const o = JSON.parse(get(SNAP_PREFIX + tab) || "null");
      return o && Date.now() - o.at < SNAP_TTL_MS && o.data && Array.isArray(o.data.rails) ? o.data : null;
    } catch (_) {
      return null;
    }
  }
  const snapMax = Math.min(SNAP_MAX, Math.floor(SNAPS_TOTAL / TAB_IDS.length));
  function writeSnap(tab, data) {
    for (let per = 10; per >= 3; per -= 2) {
      const slim = { slides: data.slides, posterSlides: data.posterSlides || [], rails: data.rails.map((r) => ({ ...r, items: r.items.slice(0, per) })) };
      const text = JSON.stringify({ at: Date.now(), data: slim });
      if (text.length <= snapMax) {
        set(SNAP_PREFIX + tab, text, { ttlMs: SNAP_TTL_MS });
        return;
      }
    }
  }
  function homeSeed(tab) {
    if (!homeKey || tab !== TAB_IDS[0]) return null;
    try {
      const o = JSON.parse(get(homeKey) || "null");
      return o && Array.isArray(o.rows) && o.rows.length ? tabOf({ rows: o.rows }) : null;
    } catch (_) {
      return null;
    }
  }
  const stored = () => {
    const t = get(TAB_KEY);
    return TAB_IDS.includes(t) ? t : null;
  };
  function dataOf(tab) {
    if (memo.has(tab)) return memo.get(tab).data;
    const snap = readSnap(tab) || homeSeed(tab);
    if (snap) {
      memo.set(tab, { data: snap, whole: false });
      return snap;
    }
    return null;
  }
  const readKeys = () => {
    try {
      const a = JSON.parse(get(RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter((k) => typeof k === "string") : [];
    } catch (_) {
      return [];
    }
  };
  function notePlayed(ref) {
    try {
      const key = playedKey(ref);
      if (key === "" || key.startsWith("x|")) return;
      const keys = readKeys();
      if (keys[0] === key) return;
      set(RECENT_KEY, JSON.stringify([key, ...keys.filter((k) => k !== key)].slice(0, RECENT_MAX)));
    } catch (_) {
    }
  }
  const tabFromArgs = (route) => {
    const a = route && route.args && typeof route.args === "object" ? route.args : {};
    return TAB_IDS.includes(a.tab) ? a.tab : null;
  };
  function needed(tab) {
    return memo.get(tab) && memo.get(tab).whole ? [] : [tab];
  }
  function screen2(ctx) {
    const c = ctx || {};
    const device = c.device || "phone";
    if (needsResolver && !(c.installed && c.installed[RESOLVER_REPO])) return gateView(cfg, device);
    if (c.route && c.route.name === "settings") return settingsView(cfg, device);
    const st = c.state && typeof c.state === "object" ? c.state : {};
    const tab = TAB_IDS.includes(st.tab) ? st.tab : tabFromArgs(c.route) ?? stored() ?? TAB_IDS[0];
    const data = enrich(dataOf(tab));
    const loaded = TAB_IDS.map((t) => memo.get(t)).filter(Boolean).map((m) => m.data);
    const pending = Array.isArray(st.pending) && st.pending.length > 0;
    const searching = !!(c.route && c.route.name === "search");
    return browseView(cfg, { tab, data, recent: meta.dress(recentOf(readKeys(), loaded)), pending, failed: !!(st.failed && st.failed[tab]), searching, device });
  }
  function cutShort() {
    try {
      const o = JSON.parse(get(INFLIGHT_KEY) || "null");
      if (!o || typeof o.tab !== "string") return null;
      if (Date.now() - Number(o.at) < INFLIGHT_STALE_MS) return null;
      kino.storage.remove(INFLIGHT_KEY);
      return o.tab;
    } catch (_) {
      return null;
    }
  }
  async function load(tab) {
    set(INFLIGHT_KEY, JSON.stringify({ tab, at: Date.now() }));
    let page;
    try {
      page = await loadTab(tab);
    } finally {
      try {
        kino.storage.remove(INFLIGHT_KEY);
      } catch (_) {
      }
    }
    const data = tabOf(page);
    if (data) {
      memo.set(tab, { data, whole: true });
      writeSnap(tab, data);
    }
    return data !== null;
  }
  const events = {
    open({ route, state, device }) {
      const tab = tabFromArgs(route) ?? (TAB_IDS.includes(state.tab) ? state.tab : stored() ?? TAB_IDS[0]);
      for (const t of TAB_IDS) dataOf(t);
      return { state: { tab, pending: needed(tab), failed: null } };
    },
    tab({ value, arg, state }) {
      const tab = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      if (!tab) return null;
      set(TAB_KEY, tab);
      dataOf(tab);
      const failed = { ...state.failed || {} };
      delete failed[tab];
      const pending = [tab, ...Array.isArray(state.pending) ? state.pending.filter((t) => t !== tab) : []];
      return { state: { tab, pending: memo.get(tab) && memo.get(tab).whole ? pending.slice(1) : pending, failed } };
    },
    retry({ state }) {
      const tab = TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0];
      return { state: { failed: null, pending: [tab] } };
    },
    async tick({ state }) {
      const pending = Array.isArray(state.pending) ? state.pending : [];
      if (pending.length === 0) return null;
      const [next, ...rest] = pending;
      const failed = { ...state.failed || {} };
      if (next.startsWith("meta:")) {
        const tab = next.slice(5);
        const m = memo.get(tab);
        if (!m) return { state: { pending: rest } };
        const ask = (x) => ({ id: x.id, title: x.title, kind: x.kind, ...x.year !== void 0 ? { year: x.year } : {} });
        const noOwnSlides = m.data.slides.length === 0;
        const cards = [...m.data.slides.map(ask), ...m.data.rails.flatMap((r) => r.items.slice(0, noOwnSlides ? MAX_SLIDES * 3 : 6).map(ask))].filter((c) => !meta.asked(c.id)).slice(0, META_TICK_CARDS);
        const count = await meta.fill(cards, META_TICK_MS);
        const ticks = (metaTicks.get(tab) || 0) + 1;
        metaTicks.set(tab, ticks);
        const again = noOwnSlides && count > 0 && ticks < MAX_META_TICKS && slidesFromMeta(m.data.rails).length < MAX_SLIDES && cards.some((c) => !meta.asked(c.id));
        return { state: { pending: again ? [next, ...rest] : rest } };
      }
      if (cutShort() === next) {
        log("tab", next, "cut short by Kino last time");
        failed[next] = true;
        return { state: { pending: rest, failed } };
      }
      try {
        const ok = await load(next);
        if (!ok) failed[next] = true;
        else delete failed[next];
        if (ok && meta.usable()) rest.unshift("meta:" + next);
      } catch (e) {
        log("tab", e && e.code || "error");
        failed[next] = true;
      }
      return { state: { pending: rest, failed } };
    },
    // The words go to Kino's own search, with this plugin as the source; the bar is put back as it was, locally.
    // The search button's own event (after its local ops): the "search" route, so Kino's Back pops it instead of closing the
    // screen. The local ops are dropped with it: the route's tree draws the box, and after a pop the main tree's defaults hold.
    searchRoute({ route }) {
      return route && route.name === "search" ? null : { route: { push: "search" }, state: { ui: null } };
    },
    closeSearch({ route }) {
      return route && route.name === "search" ? { route: { pop: true }, state: { ui: null } } : { state: { ui: null } };
    },
    search({ value, state, device, route }) {
      const typed = value && typeof value === "object" ? value.q : value;
      const raw = typed != null && String(typed).trim() !== "" ? typed : state.inputs && state.inputs.q;
      const q = String(raw == null ? "" : raw).trim().slice(0, Q_MAX);
      if (!q) return null;
      return route && route.name === "search" ? { go: { search: { q } }, route: { pop: true }, state: { ui: null } } : { go: { search: { q } }, ui: searchClosedOps(device === "tv" && TAB_IDS.length > 1) };
    },
    openSettings() {
      return { route: { push: "settings" }, state: { fromBrowse: true } };
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { fromBrowse: false } };
    }
  };
  async function screenEvent2(ev) {
    const e = ev || {};
    const name2 = e.name != null ? e.name : e.event;
    const handler = typeof name2 === "string" && Object.hasOwn(events, name2) ? events[name2] : null;
    return handler ? await handler({ ...e, state: e.state || {} }) ?? null : null;
  }
  return { screen: screen2, screenEvent: screenEvent2, notePlayed };
}

// src/logo.js
var LOGO = "data:image/png;base64,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";
var LOGO_ASPECT = "1:1";

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
  if (!await resolverInstalled(kino)) {
    const es = String(kino.lang || "").toLowerCase().startsWith("es");
    throw kino.error("unavailable", "resolver missing", { userMessage: es ? "Para reproducir, abre Pelisgo desde el men\xFA e instala el motor de reproducci\xF3n que te pedir\xE1." : "To play, open Pelisgo from the menu and install the playback engine it asks for." });
  }
  const dl = callDeadline(kino, "resolve");
  const { preferred } = readSettings(kino);
  return resolve(kino, ref, { untilMs: dl.end, preferred });
}
var std = null;
var standard = () => std ?? (std = makeStandardScreen({
  kino: getKino(),
  name: "Pelisgo",
  logo: LOGO,
  logoAspect: LOGO_ASPECT,
  needsResolver: true,
  hasSettings: true,
  tabs: [
    { id: "inicio", label: "Inicio", labelEn: "Home" },
    { id: "peliculas", label: "Pel\xEDculas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" }
  ],
  // Pelisgo's trending rows: Inicio has both, Películas and Series one each.
  loadTab: async (tab) => {
    const kino = getKino();
    const rows = await homeRows(kino, { untilMs: callDeadline(kino, "section").end });
    const movies = rows.filter((x) => x.id === "pg-trending-movie");
    const series = rows.filter((x) => x.id === "pg-trending-series");
    return { rows: tab === "peliculas" ? movies : tab === "series" ? series : [...movies, ...series] };
  }
}));
async function screen(ctx) {
  await null;
  return standard().screen(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return standard().screenEvent(ev && typeof ev === "object" ? ev : {});
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
