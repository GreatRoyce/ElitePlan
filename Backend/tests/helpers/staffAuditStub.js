const { before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const Audit = require("../../src/models/staffAudit.model");
const clone = (value) => JSON.parse(JSON.stringify(value));
function install() {
  const state = { entries: new Map(), failCreate: false, failFinish: false, failRead: false, finishConflict: false }, originals = {};
  const matches = (entry, filter) => Object.entries(filter).every(([k, v]) => {
    if (v && typeof v === "object" && typeof v.toHexString !== "function") return Object.entries(v).every(([op, date]) => op === "$gte" ? new Date(entry[k]) >= new Date(date) : op === "$lt" ? new Date(entry[k]) < new Date(date) : false);
    return String(entry[k]) === String(v);
  });
  function query(get) { return { offset: 0, size: Infinity, ordering: null, select() { return this; }, maxTimeMS() { return this; }, sort(order) { this.ordering = order; return this; }, skip(n) { this.offset = n; return this; }, limit(n) { this.size = n; return this; }, async exec() { if (state.failRead) throw new Error("Private audit read failure"); let value = await get(); if (Array.isArray(value)) { if (this.ordering) value.sort((a, b) => { for (const [k, direction] of Object.entries(this.ordering)) { const comparison = a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0; if (comparison) return comparison * direction; } return 0; }); value = value.slice(this.offset, this.offset + this.size); } return value == null ? null : clone(value); }, lean() { return this.exec(); }, then(resolve, reject) { return this.exec().then(resolve, reject); } }; }
  before(() => {
    for (const method of ["create", "updateOne", "find", "findById", "countDocuments"]) originals[method] = Audit[method];
    Audit.create = async (data) => { if (state.failCreate) throw new Error("Private audit unavailable"); const doc = new Audit(data); assert.equal(doc.validateSync(), undefined); state.entries.set(String(doc._id), clone(doc.toObject())); return doc; };
    Audit.updateOne = async (filter, update, options) => { if (state.failFinish) throw new Error("Private audit completion failure"); assert.equal(options.runValidators, true); const entry = [...state.entries.values()].find((e) => matches(e, filter)); if (!entry || state.finishConflict) return { matchedCount: 0 }; Object.assign(entry, clone(update.$set)); assert.equal(new Audit(entry).validateSync(), undefined); return { matchedCount: 1 }; };
    Audit.find = (filter = {}) => query(() => [...state.entries.values()].filter((e) => matches(e, filter)));
    Audit.findById = (id) => query(() => state.entries.get(String(id)) || null);
    Audit.countDocuments = (filter) => query(() => [...state.entries.values()].filter((e) => matches(e, filter)).length);
  });
  beforeEach(() => { state.entries.clear(); state.failCreate = false; state.failFinish = false; state.failRead = false; state.finishConflict = false; });
  after(() => { for (const [method, original] of Object.entries(originals)) Audit[method] = original; });
  return state;
}
module.exports = { install };
