// Pelisgo: films and series from pelisgo.online, played through the shared kino-resolver.
//
// Kino calls: search, home, browse, episodes, resolve, screen/screenEvent.
// Refs (src/mappers.js): pg:c:<m|s>:<cuid>[:<slug>] · pg:t:<m|s>:<tmdb>:<year>:<slug> · pg:e:<epCuid> · pg:x:<embedUrl>
import { callDeadline } from "./util/time.js";
import { readSettings } from "./settings.js";
import { homeRows, searchItems, browsePage } from "./catalog.js";
import { resolve as doResolve } from "./resolve.js";
import { episodes as doEpisodes } from "./episodes.js";
import { makeScreen } from "./screen.js";

const getKino = () => globalThis.kino;

/** `search(query)`: Pelisgo's own search; `query.type` is a hint (that kind goes first, nothing is dropped). */
export async function search(query) {
  const kino = getKino();
  const dl = callDeadline(kino, "search");
  const lean = query && (query.type === "movie" || query.type === "series") ? query.type : null;
  return searchItems(kino, query, { untilMs: dl.end, lean });
}

/** `home()`: Pelisgo's trending, split into a Movies row and a Series row (unless the person turned the rows off). */
export async function home() {
  const kino = getKino();
  if (!readSettings(kino).homeRows) return [];
  const dl = callDeadline(kino, "home");
  try { return await homeRows(kino, { untilMs: dl.end }); } catch (e) { kino.log("[pelisgo]", "home", (e && e.code) || "error"); return []; }
}

/** `browse(ref, cursor)`: a "Ver más" of a home row (trending has no pages, so later pages are empty). */
export async function browse(ref, cursor) {
  const kino = getKino();
  const dl = callDeadline(kino, "browse");
  return browsePage(kino, ref, cursor, { untilMs: dl.end });
}

/** `section()`: the plugin's own section in Kino's browse — Pelisgo's trending rows with a hero. */
export async function section() {
  const kino = getKino();
  const dl = callDeadline(kino, "section");
  let rows = [];
  try { rows = await homeRows(kino, { untilMs: dl.end }); } catch (e) { kino.log("[pelisgo]", "section", (e && e.code) || "error"); }
  const first = rows[0] && rows[0].items.find((i) => i.backdrop);
  return { rows, ...(first ? { hero: { title: first.title, image: first.backdrop } } : {}) };
}

/** `episodes(ref)`: a series' episodes, from its server-rendered page. */
export async function episodes(ref) {
  const kino = getKino();
  const dl = callDeadline(kino, "episodes");
  return doEpisodes(kino, ref, { untilMs: dl.end });
}

/** `resolve(ref)`: one copy in the person's language, the rest as alternatives. */
export async function resolve(ref) {
  const kino = getKino();
  const dl = callDeadline(kino, "resolve");
  const { preferred } = readSettings(kino);
  return doResolve(kino, ref, { untilMs: dl.end, preferred });
}

// ---- the browse screen (install gate + donate live inside it) ----

let screenInstance = null;
const theScreen = () => (screenInstance ??= makeScreen({
  kino: getKino(),
  loadHome: async () => {
    const kino = getKino();
    const rows = await homeRows(kino, { untilMs: callDeadline(kino, "section").end });
    const byId = (id) => (rows.find((r) => r.id === id) || { items: [] }).items;
    return { movies: byId("pg-trending-movie"), series: byId("pg-trending-series") };
  },
}));

/** `screen(ctx)`: a pure view — the install gate while kino-resolver is missing, else the browse screen. */
export async function screen(ctx) { await null; return theScreen().view(ctx && typeof ctx === "object" ? ctx : {}); }
/** `screenEvent(ev)`: the screen's timers load trending / run a search, one per tick. */
export async function screenEvent(ev) { await null; return theScreen().event(ev && typeof ev === "object" ? ev : {}); }

// Let Kino drop a call's still-pending fetches at its budget instead of waiting on a slow source (Kino 0.9.55+).
globalThis.__kinoDropPendingFetches = true;
