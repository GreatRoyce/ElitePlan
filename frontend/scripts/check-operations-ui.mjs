import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Queue, OperationsList } = await vite.ssrLoadModule("/src/pages/admin/Operations.jsx");
  const { default: Detail, OperationsSummary } = await vite.ssrLoadModule("/src/pages/admin/OperationsDetails.jsx");
  const { default: Actions } = await vite.ssrLoadModule("/src/pages/admin/OperationsActions.jsx");
  const { default: AdminRoute } = await vite.ssrLoadModule("/src/routes/adminRoute.jsx");
  const create = React.createElement, admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" };
  let count = 0;
  function render(Component, props, user = admin, path = "/admin/operations") {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [path] }, create(Component, props))));
  }
  const data = { record: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", type: "consultations", title: "Wedding", status: "pending", date: "2026-12-01T12:00:00Z", location: { city: "Lagos" }, services: ["Music"], guests: { min: 20, max: 40 } }, participants: [{ userId: "cccccccccccccccccccccccc", label: "Requester", name: "<script>Submitted name</script>", accountStatus: "active" }, { label: "Vendor", name: "Unavailable account", missing: true, missingProfile: true, accountStatus: "missing" }], oversight: { version: 0, flagged: true, history: [], notice: { reason: "<script>Reason</script>" } }, allowedActions: ["note", "flag", "decline"] };
  const queue = render(Queue, {}); assert.match(queue, /Consultation &amp; event oversight/); assert.match(queue, /Planner board events/); assert.match(queue, /type="date"/);
  const eventQueue = render(Queue, {}, admin, "/admin/operations?type=planner-events&status=cancelled"); assert.match(eventQueue, /value="cancelled" selected=""/); assert.doesNotMatch(eventQueue, /value="approved"/);
  assert.match(render(Detail, {}), /Loading operations record/);
  const list = render(OperationsList, { data: { records: [{ ...data.record, attention: true, flagged: true }] } }); assert.match(list, /Pending for more than 7 days/); assert.match(list, /Flagged/); assert.match(list, /href="\/admin\/operations\/consultations\//);
  assert.match(render(OperationsList, { data: { records: [] } }), /No records match/);
  const summary = render(OperationsSummary, { data }); assert.match(summary, /&lt;script&gt;/); assert.doesNotMatch(summary, /<script>/); assert.match(summary, /Profile missing/); assert.match(summary, /20–40/);
  const actions = render(Actions, { data }); assert.match(actions, /Decline pending request/); assert.doesNotMatch(actions, /Approve/); assert.match(actions, /Private review note/); assert.match(actions, /button disabled=""/);
  assert.match(render(Actions, { data: { ...data, record: { ...data.record, type: "events", status: "ongoing" }, allowedActions: ["complete", "cancel", "note"] } }), /Reason shown to participants/);
  assert.match(render(Actions, { data: { ...data, allowedActions: ["reopen"] } }), /returns a consultation to pending/);
  assert.equal(render(AdminRoute, { children: create("p", null, "Operations allowed") }), "<p>Operations allowed</p>");
  assert.doesNotMatch(render(AdminRoute, { children: create("p", null, "Operations allowed") }, { role: "moderator" }), /Operations allowed/);
  console.log(`Operations UI: ${count} server renders passed. Browser interactions remain unverified.`);
} finally { await vite.close(); }
