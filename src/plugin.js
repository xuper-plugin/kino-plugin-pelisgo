// Pelisgo: films and series from pelisgo.online, played through the shared kino-resolver.
//
// Kino calls: search, home, browse, episodes, resolve, screen/screenEvent.
// Refs (src/mappers.js): pg:c:<m|s>:<cuid>[:<slug>] · pg:t:<m|s>:<tmdb>:<year>:<slug> · pg:e:<epCuid> · pg:x:<embedUrl>
import { callDeadline } from "./util/time.js";
import { readSettings } from "./settings.js";
import { homeRows, tabRows, searchItems, browsePage } from "./catalog.js";
import { resolve as doResolve } from "./resolve.js";
import { episodes as doEpisodes } from "./episodes.js";
import { resolverInstalled } from "./resolve-door.js";
import { makeStandardScreen } from "./std/index.js";
import { LOGO, LOGO_ASPECT } from "./logo.js";

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
  // Every hoster goes through kino-resolver: without it nothing plays, so the person is told how to get it.
  if (!(await resolverInstalled(kino))) {
    const es = String(kino.lang || "").toLowerCase().startsWith("es");
    throw kino.error("unavailable", "resolver missing", { userMessage: es
      ? "Para reproducir, abre Pelisgo desde el menú e instala el motor de reproducción que te pedirá."
      : "To play, open Pelisgo from the menu and install the playback engine it asks for." });
  }
  const dl = callDeadline(kino, "resolve");
  const { preferred } = readSettings(kino);
  return doResolve(kino, ref, { untilMs: dl.end, preferred });
}

// ---- the screen: the standard xuper-plugin screen (src/std) ----

// Pelisgo delegates every hoster to kino-resolver (resolve() refuses while it is missing), so the screen is the install gate
// until it is installed.
let std = null;
const standard = () => (std ??= makeStandardScreen({ snapshot: "xuper-plugin/kino-plugin-pelisgo",
  kino: getKino(), name: "Pelisgo", logo: LOGO, logoAspect: LOGO_ASPECT, needsResolver: true, hasSettings: true,
  tabs: [
    { id: "inicio", label: "Inicio", labelEn: "Home" },
    { id: "peliculas", label: "Películas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
  ],
  // Each tab: Pelisgo's trending of its kind, then the site's listing pages (recent, genres): catalog.js LIST_ROWS.
  loadTab: async (tab) => {
    const kino = getKino();
    return { rows: await tabRows(kino, tab, { untilMs: callDeadline(kino, "section").end }) };
  },
}));

/** `screen(ctx)`: a pure view — the install gate while kino-resolver is missing, else the standard browse screen. */
export async function screen(ctx) { await null; return standard().screen(ctx && typeof ctx === "object" ? ctx : {}); }
/** `screenEvent(ev)`: the screen's timer loads a tab, one per tick; the bar's search goes to Kino's own search. */
export async function screenEvent(ev) { await null; return standard().screenEvent(ev && typeof ev === "object" ? ev : {}); }

// Let Kino drop a call's still-pending fetches at its budget instead of waiting on a slow source (Kino 0.9.55+).
globalThis.__kinoDropPendingFetches = true;

// std 1.7.0: the catalog door -- the author's other plugins (Da-Video) find titles here through Kino, and Kino opens and
// plays what they find in this plugin, with its own resolve.
import { catalogDoor } from "./std/catalog.js";
export const proto_catalog_search = catalogDoor(search);
