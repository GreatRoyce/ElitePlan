import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Queue, AuditList } = await vite.ssrLoadModule("/src/pages/admin/StaffAudit.jsx");
  const { default: Detail, AuditSummary } = await vite.ssrLoadModule("/src/pages/admin/StaffAuditDetails.jsx");
  const { default: AdminRoute } = await vite.ssrLoadModule("/src/routes/adminRoute.jsx");
  const { default: Layout } = await vite.ssrLoadModule("/src/pages/admin/AdminLayout.jsx");
  const create = React.createElement, admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" };
  let count = 0;
  function render(Component, props = {}, user = admin, path = "/admin/audit") {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [path] }, create(Component, props))));
  }
  const entry = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", actorId: admin.id, actorName: "<script>Staff name</script>", actorRole: "moderator", category: "moderation", action: "warn", outcome: "succeeded", httpStatus: 200, targetKind: "account", targetId: "cccccccccccccccccccccccc", targetLink: "/admin/users/cccccccccccccccccccccccc", attemptedAt: "2026-10-08T12:00:00Z", completedAt: "2026-10-08T12:00:01Z", expectedVersion: 0, resultVersion: 1, resultState: "active", requestId: "request-reference", method: "POST", route: "/users/:userId/moderation", note: "<img src=x onerror=alert(1)> Private reason" };
  const queue = render(Queue); assert.match(queue, /Staff audit history/); assert.match(queue, /From \(Lagos\)/); assert.match(queue, /Staff account ID/); assert.match(queue, /Request denied/); assert.match(queue, /Earlier actions remain/);
  const filtered = render(Queue, {}, admin, "/admin/audit?category=announcements&action=publish"); assert.match(filtered, /value="publish" selected=""/); assert.doesNotMatch(filtered, /value="ban"/);
  assert.match(render(Detail), /Loading audit entry/);
  const list = render(AuditList, { entries: [entry] }); assert.match(list, /&lt;script&gt;Staff name/); assert.match(list, /&lt;img/); assert.doesNotMatch(list, /<script>|<img/); assert.match(list, /moderator at the time/); assert.match(list, /View audit entry/); assert.match(list, /actorId=aaaaaaaa/);
  assert.match(render(AuditList, { entries: [] }), /after this feature is enabled/);
  const summary = render(AuditSummary, { entry }); assert.match(summary, /Expected revision/); assert.match(summary, /Request reference/); assert.match(summary, /Private review note/); assert.doesNotMatch(summary, /<form|Delete|Edit/);
  assert.match(render(AuditSummary, { entry: { ...entry, outcome: "pending", completedAt: null, httpStatus: null } }), /Check the related record before repeating/);
  assert.match(render(AuditSummary, { entry: { ...entry, outcome: "pending", completionUnconfirmed: true } }), /Outcome unconfirmed/);
  assert.match(render(AuditList, { entries: [{ ...entry, outcome: "denied", httpStatus: 403 }] }), /HTTP 403/);
  assert.match(render(AuditSummary, { entry: { ...entry, category: "staff", resultRole: "moderator", resultPermissions: ["users.read", "content.read"] } }), /users.read, content.read/);
  assert.match(render(Layout), /href="\/admin\/audit"/);
  assert.doesNotMatch(render(Layout, {}, { role: "moderator", permissions: ["users.read"] }), /href="\/admin\/audit"/);
  assert.doesNotMatch(render(AdminRoute, { children: create("p", null, "Audit permitted") }, { role: "moderator" }), /Audit permitted/);
  assert.equal(render(AdminRoute, { children: create("p", null, "Audit permitted") }), "<p>Audit permitted</p>");
  console.log(`Staff audit UI: ${count} server renders passed. Browser interactions remain unverified.`);
} finally { await vite.close(); }
