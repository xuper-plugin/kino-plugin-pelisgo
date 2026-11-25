// "Ver más": the listing rows carry a ref ("list:<path>"), and browse pages the site's own `<path>?page=N`, answering `next`.
import test from "node:test";
import assert from "node:assert/strict";
import { browsePage, tabRows, homeRows, listRef } from "../src/catalog.js";

const card = (id, title) => `[\\"$\\",\\"$L1c\\",\\"${id}\\",{\\"id\\":\\"${id}\\",\\"title\\":\\"${title}\\",\\"slug\\":\\"x\\",\\"poster\\":\\"https://image.tmdb.org/t/p/w500/x.jpg\\",\\"year\\":2026,\\"rating\\":6.6,\\"type\\":\\"movie\\",\\"index\\":0}]`;
const htmlOf = (cards) => `<html><script>self.__next_f.push([1,"${cards.join(",")}"])</script></html>`;

/** A Kino whose site has two pages per listing (page 3 and later are empty) and an empty trending. */
function fakeKino() {
  const urls = [];
  const kino = {
    log() {}, sleep: async () => {}, fetchAnyHost: true,
    error: (code, message) => Object.assign(new Error(message || code), { code }),
    async fetch(url) {
      urls.push(url);
      let body = "[]";
      if (!url.includes("/api/")) {
        const page = Number((/[?&]page=(\d+)/.exec(url) || [])[1] || 1);
        const slug = new URL(url).pathname.replace(/[^a-z]/g, "");
        body = page > 2 ? htmlOf([]) : htmlOf([card(`c${slug}p${page}a000000000000`, `${slug} ${page} A`), card(`c${slug}p${page}b000000000000`, `${slug} ${page} B`)]);
      }
      return { status: 200, ok: true, url, headers: {}, text: async () => body };
    },
  };
  globalThis.kino = kino;
  return { kino, urls };
}

test("browse pages a listing ref with ?page=N and answers next while titles come", async () => {
  const { kino, urls } = fakeKino();
  const p1 = await browsePage(kino, "list:/movies", null);
  assert.equal(p1.items.length, 2);
  assert.equal(p1.next, "2");
  assert.equal(p1.cursor, undefined);
  assert.equal(urls.at(-1), "https://pelisgo.online/movies");
  const p2 = await browsePage(kino, "list:/movies", p1.next);
  assert.equal(urls.at(-1), "https://pelisgo.online/movies?page=2");
  assert.equal(p2.items.length, 2);
  assert.notEqual(p2.items[0].ref, p1.items[0].ref);
  assert.equal(p2.next, "3");
  const p3 = await browsePage(kino, "list:/movies", "3");
  assert.deepEqual(p3, { items: [] });
  const g = await browsePage(kino, "list:/genre/ciencia-ficcion", "2");
  assert.equal(urls.at(-1), "https://pelisgo.online/genre/ciencia-ficcion?page=2");
  assert.equal(g.items.length, 2);
});

test("browse answers nothing for a ref that is not a listing of the site", async () => {
  const { kino, urls } = fakeKino();
  for (const ref of ["pg-trending-movie", "list:/api/trending", "list:https://evil.example/", "list:/genre/../x", null]) {
    assert.deepEqual(await browsePage(kino, ref, null), { items: [] });
  }
  assert.equal(urls.length, 0);
});

test("the listing rows carry their Ver más ref; the trending rows (no pages) carry none", async () => {
  const { kino } = fakeKino();
  const rows = await tabRows(kino, "peliculas");
  assert.ok(rows.length >= 7);
  for (const r of rows) assert.equal(r.ref, listRef("/" + r.id.replace(/^pg-list-/, "").replace(/^genre-/, "genre/")));
  assert.equal(rows[0].ref, "list:/movies");
  const home = await homeRows(kino);
  const family = home.find((r) => r.id === "pg-list-genre-familia");
  assert.equal(family.ref, "list:/genre/familia");
  for (const r of home.filter((x) => x.id.startsWith("pg-trending"))) assert.equal(r.ref, undefined);
});
