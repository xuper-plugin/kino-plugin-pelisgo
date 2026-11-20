// Pelisgo's own browse screen: one merged bar, three tabs (Inicio / Películas / Series), a hero carousel and poster
// rails from /api/trending, plus a search page. A pure view of what the controller holds; data loads in the `open`
// and `tick` events (screen() itself never touches the network). Modeled on the Latino plugin's browse screen.
import { RESOLVER_REPO } from "./resolve-door.js";

const TABS = [
  { id: "inicio", es: "Inicio", en: "Home" },
  { id: "peliculas", es: "Películas", en: "Movies" },
  { id: "series", es: "Series", en: "Series" },
];
const TAB_IDS = TABS.map((t) => t.id);
const SUPPORT_URL = "https://ko-fi.com/xuperplugins";
const twin = (es, en, field = "text") => ({ [field]: es, [field + "En"]: en });

const logo = () => ({ type: "Text", text: "Pelisgo", textEn: "Pelisgo", style: "h4" });

/** The donate affordance under every install gate: a QR on TV (a remote can't open a link), a heart button elsewhere. */
function supportNode(device) {
  if (device === "tv") {
    return { type: "QrImage", value: SUPPORT_URL, size: "large",
      labelText: "Si te gusta mi trabajo, escanéalo y apóyame", labelTextEn: "If you like my work, scan it and support me" };
  }
  return { type: "ElevatedButton", key: "donate", icon: "heart", labelText: "Si te gusta mi trabajo, apóyame",
    labelTextEn: "If you like my work, support me", onPressed: { go: { url: { href: SUPPORT_URL } } } };
}

/** Shown as the first screen while kino-resolver (the playback engine) is not installed; the donate button sits under it. */
function installGateView(device) {
  return {
    type: "Scaffold", key: "pg-install",
    body: { type: "SingleChildScrollView", key: "installScroll", children: [
      { type: "Column", padding: 24, gap: 16, crossAxisAlignment: "stretch", children: [
        { type: "Text", text: "Necesitas el motor de reproducción", textEn: "You need the playback engine", style: "h3" },
        { type: "Text", color: "secondary",
          text: "Pelisgo reproduce a través de Kino Resolver (gratis). Instálalo una vez y sirve para este y para otros plugins de sitios.",
          textEn: "Pelisgo plays through Kino Resolver (free). Install it once and it works here and in other site plugins." },
        { type: "ElevatedButton", key: "installResolver", labelText: "Instalar Kino Resolver", labelTextEn: "Install Kino Resolver",
          onPressed: { go: { installPlugin: { repo: RESOLVER_REPO } } } },
        supportNode(device),
      ] },
    ] },
  };
}

// ---- widget helpers ----

const card = (it) => ({
  type: "posterCard", key: "c-" + it.id, title: it.title, ...(it.poster ? { image: it.poster } : {}),
  ...(it.year ? { subtitle: String(it.year) } : {}),
  onPressed: { go: { title: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } } },
});
const cardRow = (items, key) => ({ type: "Row", key, gap: 12, scroll: true, children: items.slice(0, 24).map(card) });

const slide = (it) => ({
  type: "heroCard", key: "s-" + it.id, h: { compact: 200, expanded: 240 }, title: it.title,
  ...(it.overview ? { text: it.overview.length <= 160 ? it.overview : it.overview.slice(0, 159).trimEnd() + "…" } : {}),
  ...(it.backdrop || it.poster ? { image: it.backdrop || it.poster } : {}),
  buttons: [
    { type: "ElevatedButton", key: "watch-" + it.id, ...twin("Ver", "Watch", "labelText"), icon: "play",
      onPressed: { go: it.kind === "movie" ? { play: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } }
        : { title: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } } } },
    { type: "TextButton", key: "info-" + it.id, ...twin("Info", "Info", "labelText"),
      onPressed: { go: { title: { ref: it.ref, kind: it.kind, id: it.id, title: it.title } } } },
  ],
});

const hero = (items) => (items.length === 1 ? slide(items[0])
  : { type: "PageView", key: "hero" + items.length, autoPlayMs: 6000, children: items.map(slide) });

const railSkeleton = (n) => ({ type: "Column", key: "sk" + n, gap: 8, children: [
  { type: "Skeleton", shape: "line", width: 140 },
  { type: "Row", gap: 12, children: [1, 2, 3, 4].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}-${i}`, flex: 1 })) },
] });

const tabBar = (active) => ({ type: "TabBar", key: "tabs", divider: false, value: active, onChanged: "tab",
  tabs: TABS.map((t) => ({ value: t.id, ...twin(t.es, t.en, "label") })) });

/**
 * The browse controller. `loadHome()` -> `{ movies, series }` (Kino items); `searchItems(q)` -> items for the query.
 */
export function makeScreen({ kino, loadHome, searchItems }) {
  let home = null;        // { movies, series } once loaded
  let found = null;       // { q, items } last search
  const log = (...a) => { try { kino.log("[pelisgo]", ...a); } catch (_) { /* no log */ } };

  const rowsFor = (tab) => {
    if (!home) return null;
    if (tab === "peliculas") return [{ title: "Películas", titleEn: "Movies", items: home.movies }];
    if (tab === "series") return [{ title: "Series", titleEn: "Series", items: home.series }];
    return [
      ...(home.movies.length ? [{ title: "Tendencias en películas", titleEn: "Trending movies", items: home.movies }] : []),
      ...(home.series.length ? [{ title: "Tendencias en series", titleEn: "Trending series", items: home.series }] : []),
    ];
  };

  function browseView(tab, st, device) {
    const gear = { type: "IconButton", key: "settingsButton", icon: "settings", ...twin("Ajustes", "Settings", "tooltip"),
      onPressed: { event: "go", arg: "settings" } };
    const tv = device === "tv";
    const rows = rowsFor(tab);
    const body = [];
    let banner = null;
    if (rows) {
      const slides = (tab === "series" ? home.series : home.movies).filter((i) => i.backdrop || i.poster).slice(0, 6);
      if (slides.length) banner = hero(slides);
      for (const r of rows) {
        if (!r.items.length) continue;
        body.push({ type: "Column", key: "row-" + r.title, gap: 8, children: [
          { type: "Text", style: "h4", text: r.title, textEn: r.titleEn }, cardRow(r.items, "cr-" + r.title),
        ] });
      }
      if (!body.length) body.push({ type: "Text", ...twin("No hay nada por aquí todavía.", "Nothing here yet.", "text"), color: "muted" });
    } else if (st.failed) {
      body.push({ type: "MaterialBanner", key: "fail", role: "error", ...twin("No se pudo cargar.", "Could not load."),
        action: { ...twin("Reintentar", "Retry", "label"), onTap: "retry" } });
    } else {
      banner = { type: "Skeleton", key: "heroSk", shape: "block", height: { compact: 200, expanded: 320 } };
      body.push(railSkeleton(1), railSkeleton(2));
    }
    return {
      type: "Scaffold",
      appBar: { type: "AppBar", mergeWithKinoBar: true, dense: true, divider: false,
        leading: { type: "IconButton", key: "close", icon: "close", ...twin("Cerrar", "Close", "tooltip"), onPressed: { go: { close: true } } },
        actions: tv ? [{ type: "IconButton", key: "searchButton", icon: "search", ...twin("Buscar", "Search", "tooltip"), onPressed: "openSearch" }, gear] : [gear],
        title: tv ? { type: "Row", key: "tr", gap: 24, crossAxisAlignment: "center", children: [logo(), tabBar(tab)] } : logo() },
      ...(tv ? {} : { floatingActionButton: { type: "FloatingActionButton", key: "fab", icon: "search", ...twin("Buscar", "Search", "tooltip"), onPressed: "openSearch" } }),
      body: { type: "Column", key: "page", children: [
        ...(tv ? [] : [{ type: "Column", key: "tabsRow", padding: { compact: 0, expanded: 24 }, children: [tabBar(tab)] }]),
        { type: "SingleChildScrollView", key: "scroll-" + tab, flex: 1, children: [
          ...(banner ? [banner] : []), { type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body } ] },
      ] },
      ...(home || st.failed ? {} : { every: { ms: 1200, event: "tick" } }),
    };
  }

  function searchView(st, device) {
    const q = typeof st.sq === "string" ? st.sq : "";
    const items = found && found.q === q ? found.items : null;
    const status = q === "" ? "idle" : st.sstate === "fail" ? "fail" : items ? "done" : "loading";
    const form = { type: "Form", key: "sf", onSubmitted: "search", gap: 8, children: [
      { type: "TextField", key: "q", kind: "text", value: q, ...twin("Buscar en Pelisgo", "Search Pelisgo", "labelText"), maxLength: 100, autofocus: true },
      { type: "ElevatedButton", key: "sgo", ...twin("Buscar", "Search", "labelText"), icon: "search", submit: true },
    ] };
    const body = [form];
    if (status === "fail") body.push({ type: "MaterialBanner", key: "sfail", role: "error", ...twin("La búsqueda falló.", "Search failed."), action: { ...twin("Reintentar", "Retry", "label"), onTap: "sretry" } });
    else if (status === "done" && items) body.push(items.length ? { type: "Grid", key: "res", minItemWidth: 120, gap: 12, children: items.slice(0, 60).map(card) } : { type: "Text", ...twin("Sin resultados.", "No results.", "text"), color: "muted" });
    else if (status === "loading") body.push(railSkeleton(1));
    return {
      type: "Scaffold",
      appBar: { type: "AppBar", mergeWithKinoBar: true, dense: true, divider: false,
        leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("Atrás", "Back", "tooltip"), onPressed: "back" }, title: logo() },
      body: { type: "SingleChildScrollView", key: "sp", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] },
      ...(status === "loading" ? { every: { ms: 1000, event: "stick" } } : {}),
    };
  }

  function view(ctx) {
    const c = ctx && typeof ctx === "object" ? ctx : {};
    if (!(c.installed && c.installed[RESOLVER_REPO])) return installGateView(c.device);
    const st = c.state && typeof c.state === "object" ? c.state : {};
    if (c.route && c.route.name === "settings") {
      return { type: "Scaffold", appBar: { type: "AppBar", mergeWithKinoBar: true, dense: true, divider: false,
          leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("Atrás", "Back", "tooltip"), onPressed: "back" }, title: logo() },
        body: { type: "SingleChildScrollView", key: "setp", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, children: [{ type: "settings", key: "form" }] }] } };
    }
    if (c.route && c.route.name === "search") return searchView(st, c.device);
    const tab = TAB_IDS.includes(st.tab) ? st.tab : TAB_IDS[0];
    return browseView(tab, st, c.device);
  }

  const events = {
    open({ state }) { return { state: { tab: TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0], failed: false } }; },
    async tick() {
      if (home) return null;
      try { home = await loadHome(); return { state: { v: Date.now() } }; }
      catch (e) { log("home", (e && e.code) || "error"); return { state: { failed: true } }; }
    },
    retry() { home = null; return { state: { failed: false } }; },
    tab({ value, arg }) { const t = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null; return t ? { state: { tab: t } } : null; },
    openSearch() { return { route: { push: "search" }, state: { sq: "", sstate: null } }; },
    search({ value, route }) {
      const q = value && typeof value.q === "string" ? value.q.trim().slice(0, 100) : "";
      if (!q) return null;
      const state = { sq: q, sstate: "loading" };
      return route && route.name === "search" ? { state } : { route: { push: "search" }, state };
    },
    async stick({ state }) {
      const q = typeof state.sq === "string" ? state.sq : "";
      if (!q || state.sstate !== "loading") return null;
      try { found = { q, items: (await searchItems(q)) || [] }; return { state: { sstate: "done" } }; }
      catch (e) { log("search", (e && e.code) || "error"); return { state: { sstate: "fail" } }; }
    },
    sretry({ state }) { return state.sq ? { state: { sstate: "loading" } } : null; },
    go({ arg }) { return arg === "settings" ? { route: { push: "settings" }, state: { fromBrowse: true } } : null; },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { sq: null, sstate: null } };
    },
  };

  async function event(ev) {
    const h = Object.hasOwn(events, ev.name) ? events[ev.name] : null;
    return h ? (await h({ ...ev, state: ev.state || {} })) ?? null : null;
  }

  return { view, event };
}
