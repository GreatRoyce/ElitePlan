import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Queue } = await vite.ssrLoadModule("/src/pages/admin/ContentModeration.jsx");
  const { default: Detail, ContentSnapshot } = await vite.ssrLoadModule("/src/pages/admin/ContentDetails.jsx");
  const { default: Actions } = await vite.ssrLoadModule("/src/pages/admin/ContentActions.jsx");
  const { default: Notice } = await vite.ssrLoadModule("/src/components/Moderation/ContentNotice.jsx");
  const { default: StaffRoute } = await vite.ssrLoadModule("/src/routes/staffRoute.jsx");
  const create = React.createElement;
  const admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" };
  const data = { profile: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", type: "vendor", name: "Test Listing" }, moderation: { hidden: false, version: 0 }, canManage: true };
  let count = 0;
  function render(component, props, user = admin) {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [user.role === "moderator" ? "/moderator/content" : "/admin/content"] }, create(component, props))));
  }
  assert.match(render(Queue, {}), /Content moderation/);
  assert.match(render(Detail, {}), /Loading content/);
  const actions = render(Actions, { data }); assert.match(actions, /Hide listing/); assert.match(actions, /Reason shown to the owner/); assert.match(actions, /button disabled=""/);
  assert.match(render(Actions, { data: { ...data, moderation: { hidden: true, version: 1 } } }), /Restore listing/);
  const readOnly = render(Actions, { data: { ...data, canManage: false } }); assert.match(readOnly, /requires permission/); assert.doesNotMatch(readOnly, /<form/);
  const content = render(ContentSnapshot, { content: { tagline: "<script>unsafe</script>", profileImage: "uploads/avatar.png", website: "javascript:alert(1)", gallery: ["https://example.com/photo.jpg"], details: { packages: "Submitted package" } }, reviews: [{ rating: 4, comment: "<img src=x onerror=alert(1)>" }] });
  assert.match(content, /&lt;script&gt;/); assert.match(content, /&lt;img/); assert.match(content, /Submitted package/); assert.match(content, /href="https:\/\/example.com\/photo.jpg"/); assert.doesNotMatch(content, /href="javascript:/); assert.doesNotMatch(content, /<script>/);
  assert.equal(render(Notice, { profile: { active: true } }), "");
  const hidden = render(Notice, { profile: { active: false, contentModeration: { hidden: true, reason: "<script>Claim</script>" } } }); assert.match(hidden, /Your listing is hidden/); assert.match(hidden, /&lt;script&gt;/);
  const mod = { role: "moderator", permissions: ["content.read"] };
  assert.match(render(Queue, {}, mod), /href="\/moderator\/content"/);
  assert.equal(render(StaffRoute, { permission: "content.read", children: create("p", null, "Content allowed") }, mod), "<p>Content allowed</p>");
  assert.doesNotMatch(render(StaffRoute, { permission: "content.read", children: create("p", null, "Content allowed") }, { role: "moderator", permissions: ["users.read"] }), /Content allowed/);
  console.log(`Content UI: ${count} server renders passed. Browser interactions are unverified.`);
} finally { await vite.close(); }
