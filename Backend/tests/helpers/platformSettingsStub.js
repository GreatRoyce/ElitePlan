const { before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const Settings = require("../../src/models/platformSettings.model");
const { ID } = require("../../src/services/platformSettings.service");
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
function install() {
  const state = { row: null, failRead: false, failWrite: false, conflict: false, writes: [] }, originals = {};
  function query(get) { return { select() { return this; }, maxTimeMS(ms) { assert.equal(ms, 2000); return this; }, async exec() { return clone(await get()); }, lean() { return this.exec(); }, then(resolve, reject) { return this.exec().then(resolve, reject); } }; }
  before(() => {
    for (const method of ["findById", "findOneAndUpdate"]) originals[method] = Settings[method];
    Settings.findById = (id) => { assert.equal(id, ID); return query(() => { if (state.failRead) throw new Error("Private settings credentials"); return state.row; }); };
    Settings.findOneAndUpdate = (filter, update, options) => query(() => {
      if (state.failWrite) throw new Error("Private settings write error");
      assert.equal(filter._id, ID); assert.equal(options.new, true); assert.equal(options.runValidators, true); assert.equal(options.maxTimeMS, 2000);
      if (state.conflict) { if (options.upsert) { const e = new Error("Duplicate singleton"); e.code = 11000; throw e; } return null; }
      if (state.row ? state.row.version !== filter.version : !options.upsert) return null;
      const doc = new Settings(state.row || { _id: ID });
      doc.set(update.$set); doc.version += update.$inc.version;
      assert.equal(update.$push.history.$slice, -100);
      doc.history = [...doc.history, ...update.$push.history.$each].slice(-100); doc.updatedAt = new Date();
      assert.equal(doc.validateSync(), undefined); state.row = clone(doc.toObject()); state.writes.push(clone({ filter, update, options })); return state.row;
    });
  });
  beforeEach(() => { state.row = null; state.failRead = false; state.failWrite = false; state.conflict = false; state.writes = []; });
  after(() => { for (const [method, original] of Object.entries(originals)) Settings[method] = original; });
  return state;
}
module.exports = { install };
