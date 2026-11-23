// The site's listing pages (/movies, /series, /genre/<slug>) read as cards from the page's own server-rendered payload.
import test from "node:test";
import assert from "node:assert/strict";
import { listPage } from "../src/api.js";
import { itemFromSearch } from "../src/mappers.js";

const card = (id, title, type) => `[\\"$\\",\\"$L1c\\",\\"${id}\\",{\\"id\\":\\"${id}\\",\\"title\\":\\"${title}\\",\\"slug\\":\\"tadeo-jones\\",\\"poster\\":\\"https://image.tmdb.org/t/p/w500/x.jpg\\",\\"year\\":2026,\\"rating\\":6.6,\\"type\\":\\"${type}\\",\\"index\\":0}]`;
const page = `<html><script>self.__next_f.push([1,"${card("cmv8hw7u70075944qmeo9o2z8", "Tadeo Jones y La L\\u00e1mpara", "movie")},${card("cmv8hw7u70075944qmeo9o2z8", "dup", "movie")},${card("cmabcdefghij0123456789xy", "Somos así", "serie")}"])</script></html>`;
const req = async () => ({ ok: true, text: async () => page });

test("listPage: each card once, with its cuid, title, year and type; itemFromSearch makes a playable item", async () => {
  const rows = await listPage({}, req, "/movies");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { id: "cmv8hw7u70075944qmeo9o2z8", title: "Tadeo Jones y La Lámpara", slug: "tadeo-jones", poster: "https://image.tmdb.org/t/p/w500/x.jpg", year: "2026", rating: 6.6, type: "movie" });
  const series = itemFromSearch(rows[1]);
  assert.equal(series.kind, "series");
  assert.match(series.ref, /^pg:c:s:cmabcdefghij0123456789xy:/);
});

test("listPage: a failed page is no rows", async () => {
  assert.deepEqual(await listPage({}, async () => ({ ok: false }), "/movies"), []);
  assert.deepEqual(await listPage({}, async () => null, "/movies"), []);
});
