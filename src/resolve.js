// resolve(ref) -> one KinoStream in the person's language, with the other copies as alternatives.
//
// A /stream link is either a DIRECT file (Lulustream/"KeKi" on *.tnmr.org hand back a signed master.m3u8 -> plays
// with no resolver) or an EMBED on a hoster (okru, voe, filemoon, doodstream -> the shared kino-resolver, or its
// WebView fallback for captcha/PoW hosts). The main copy is the best-ranked one that resolves; direct embeds among
// the alternatives are resolved up front, hoster embeds are left as lazy `{ label, ref }` (resolved when picked).
import { requester, streamLinks, ORIGIN } from "./api.js";
import { parseRef, lazyRef } from "./mappers.js";
import { entryFor } from "./bridge.js";
import { resolveViaHelper } from "./resolve-door.js";
import { normLang } from "./util/lang.js";

const HLS_MIME = "application/vnd.apple.mpegurl";
const isHls = (u) => /\.m3u8(\?|$)/i.test(String(u));
const isDirect = (u) => /\.(m3u8|mp4)(\?|$)/i.test(String(u));
const LANG_FALLBACK = { lat: 0, esp: 1, sub: 2 };
const qNum = (q) => { const m = /(\d{3,4})p/.exec(String(q || "")); return m ? Number(m[1]) : 0; };

function labelOf(link) {
  return [link.language, link.name || link.server, link.quality].filter(Boolean).join(" · ").slice(0, 48);
}

/**
 * Best copy first: the person's language, then higher resolution, then a RESOLVABLE EMBED over a bare direct file,
 * then the site's order. The "direct" copies (Lulustream/"KeKi" on *.tnmr.org) are hotlink/IP-bound: Kino, like any
 * client off the page, often gets a 403 and shows a dead live-audio player, so they go LAST and the resolver's own
 * servers (okru, voe, …) lead — they come back as proper VOD streams with the right headers. The direct file stays
 * as a lower alternative (it does play on some setups).
 */
function rank(links, preferred) {
  const lr = (l) => { const n = normLang(l); return n === preferred ? -1 : (LANG_FALLBACK[n] ?? 3); };
  return [...links].sort((a, b) =>
    (lr(a.language) - lr(b.language)) ||
    (qNum(b.quality) - qNum(a.quality)) ||
    ((isDirect(a.url) ? 1 : 0) - (isDirect(b.url) ? 1 : 0)) ||
    ((a.serverOrder || 0) - (b.serverOrder || 0)));
}

const directStream = (link) => ({
  url: link.url,
  ...(isHls(link.url) ? { mime: HLS_MIME } : {}),
  headers: { Referer: ORIGIN + "/" },
  label: labelOf(link),
});

async function embedStream(kino, link) {
  const s = await resolveViaHelper({ embedUrl: link.url }, kino, { ORIGIN });
  return s ? { ...s, label: labelOf(link) } : null;
}

export async function resolve(kino, ref, { untilMs, preferred = "lat" } = {}) {
  const req = requester(kino, { untilMs });
  const info = parseRef(ref);
  if (!info) throw kino.error("not_found", "bad ref");

  // A lazy alternative: hand its embed straight to the resolver (browser capture allowed here, in a content resolve).
  if (info.by === "lazy") {
    const s = await resolveViaHelper({ embedUrl: info.url }, kino, { ORIGIN });
    if (!s) throw kino.error("not_found", "alt unresolved", { userMessage: "No se pudo abrir ese servidor" });
    return s;
  }

  // Which /stream to call: an episode uses its own cuid; a movie needs the site entry (bridged from a TMDB ref).
  let kind, id;
  if (info.by === "episode") { kind = "episode"; id = info.id; }
  else {
    const entry = await entryFor(kino, req, info);
    if (!entry) throw kino.error("not_found", "not on pelisgo", { userMessage: "No está disponible en Pelisgo" });
    kind = "movie"; id = entry.cuid;
  }

  const links = await streamLinks(kino, req, kind, id);
  if (!links.length) throw kino.error("not_found", "no streams", { userMessage: "Sin enlaces de reproducción" });
  const ranked = rank(links, preferred);

  // Main copy: walk best-first; a direct file wins at once, an embed is resolved; first success is the main copy.
  let main = null, mainUrl = null;
  for (const l of ranked) {
    main = isDirect(l.url) ? directStream(l) : await embedStream(kino, l);
    if (main) { mainUrl = l.url; break; }
  }
  if (!main) throw kino.error("not_found", "unresolved", { userMessage: "No se pudo resolver el video" });

  // Alternatives: the rest. Direct -> resolved now; hoster embed -> lazy (resolved only when picked).
  const alts = [];
  for (const l of ranked) {
    if (alts.length >= 8 || l.url === mainUrl) continue;
    alts.push(isDirect(l.url)
      ? { url: l.url, ...(isHls(l.url) ? { mime: HLS_MIME } : {}), headers: { Referer: ORIGIN + "/" }, label: labelOf(l) }
      : { label: labelOf(l), ref: lazyRef(l.url) });
  }
  return { ...main, ...(alts.length ? { alternatives: alts } : {}), expiresInSeconds: 1800 };
}
