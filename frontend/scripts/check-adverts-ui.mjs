import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Queue, AdvertList } = await vite.ssrLoadModule("/src/pages/admin/Adverts.jsx");
  const { default: Details, AdvertEditor, AdvertActions } = await vite.ssrLoadModule("/src/pages/admin/AdvertDetails.jsx");
  const { default: AdvertCard } = await vite.ssrLoadModule("/src/components/Adverts/AdvertCard.jsx");
  const { default: Placement, AdvertCarousel } = await vite.ssrLoadModule("/src/components/Adverts/AdvertPlacement.jsx");
  const { default: AdminRoute } = await vite.ssrLoadModule("/src/routes/adminRoute.jsx");
  const { default: Layout } = await vite.ssrLoadModule("/src/pages/admin/AdminLayout.jsx");
  const { default: Home } = await vite.ssrLoadModule("/src/pages/connect.jsx");
  const { advertUrl, liveAdverts, nextAdvert, advertKey, ROTATION_SECONDS, advertImageUrl, advertFeed } = await vite.ssrLoadModule("/src/utils/adverts.js");
  const create = React.createElement, admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" }, guest = null;
  let count = 0;
  function render(Component, props = {}, user = admin, path = "/admin/adverts") {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [path] }, create(Component, props))));
  }
  const advert = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", sponsor: "<script>Venue partner</script>", title: "Explore event venues", body: "<img src=x onerror=alert(1)> Great spaces", imageUrl: "", imageAlt: "", destinationUrl: "https://partner.example.com", ctaLabel: "Explore venues", placements: ["home", "dashboard"], audiences: ["public"], status: "draft", state: "draft", version: 0, publicationVersion: 1, startsAt: "2000-01-01T12:00:00Z", endsAt: null, history: [] };
  assert.match(render(Queue), /Multiple live adverts rotate every 15 seconds/); assert.match(render(Queue), /New advert/);
  assert.match(render(Details), /Loading advert/); assert.match(render(Details, { create: true }), /Create advert/);
  const list = render(AdvertList, { adverts: [advert] }); assert.match(list, /&lt;script&gt;/); assert.match(list, /Member dashboard overview/); assert.match(list, /\/admin\/adverts\/bbbb/); assert.doesNotMatch(list, /<script>/);
  assert.match(render(AdvertList, { adverts: [] }), /Create a draft to fill/);
  const card = render(AdvertCard, { advert }); assert.match(card, /Sponsored/); assert.match(card, /rel="sponsored noopener noreferrer"/); assert.match(card, /opens in a new tab/); assert.match(card, /&lt;img/); assert.doesNotMatch(card, /<img|<script>/);
  const internal = render(AdvertCard, { advert: { ...advert, destinationUrl: "/announcements", imageUrl: "https://images.example.com/banner.jpg", imageAlt: "Venue garden" } }); assert.match(internal, /href="\/announcements"/); assert.doesNotMatch(internal, /target="_blank"/); assert.match(internal, /alt="Venue garden"/); assert.match(internal, /referrerPolicy="no-referrer"/);
  assert.doesNotMatch(render(AdvertCard, { advert: { ...advert, destinationUrl: "javascript:alert(1)", imageUrl: "data:image/svg+xml,hello" } }), /href=|<img/);
  const editor = render(AdvertEditor); assert.match(editor, /Private review note/); assert.match(editor, /Advert preview/); assert.match(editor, /Start time \(Lagos, optional\)/); assert.match(editor, /Image description/); assert.match(editor, /maxLength="700"/);
  assert.match(render(AdvertEditor, { data: advert, disabled: true }), /<fieldset disabled=""/);
  assert.match(render(AdvertActions, { data: advert }), /Publish saved advert/);
  assert.match(render(AdvertActions, { data: { ...advert, startsAt: "2099-01-01T12:00:00Z" } }), /Schedule advert/);
  assert.match(render(AdvertActions, { data: { ...advert, status: "published" } }), /Withdraw saved advert/);
  assert.match(render(AdvertActions, { data: { ...advert, status: "archived" } }), /This advert is archived/);
  assert.match(render(AdvertActions, { data: advert, disabled: true }), /<fieldset disabled=""/);
  const other = { ...advert, _id: "cccccccccccccccccccccccc", title: "Another sponsor" };
  const rotation = render(AdvertCarousel, { adverts: [advert, other] }); assert.match(rotation, /aria-roledescription="carousel"/); assert.match(rotation, /aria-live="off"/); assert.match(rotation, /Previous advert/); assert.match(rotation, /Next advert/); assert.match(rotation, /Pause rotation/); assert.match(rotation, /1 of 2/); assert.match(rotation, /Changes every 15 seconds/);
  assert.doesNotMatch(render(AdvertCarousel, { adverts: [advert] }), /Pause rotation|Previous advert|Next advert/);
  assert.equal(render(AdvertCarousel, { adverts: [] }), "");
  assert.equal(render(AdvertCarousel, { adverts: [{ ...advert, endsAt: "2001-01-01T00:00:00Z" }] }), "");
  assert.equal(render(Placement, { placement: "home" }, guest), ""); assert.equal(render(Placement, { placement: "dashboard" }, { id: admin.id, role: "client" }), "");
  assert.match(render(Layout), /href="\/admin\/adverts"/); assert.doesNotMatch(render(Layout, {}, { role: "moderator", permissions: ["content.read"] }), /href="\/admin\/adverts"/);
  assert.doesNotMatch(render(AdminRoute, { children: create("p", null, "Advert controls") }, { role: "moderator" }), /Advert controls/); assert.equal(render(AdminRoute, { children: create("p", null, "Advert controls") }), "<p>Advert controls</p>");
  assert.match(render(Home, {}, guest, "/"), /How elitePlan works/i);
  const now = Date.parse("2026-10-08T12:00:00Z"); assert.equal(ROTATION_SECONDS, 15);
  assert.deepEqual(liveAdverts([advert, { ...other, startsAt: "2026-10-08T12:00:01Z" }], now).map((a) => a._id), [advert._id]);
  assert.deepEqual(liveAdverts([{ ...advert, startsAt: "2026-10-08T12:00:00Z", endsAt: "2026-10-08T12:00:01Z" }], now).map((a) => a._id), [advert._id]);
  assert.equal(liveAdverts([{ ...advert, endsAt: "2026-10-08T12:00:00Z" }], now).length, 0);
  assert.equal(liveAdverts([{ ...advert, publicationVersion: 0 }], now).length, 0);
  assert.equal(nextAdvert([advert, other], advertKey(advert))._id, other._id); assert.equal(nextAdvert([advert, other], advertKey(other))._id, advert._id); assert.equal(nextAdvert([advert, other], advertKey(advert), -1)._id, other._id); assert.equal(nextAdvert([other], advertKey(advert))._id, other._id); assert.equal(nextAdvert([], "missing"), null);
  for (const url of ["javascript:alert(1)", "data:text/html,hello", "//evil.example.com", "/\\evil.example.com", "https://name:password@example.com", "https://example.com/a\nb"]) assert.equal(advertUrl(url), null);
  assert.equal(advertImageUrl("data:image/png;base64,hello"), null); assert.equal(advertFeed(false).path, "/adverts/public"); assert.equal(advertFeed(true).path, "/adverts/mine");
  console.log(`Adverts UI: ${count} server renders and rotation selection checks passed. Browser timers and interactions remain unverified.`);
} finally { await vite.close(); }
