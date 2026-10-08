import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { default: AuthContext } = await vite.ssrLoadModule("/src/context/authStore.js");
  const { default: Portal, SupportSignIn } = await vite.ssrLoadModule("/src/pages/support/SupportPortal.jsx");
  const { default: AdminSupport } = await vite.ssrLoadModule("/src/pages/admin/AdminSupport.jsx");
  const { default: Queue, SupportList } = await vite.ssrLoadModule("/src/pages/support/SupportQueue.jsx");
  const { default: NewRequest } = await vite.ssrLoadModule("/src/pages/support/NewSupportRequest.jsx");
  const { SupportConversation, SupportReviewContext, MemberSupportReply } = await vite.ssrLoadModule("/src/pages/support/SupportDetails.jsx");
  const { default: Actions } = await vite.ssrLoadModule("/src/pages/admin/SupportActions.jsx");
  const { default: AdminRoute } = await vite.ssrLoadModule("/src/routes/adminRoute.jsx");
  const { default: ContentNotice } = await vite.ssrLoadModule("/src/components/Moderation/ContentNotice.jsx");
  const { default: VerificationStatus } = await vite.ssrLoadModule("/src/components/Verification/VerificationStatus.jsx");
  const create = React.createElement, admin = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "admin" };
  let count = 0;
  function render(Component, props = {}, user = admin, path = "/support") {
    count++;
    return renderToStaticMarkup(create(AuthContext.Provider, { value: { user, loading: false } }, create(MemoryRouter, { initialEntries: [path] }, create(Component, props))));
  }
  const data = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", owner: "cccccccccccccccccccccccc", type: "appeal", category: "account_access", subject: "Please review", details: "<script>Member details</script>", status: "open", messages: [{ _id: "message", from: "admin", text: "<img src=x onerror=alert(1)>", at: "2026-10-08T12:00:00Z" }], history: [], canReview: true, assignedTo: null, ownerAccount: { id: "cccccccccccccccccccccccc", username: "Member", accountStatus: "banned" }, appeal: { kind: "account", status: "banned", reason: "<script>Decision</script>", targetId: "cccccccccccccccccccccccc", targetType: "account", version: 2 }, currentAppeal: { status: "banned", remedied: false, version: 2 } };
  assert.match(render(Portal, {}, null), /Support &amp; appeals/);
  const signIn = render(SupportSignIn, {}, null); assert.match(signIn, /archived members can sign in/); assert.match(signIn, /autoComplete="current-password"/); assert.match(signIn, /30 minutes/);
  assert.match(render(AdminSupport, {}, admin, "/admin/support"), /admin who did not make the original decision/);
  assert.match(render(Queue, { staff: true }), /Reviewer/); assert.doesNotMatch(render(Queue), /Reviewer/);
  assert.match(render(SupportList, { data: { tickets: [data] } }), /href="\/support\/bbbb/);
  assert.match(render(SupportList, { staff: true, data: { tickets: [data] } }), /href="\/admin\/support\/bbbb/);
  assert.match(render(SupportList, { data: { tickets: [] } }), /No support requests match/);
  const newRequest = render(NewRequest, { options: [data.appeal] }, admin, "/support?appeal=account"); assert.match(newRequest, /Restriction to appeal/); assert.match(newRequest, /&lt;script&gt;Decision/); assert.match(newRequest, /maxLength="5000"/);
  assert.match(render(NewRequest, { options: [] }), /No current restrictions/);
  const conversation = render(SupportConversation, { data }); assert.match(conversation, /&lt;script&gt;Member details/); assert.match(conversation, /&lt;img/); assert.doesNotMatch(conversation, /<script>|<img/);
  assert.match(render(SupportReviewContext, { data }), /Open restoration controls/);
  assert.match(render(Actions, { data }), /Claim for review/);
  const assigned = { ...data, assignedTo: admin.id, status: "under_review" };
  const actions = render(Actions, { data: assigned }); assert.match(actions, /Private review note/); assert.doesNotMatch(actions, /Accept appeal|Resolve support request/); assert.match(actions, /Request more information/);
  assert.match(render(Actions, { data: { ...assigned, currentAppeal: { status: "active", remedied: true, version: 3 } } }), /Accept appeal/);
  assert.equal(render(Actions, { data: { ...assigned, canReview: false } }), "");
  assert.match(render(Actions, { data: { ...assigned, type: "support" } }), /Resolve support request/);
  assert.match(render(Actions, { data: { ...assigned, status: "resolved" } }), /Reopen request/);
  assert.match(render(MemberSupportReply, { data: { ...data, status: "resolved" } }), /Start a follow-up request/);
  assert.match(render(MemberSupportReply, { data }), /maxLength="2000"/);
  assert.match(render(ContentNotice, { profile: { active: false } }), /href="\/support\?appeal=listing"/);
  assert.match(render(VerificationStatus, { profile: { verified: false, verification: { status: "revoked" } } }), /href="\/support\?appeal=verification"/);
  assert.doesNotMatch(render(AdminRoute, { children: create("p", null, "Private support queue") }, { role: "moderator" }), /Private support queue/);
  console.log(`Support UI: ${count} server renders passed. Browser interactions remain unverified.`);
} finally { await vite.close(); }
