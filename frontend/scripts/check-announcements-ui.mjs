import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Page, AnnouncementList } = await vite.ssrLoadModule("/src/pages/Announcements.jsx");
  const { default: Queue, AdminAnnouncementList } = await vite.ssrLoadModule("/src/pages/admin/AdminAnnouncements.jsx");
  const { default: Detail } = await vite.ssrLoadModule("/src/pages/admin/AnnouncementDetails.jsx");
  const { default: Editor } = await vite.ssrLoadModule("/src/pages/admin/AnnouncementEditor.jsx");
  const { default: Actions } = await vite.ssrLoadModule("/src/pages/admin/AnnouncementActions.jsx");
  const { default: Card } = await vite.ssrLoadModule("/src/components/Announcements/AnnouncementCard.jsx");
  const { default: Banner, AnnouncementStrip } = await vite.ssrLoadModule("/src/components/Announcements/AnnouncementBanner.jsx");
  const { default: AdminRoute } = await vite.ssrLoadModule("/src/routes/adminRoute.jsx");
  const helpers = await vite.ssrLoadModule("/src/utils/announcements.js");
  const create = React.createElement, admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" }, member = { id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "client" };
  let count = 0;
  function render(Component, props = {}, user = admin, path = "/admin/announcements") {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [path] }, create(Component, props))));
  }
  const a = { _id: "cccccccccccccccccccccccc", title: "<script>Service notice</script>", body: "<img src=x onerror=alert(1)> Plain text notice.", status: "draft", state: "draft", audiences: ["client", "vendor"], important: true, startsAt: null, endsAt: null, publicationVersion: 1, history: [], version: 0 };
  const card = render(Card, { announcement: a }); assert.match(card, /&lt;script&gt;/); assert.match(card, /&lt;img/); assert.doesNotMatch(card, /<script>|<img/); assert.match(card, /Important notice/); assert.doesNotMatch(card, /Acknowledge notice/);
  const memberCard = render(Card, { announcement: a, member: true }, member); assert.match(memberCard, /Acknowledge notice/);
  assert.match(render(Card, { announcement: { ...a, acknowledgedAt: "2026-10-08T12:00:00Z" }, member: true }, member), /Acknowledged/);
  assert.match(render(Card, { announcement: a, onDismiss: () => {} }, null), /Dismiss for this visit/);
  assert.match(render(AnnouncementStrip, { announcements: [a], member: true }), /Read all announcements/);
  assert.equal(render(Banner), ""); assert.equal(render(Banner, {}, member, "/support"), "");
  assert.match(render(Page, {}, member, "/announcements"), /Current notices for your account/);
  assert.match(render(Page, {}, null, "/announcements"), /Current public notices/);
  assert.match(render(AnnouncementList, { announcements: [] }), /No announcements are currently available/);
  assert.match(render(Queue), /New announcement/); assert.match(render(Queue), /All audiences/);
  assert.match(render(AdminAnnouncementList, { announcements: [a] }), /href="\/admin\/announcements\/cccc/);
  assert.match(render(AdminAnnouncementList, { announcements: [] }), /No announcements match/);
  assert.match(render(Detail), /Loading announcement/);
  assert.match(render(Detail, { create: true }), /Create announcement/);
  const editor = render(Editor); assert.match(editor, /Notice preview/); assert.match(editor, /Start time \(Lagos\)/); assert.match(editor, /Private review note/); assert.match(editor, /Save draft/); assert.match(editor, /Plain text is supported/);
  assert.doesNotMatch(editor, /type="checkbox" checked=""[^>]*\/>(?:Everyone)/);
  assert.match(render(Actions, { data: a }), /Publish now/);
  assert.match(render(Actions, { data: { ...a, startsAt: new Date(Date.now() + 86400000).toISOString() } }), /Schedule publication/);
  const live = render(Actions, { data: { ...a, status: "published", state: "live" } }); assert.match(live, /Withdraw notice/); assert.doesNotMatch(live, /Publish now|Archive draft/);
  assert.match(render(Actions, { data: { ...a, status: "archived" } }), /Create a new draft/);
  assert.doesNotMatch(render(AdminRoute, { children: create("p", null, "Private publishing controls") }, { role: "moderator" }), /Private publishing controls/);
  assert.equal(helpers.lagosInput("2026-10-08T12:00:00Z"), "2026-10-08T13:00"); assert.equal(helpers.fromLagosInput("2026-10-08T13:00"), "2026-10-08T12:00:00.000Z");
  assert.equal(helpers.currentAnnouncement({ startsAt: "2026-10-08T12:00:00Z", endsAt: "2026-10-08T13:00:00Z" }, Date.parse("2026-10-08T13:00:00Z")), false);
  console.log(`Announcements UI: ${count} server renders passed. Browser interactions remain unverified.`);
} finally { await vite.close(); }
