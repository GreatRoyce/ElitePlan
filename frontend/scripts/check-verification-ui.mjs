import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Queue } = await vite.ssrLoadModule("/src/pages/admin/ProfileVerification.jsx");
  const { default: Detail } = await vite.ssrLoadModule("/src/pages/admin/ProfileVerificationDetails.jsx");
  const { default: Actions } = await vite.ssrLoadModule("/src/pages/admin/VerificationActions.jsx");
  const { default: Status } = await vite.ssrLoadModule("/src/components/Verification/VerificationStatus.jsx");
  const { default: AdminRoute } = await vite.ssrLoadModule("/src/routes/adminRoute.jsx");
  const { profileLink } = await vite.ssrLoadModule("/src/utils/profileVerification.js");
  const create = React.createElement;
  const admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" };
  const data = { profile: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", type: "vendor", organization: "Events and Decor" }, owner: { accountStatus: "active" }, verification: { status: "unverified", version: 0 }, eligibility: { canApprove: true, missingFields: [] } };
  let count = 0;
  function render(component, props, user = admin) {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: ["/admin/verification"] }, create(component, props))));
  }
  assert.match(render(Queue, {}), /Profile verification/);
  assert.match(render(Detail, {}), /Loading profile/);
  const review = render(Actions, { data });
  assert.match(review, /Approve verification/); assert.match(review, /Reject verification/);
  assert.match(review, /business identity/i); assert.match(review, /type="checkbox"/); assert.match(review, /button disabled=""/);
  assert.match(render(Actions, { data: { ...data, verification: { status: "verified", version: 1 } } }), /Revoke verification/);
  const rejected = render(Actions, { data: { ...data, verification: { status: "rejected", version: 1 } } });
  assert.match(rejected, /Approve verification/); assert.doesNotMatch(rejected, /Reject verification<\/option>/);
  const incomplete = render(Actions, { data: { ...data, eligibility: { canApprove: false, missingFields: ["Business name"] } } });
  assert.match(incomplete, /Business name/); assert.doesNotMatch(incomplete, /Approve verification<\/option>/);
  const restricted = render(Actions, { data: { ...data, owner: { accountStatus: "banned" }, eligibility: { canApprove: false, missingFields: [] } } });
  assert.match(restricted, /Restore active account access/);
  assert.match(render(Status, { profile: { verified: true, verification: { status: "unverified" } } }), /Verified/);
  assert.match(render(Status, { profile: { verified: false, verification: { status: "revoked", reason: "Updated business details" } } }), /Updated business details/);
  assert.match(render(Status, { profile: { verified: false, verification: { status: "rejected", reason: "<script>alert('x')</script>" } } }), /&lt;script&gt;/);
  assert.equal(render(AdminRoute, { children: create("p", null, "Verification allowed") }), "<p>Verification allowed</p>");
  assert.doesNotMatch(render(AdminRoute, { children: create("p", null, "Verification allowed") }, { role: "moderator" }), /Verification allowed/);
  for (const value of ["javascript:alert(1)", "data:text/html,private", "uploads/../secret.txt", "https://user:pass@example.com"]) assert.equal(profileLink(value), null);
  assert.equal(profileLink("https://example.com/profile"), "https://example.com/profile");
  console.log(`Verification UI: ${count} server renders and link validation passed. Browser interaction is unverified.`);
} finally { await vite.close(); }
