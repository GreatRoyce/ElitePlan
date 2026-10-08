import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Platform, HealthSummary, SettingsEditor, SettingsHistory } = await vite.ssrLoadModule("/src/pages/admin/Platform.jsx");
  const { default: AvailabilityNotice } = await vite.ssrLoadModule("/src/components/Platform/AvailabilityNotice.jsx");
  const { default: SettingsAuditChange } = await vite.ssrLoadModule("/src/components/Platform/SettingsAuditChange.jsx");
  const { default: Signup } = await vite.ssrLoadModule("/src/components/Auth/signupform.jsx");
  const { default: Consult } = await vite.ssrLoadModule("/src/pages/consultform.jsx");
  const { default: AdminRoute } = await vite.ssrLoadModule("/src/routes/adminRoute.jsx");
  const { default: Layout } = await vite.ssrLoadModule("/src/pages/admin/AdminLayout.jsx");
  const create = React.createElement, admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" };
  let count = 0;
  function render(Component, props = {}, user = admin, path = "/admin/platform") {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [path] }, create(Component, props))));
  }
  const defaults = { registration: { client: true, vendor: true, planner: true }, consultationsEnabled: true };
  const paused = { registration: { client: false, vendor: true, planner: false }, consultationsEnabled: false };
  const settings = { ...defaults, version: 0, updatedAt: null, history: [] };
  const page = render(Platform); assert.match(page, /Platform health &amp; settings/); assert.match(page, /Checking platform health/); assert.match(page, /Loading platform settings/); assert.match(page, /discards unsaved edits/);
  const health = { checkedAt: "2026-10-08T12:00:00Z", status: "attention", runtime: { uptimeSeconds: 120, nodeVersion: "v22", memory: { rssBytes: 1048576, heapUsedBytes: 524288 } }, checks: { database: { status: "unavailable", message: "Database ping failed or timed out." }, uploads: { status: "healthy", message: "Directory permissions passed; actual upload untested." }, audit: { status: "attention", pendingOverFiveMinutes: 3, message: "Review unfinished actions" }, realtime: { status: "healthy", connections: 2, message: "Tabs count separately." }, configuration: { status: "attention", configured: { database: false, authentication: true, analytics: true }, message: "Presence checks only" } } };
  const snapshot = render(HealthSummary, { data: health }); assert.match(snapshot, /Database connection/); assert.match(snapshot, /Unavailable/); assert.match(snapshot, /3 pending over five minutes/); assert.match(snapshot, /2 socket connections on this server/); assert.match(snapshot, /Database: Missing/i); assert.match(snapshot, /Process memory: 1.0 MB/);
  assert.match(render(HealthSummary, { data: health, stale: true }), /Previous snapshot/);
  const editor = render(SettingsEditor, { settings }); assert.match(editor, /Reason for this change \(private\)/); assert.match(editor, /maxLength="1000"/); assert.match(editor, /Existing accounts can sign in/); assert.match(editor, /disabled=""[^>]*>Save settings/); assert.equal((editor.match(/checked=""/g) || []).length, 4);
  assert.equal((render(SettingsEditor, { settings: { ...settings, ...paused } }).match(/checked=""/g) || []).length, 1);
  assert.match(render(SettingsEditor, { settings, blocked: true }), /<fieldset disabled=""/);
  assert.match(render(SettingsEditor, { settings, busy: true }), /Saving settings/);
  assert.match(render(SettingsHistory, { history: [] }), /No settings changes/);
  const history = render(SettingsHistory, { history: [{ by: admin.id, at: health.checkedAt, note: "<script>Private reason</script>", version: 1, before: defaults, after: paused }] }); assert.match(history, /client signup: paused/); assert.match(history, /Before:/); assert.match(history, /After:/); assert.match(history, /&lt;script&gt;/); assert.doesNotMatch(history, /<script>/); assert.match(history, /category=settings/);
  const waiting = render(AvailabilityNotice, { availability: { loading: true } }); assert.match(waiting, /Checking service availability/);
  const failed = render(AvailabilityNotice, { availability: { loading: false, error: "Check failed" } }); assert.match(failed, /role="alert"/); assert.match(failed, /Check again/);
  const signupPause = render(AvailabilityNotice, { availability: { data: paused }, registration: true }); assert.match(signupPause, /client, planner registrations/);
  assert.equal(render(AvailabilityNotice, { availability: { data: paused }, registration: true, role: "vendor" }), "");
  assert.match(render(AvailabilityNotice, { availability: { data: paused } }), /New consultation requests are temporarily paused/);
  assert.equal(render(AvailabilityNotice, { availability: { data: defaults } }), "");
  assert.match(render(SettingsAuditChange, { change: { before: defaults, after: paused } }), /Availability change/);
  const signup = render(Signup, { layout: "page" }); assert.match(signup, /Checking service availability/); assert.equal((signup.match(/disabled=""/g) || []).length, 3);
  const consultation = render(Consult, {}, { id: admin.id, role: "client" }, { pathname: "/consult", state: { targetUserId: admin.id, targetType: "Vendor", profileName: "Vendor" } }); assert.match(consultation, /Checking service availability/); assert.match(consultation, /disabled=""[^>]*>Continue/);
  assert.match(render(Layout), /href="\/admin\/platform"/);
  assert.doesNotMatch(render(Layout, {}, { role: "moderator", permissions: ["users.read"] }), /href="\/admin\/platform"/);
  assert.doesNotMatch(render(AdminRoute, { children: create("p", null, "Platform permitted") }, { role: "moderator" }), /Platform permitted/);
  assert.equal(render(AdminRoute, { children: create("p", null, "Platform permitted") }), "<p>Platform permitted</p>");
  console.log(`Platform UI: ${count} server renders passed. Browser interactions remain unverified.`);
} finally { await vite.close(); }
