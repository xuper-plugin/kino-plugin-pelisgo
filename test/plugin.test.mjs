import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRef, itemFromTrending, itemFromSearch } from "../src/mappers.js";
import { parseEpisodes } from "../src/bridge.js";

// A kino whose fetch answers /session/sync with a token and /stream with the given links. When `doorStream` is given,
// the resolver door resolves any hoster embed to it; otherwise the door reports provider_missing (no resolver).
function fakeKino(streamJson, doorStream) {
  globalThis.kino = {
    log() {}, sleep: async () => {}, browser: null, fetchAnyHost: true,
    error: (code, message, extra) => Object.assign(new Error(message || code), { code, ...(extra || {}) }),
    async fetch(url) {
      let body = "{}";
      if (url.includes("/session/sync")) body = JSON.stringify({ synced: true, sid: "tok1" });
      else if (url.includes("/stream")) body = JSON.stringify(streamJson);
      return { status: 200, ok: true, url, headers: {}, text: async () => body };
    },
    plugins: {
      call: async (alias, method) => {
        if (method === "resolve" && doorStream) return { streams: [doorStream] };
        throw Object.assign(new Error("no provider"), { code: "provider_missing" });
      },
    },
  };
}

test("parseRef: cuid / tmdb / episode / lazy / junk", () => {
  assert.deepEqual(parseRef("pg:c:m:abc123:bandidas"), { by: "cuid", kind: "movie", id: "abc123", slug: "bandidas" });
  assert.deepEqual(parseRef("pg:c:s:xyz"), { by: "cuid", kind: "series", id: "xyz", slug: "" });
  assert.deepEqual(parseRef("pg:t:m:550:1999:fight-club"), { by: "tmdb", kind: "movie", id: 550, year: "1999", slug: "fight-club" });
  assert.deepEqual(parseRef("pg:e:ep1"), { by: "episode", kind: "episode", id: "ep1", slug: "" });
  assert.deepEqual(parseRef("pg:x:https://voe.sx/e/x"), { by: "lazy", kind: "movie", id: "", slug: "", url: "https://voe.sx/e/x" });
  assert.equal(parseRef("nope"), null);
});

test("itemFromTrending: TMDB-keyed, bridge ref carries year+slug, ids.tmdb set", () => {
  const it = itemFromTrending({ id: 550, title: "El club de la pelea", year: "1999", poster: "p", backdrop: "b", overview: "o", rating: 8.4, mediaType: "movie" });
  assert.equal(it.kind, "movie");
  assert.equal(it.ref, "pg:t:m:550:1999:el-club-de-la-pelea");
  assert.deepEqual(it.ids, { tmdb: 550 });
  assert.equal(it.rating, 8.4);
});

test("itemFromTrending: a tv row -> series", () => {
  const it = itemFromTrending({ id: 1399, title: "Juego de Tronos", year: "2011", mediaType: "tv" });
  assert.equal(it.kind, "series");
  assert.equal(it.ref, "pg:t:s:1399:2011:juego-de-tronos");
});

test("itemFromSearch: cuid ref plays directly; a serie maps to series", () => {
  const m = itemFromSearch({ id: "cuid1", title: "Bandidas", slug: "bandidas", year: 2006, rating: 6.1, type: "movie" });
  assert.equal(m.ref, "pg:c:m:cuid1:bandidas");
  assert.equal(m.kind, "movie");
  assert.equal(itemFromSearch({ id: "c", title: "X", slug: "x", type: "serie" }).kind, "series");
});

test("parseEpisodes: seasons + episodes from the escaped RSC payload", () => {
  const html = `pre[\\"id\\":\\"cms1\\",\\"number\\":1,\\"episodes\\":[{\\"id\\":\\"cmep1\\",\\"number\\":1,\\"title\\":\\"Piloto\\"},{\\"id\\":\\"cmep2\\",\\"number\\":2,\\"title\\":\\"Dos\\"}]},{\\"id\\":\\"cms2\\",\\"number\\":2,\\"episodes\\":[{\\"id\\":\\"cmep3\\",\\"number\\":1,\\"title\\":\\"Tres\\"}]}post`;
  const eps = parseEpisodes(html);
  assert.equal(eps.length, 3);
  assert.deepEqual(eps[0], { season: 1, number: 1, title: "Piloto", ref: "pg:e:cmep1" });
  assert.deepEqual(eps[1], { season: 1, number: 2, title: "Dos", ref: "pg:e:cmep2" });
  assert.deepEqual(eps[2], { season: 2, number: 1, title: "Tres", ref: "pg:e:cmep3" });
});

test("resolve: with a resolver, a hoster embed leads and the hotlink-bound direct file drops to an alternative", async () => {
  fakeKino({ links: [
    { url: "https://cdn.tnmr.org/hls2/a/master.m3u8?t=1", name: "Lulustream", server: "KeKi", language: "Latino", quality: "1080p", serverOrder: 0 },
    { url: "https://voe.sx/e/abc", name: "Voe", server: "Voe", language: "Latino", quality: "1080p", serverOrder: 7 },
  ] }, { url: "https://cdn.voe/play.m3u8", kind: "hls" });
  const { resolve } = await import("../src/resolve.js");
  const r = await resolve(globalThis.kino, "pg:c:m:cuid1:bandidas", { untilMs: Date.now() + 8000, preferred: "lat" });
  assert.equal(r.url, "https://cdn.voe/play.m3u8"); // the resolved embed, not the raw tnmr file
  assert.equal(r.label, "Latino · Voe · 1080p");
  assert.ok(r.alternatives.some((a) => typeof a.url === "string" && a.url.includes("master.m3u8")), "direct file kept as alternative");
});

test("resolve: with no resolver, the direct file is the fallback main and the embed is a lazy alternative", async () => {
  fakeKino({ links: [
    { url: "https://cdn.tnmr.org/hls2/a/master.m3u8?t=1", name: "Lulustream", server: "KeKi", language: "Latino", quality: "1080p", serverOrder: 0 },
    { url: "https://voe.sx/e/abc", name: "Voe", server: "Voe", language: "Latino", quality: "1080p", serverOrder: 7 },
  ] });
  const { resolve } = await import("../src/resolve.js");
  const r = await resolve(globalThis.kino, "pg:c:m:cuid1:bandidas", { untilMs: Date.now() + 8000, preferred: "lat" });
  assert.match(r.url, /master\.m3u8/);
  assert.equal(r.label, "Latino · Lulustream · 1080p");
  assert.ok(r.alternatives.some((a) => a.ref === "pg:x:https://voe.sx/e/abc"), "embed kept as lazy alternative");
});

test("resolve: the preferred language is ranked first", async () => {
  fakeKino({ links: [
    { url: "https://cdn.tnmr.org/esp/master.m3u8", name: "Lulustream", language: "Castellano", quality: "1080p" },
    { url: "https://cdn.tnmr.org/lat/master.m3u8", name: "Lulustream", language: "Latino", quality: "720p" },
  ] });
  const { resolve } = await import("../src/resolve.js");
  const r = await resolve(globalThis.kino, "pg:c:m:cuid1:x", { untilMs: Date.now() + 8000, preferred: "lat" });
  assert.match(r.url, /\/lat\//);
  assert.equal(r.label, "Latino · Lulustream · 720p");
});
