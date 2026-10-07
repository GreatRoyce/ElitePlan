import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// Server rendering checks component/route contracts. It does not exercise browser interaction.
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: ReportsPage } = await vite.ssrLoadModule("/src/pages/reports/ReportsPage.jsx");
  const { default: ReportActions } = await vite.ssrLoadModule("/src/pages/reports/ReportActions.jsx");
  const { default: NewReport } = await vite.ssrLoadModule("/src/pages/reports/NewReport.jsx");
  const { default: ReportEvidence } = await vite.ssrLoadModule("/src/pages/reports/ReportEvidence.jsx");
  const { default: StaffRoute } = await vite.ssrLoadModule("/src/routes/staffRoute.jsx");
  const create = React.createElement;
  const admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" };
  const moderator = { id: "bbbbbbbbbbbbbbbbbbbbbbbb", role: "moderator", permissions: ["users.read", "reports.read", "reports.manage"] };
  const reader = { ...moderator, permissions: ["users.read", "reports.read"] };
  const client = { id: "cccccccccccccccccccccccc", role: "client" };
  const report = { _id: "dddddddddddddddddddddddd", reporter: client.id, targetUser: null, status: "open", priority: "normal", assignedTo: null, version: 0, adminOnly: false };
  let checks = 0;
  function render(component, props, user = client, path = "/reports") {
    checks++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [path] }, create(component, props))));
  }
  assert.match(render(ReportsPage, {}), /My reports/);
  assert.match(render(ReportsPage, { staff: true }, admin, "/admin/reports"), /Admin portal/);
  assert.match(render(ReportsPage, { staff: true }, moderator, "/moderator/reports"), /Moderator portal/);
  assert.match(render(NewReport, {}), /Submit report/);
  const seeded = render(NewReport, {}, client, "/reports/new?type=message&targetId=111111111111111111111111");
  assert.match(seeded, /Loading reported item/); assert.match(seeded, /button disabled=""/);
  assert.match(render(ReportActions, { report, user: moderator }), /Claim case/);
  assert.doesNotMatch(render(ReportActions, { report, user: moderator }), /Assign reviewer/);
  assert.match(render(ReportActions, { report, user: admin }), /Assign reviewer/);
  assert.match(render(ReportActions, { report, user: reader }), /viewing reports only/);
  const assigned = { ...report, status: "under_review", assignedTo: moderator.id };
  assert.match(render(ReportActions, { report: assigned, user: moderator }), /Resolve case/);
  assert.match(render(ReportActions, { report: { ...assigned, assignedTo: admin.id }, user: moderator }), /another reviewer/);
  assert.match(render(ReportActions, { report: { ...assigned, status: "resolved" }, user: moderator }), /Reopen case/);
  assert.match(render(ReportActions, { report: { ...report, targetUser: admin.id }, user: admin }), /involving your account/);
  assert.match(render(ReportEvidence, { evidence: { text: "<script>alert('x')</script>", sentAt: "2026-10-07T10:00:00Z" } }), /&lt;script&gt;/);
  assert.equal(render(StaffRoute, { permission: "reports.read", children: create("p", null, "Allowed report page") }, moderator), "<p>Allowed report page</p>");
  assert.doesNotMatch(render(StaffRoute, { permission: "reports.manage", children: create("p", null, "Allowed report page") }, reader), /Allowed report page/);
  console.log(`Reports UI: ${checks} server renders passed. Browser interaction is unverified.`);
} finally { await vite.close(); }
