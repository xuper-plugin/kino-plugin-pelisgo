// episodes(ref) -> a series' episodes, flat (Kino groups them by their `season` field). Pelisgo has no episode-list
// API: the episodes live in the series' server-rendered page, so we read the site slug (from the ref, or bridged
// from a TMDB ref through /api/search) and parse /series/<slug>.
import { requester } from "./api.js";
import { parseRef } from "./mappers.js";
import { entryFor, seriesEpisodes } from "./bridge.js";

export async function episodes(kino, ref, { untilMs } = {}) {
  const req = requester(kino, { untilMs });
  const info = parseRef(ref);
  if (!info || info.kind !== "series") throw kino.error("not_found", "not a series ref");

  let slug = info.by === "cuid" ? info.slug : "";
  if (!slug) { const e = await entryFor(kino, req, info); slug = e && e.slug; }
  if (!slug) throw kino.error("not_found", "series not found", { userMessage: "No se encontró la serie en Pelisgo" });

  const eps = await seriesEpisodes(kino, req, slug);
  if (!eps.length) throw kino.error("not_found", "no episodes", { userMessage: "No se pudieron cargar los episodios" });
  return { episodes: eps };
}
