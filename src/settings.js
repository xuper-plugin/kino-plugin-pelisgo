// The person's settings, read from kino.config with defaults filled in. Kino syncs these across devices itself.

const bool = (v, d) => (v === true || v === "true" ? true : v === false || v === "false" ? false : d);

/** `{ preferred: "lat"|"esp"|"sub", maxQuality, homeRows }`. */
export function readSettings(kino) {
  const get = (key) => { try { return kino && kino.config ? kino.config.get(key) : undefined; } catch (_) { return undefined; } };
  const pref = get("preferred");
  const preferred = ["lat", "esp", "sub"].includes(pref) ? pref : "lat";
  const mq = get("maxQuality");
  const maxQuality = ["auto", "1080p", "720p", "480p"].includes(mq) ? mq : "auto";
  return { preferred, maxQuality, homeRows: bool(get("homeRows"), true) };
}
