/* =====================================================================
   Outage reports - test suite (run with: npm test)
   Covers the shared validation, the Node HTTP route, and the Worker route.
   ===================================================================== */

import http from "node:http";
import assert from "node:assert/strict";
import { normalizeReport, summarizeReports, SERVICE_OPTIONS, DURATION_OPTIONS } from "../server/reports.mjs";
import { makeHandler } from "../server/server.mjs";
import { serve } from "../server/cloudflare/worker.mjs";

/* ---- Tiny runner ---------------------------------------------------- */
let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

const VALID = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  phone: "905-555-0142",
  address: "14 Main Street, Newmarket",
  service: "internet",
  description: "No internet at all since this morning.",
  duration: "hours",
};

console.log("\ntelMAX outage reports - tests\n");

/* ---- 1. normalizeReport --------------------------------------------- */
await test("valid input normalises into a record with an id + labels", () => {
  const r = normalizeReport(VALID, { userAgent: "test" });
  assert.equal(r.ok, true);
  assert.match(r.record.id, /^R-\d{8}-[A-Z0-9]{6}$/);
  assert.equal(r.record.serviceLabel, "MAXfibre Internet");
  assert.equal(r.record.durationLabel, "A few hours");
  assert.equal(r.record.status, "new");
  assert.ok(r.record.receivedAt);
});

await test("each required field is enforced", () => {
  assert.match(normalizeReport({ ...VALID, name: "  " }).error, /name/i);
  assert.match(normalizeReport({ ...VALID, email: "nope" }).error, /email/i);
  assert.match(normalizeReport({ ...VALID, address: "" }).error, /address/i);
  assert.match(normalizeReport({ ...VALID, service: "rockets" }).error, /service/i);
  assert.match(normalizeReport({ ...VALID, description: "no" }).error, /describe/i);
  assert.match(normalizeReport({ ...VALID, duration: "forever" }).error, /how long/i);
});

await test("long fields are clipped and phone is optional", () => {
  const r = normalizeReport({ ...VALID, phone: "", description: "x".repeat(5000) });
  assert.equal(r.ok, true);
  assert.equal(r.record.phone, null);
  assert.equal(r.record.description.length, 4000);
});

await test("option lists are non-empty and self-consistent", () => {
  assert.ok(SERVICE_OPTIONS.length >= 2 && DURATION_OPTIONS.length >= 2);
  for (const o of [...SERVICE_OPTIONS, ...DURATION_OPTIONS]) assert.ok(o.value && o.label);
});

/* ---- 2. Node HTTP route --------------------------------------------- */
await test("Node POST /report saves, validates, and gates /reports", async () => {
  const store = [];
  const onReport = async (input, meta) => {
    const r = normalizeReport(input, meta);
    if (r.ok) store.push(r.record);
    return r;
  };
  const getReports = (token) => (token === "secret" ? store.slice().reverse() : null);
  const server = http.createServer(
    makeHandler({ getCurrent: () => ({}), getHealth: () => ({ ok: true }), onReport, getReports }),
  );
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body) =>
    fetch(`${base}/report`, { method: "POST", headers: { "content-type": "application/json" }, body });
  try {
    // Happy path
    const ok = await post(JSON.stringify(VALID));
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("access-control-allow-origin"), "*");
    const okBody = await ok.json();
    assert.equal(okBody.ok, true);
    assert.match(okBody.id, /^R-/);
    assert.equal(store.length, 1);

    // Validation failure
    const bad = await post(JSON.stringify({ ...VALID, email: "nope" }));
    assert.equal(bad.status, 422);
    assert.match((await bad.json()).error, /email/i);

    // Malformed JSON
    const broken = await post("{not json");
    assert.equal(broken.status, 400);

    // Preflight allows POST
    const opt = await fetch(`${base}/report`, { method: "OPTIONS" });
    assert.equal(opt.status, 204);
    assert.match(opt.headers.get("access-control-allow-methods"), /POST/);

    // /reports is gated
    assert.equal((await fetch(`${base}/reports`)).status, 403);
    const listed = await fetch(`${base}/reports?token=secret`);
    assert.equal(listed.status, 200);
    assert.equal((await listed.json()).count, 1);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

/* ---- 3. Cloudflare Worker route ------------------------------------- */
function fakeKV() {
  const m = new Map();
  return {
    get: async (k) => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => void m.set(k, v),
    list: async ({ prefix } = {}) => ({
      keys: [...m.keys()].filter((k) => !prefix || k.startsWith(prefix)).map((name) => ({ name })),
    }),
    _map: m,
  };
}
const req = (path, init) => new Request(`https://status.telmax.workers.dev${path}`, init);

await test("Worker POST /report stores to KV and gates /reports", async () => {
  const env = { STATUS_KV: fakeKV(), REPORTS_TOKEN: "secret", ALLOW_ORIGIN: "*" };

  const ok = await serve(
    req("/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(VALID) }),
    env,
  );
  assert.equal(ok.status, 200);
  const okBody = await ok.json();
  assert.equal(okBody.ok, true);
  assert.ok([...env.STATUS_KV._map.keys()].some((k) => k.startsWith("report:")), "stored under report: prefix");

  const bad = await serve(
    req("/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...VALID, service: "x" }) }),
    env,
  );
  assert.equal(bad.status, 422);

  assert.equal((await serve(req("/reports"), env)).status, 403);
  const listed = await serve(req("/reports?token=secret"), env);
  assert.equal(listed.status, 200);
  assert.equal((await listed.json()).count, 1);
});

/* ---- 4. summarizeReports (first-party "Downdetector" signal) --------- */
const SVC = [
  { id: "internet", name: "MAXfibre Internet" },
  { id: "tv", name: "MAXview TV" },
];
const NOW = Date.parse("2026-07-14T12:00:00Z");
const at = (minsAgo, service, extra = {}) => ({
  receivedAt: new Date(NOW - minsAgo * 60000).toISOString(),
  service,
  ...extra,
});
const opts = { now: NOW, windowMinutes: 60, bucketMinutes: 5, elevated: 3, spike: 6, services: SVC };

await test("empty input -> zero total, level none, full bucket array", () => {
  const s = summarizeReports([], opts);
  assert.equal(s.total, 0);
  assert.equal(s.level, "none");
  assert.equal(s.buckets.length, 12);
  assert.ok(s.buckets.every((b) => b === 0));
  assert.deepEqual(s.services.map((x) => x.count), [0, 0]);
});

await test("counts recent reports per service and flags elevated", () => {
  const s = summarizeReports([at(5, "internet"), at(12, "internet"), at(40, "internet"), at(50, "tv")], opts);
  assert.equal(s.total, 4);
  const internet = s.services.find((x) => x.id === "internet");
  const tv = s.services.find((x) => x.id === "tv");
  assert.equal(internet.count, 3);
  assert.equal(internet.level, "elevated"); // >= 3
  assert.equal(tv.count, 1);
  assert.equal(tv.level, "none");
  assert.equal(s.level, "elevated"); // overall reflects worst service
  assert.equal(s.buckets.reduce((a, b) => a + b, 0), 4, "all four land in buckets");
});

await test("a big cluster is a 'spike' and old reports drop out of the window", () => {
  const recent = Array.from({ length: 6 }, (_, i) => at(i * 4 + 1, "internet"));
  const old = [at(90, "internet"), at(200, "tv")]; // outside the 60-min window
  const s = summarizeReports([...recent, ...old], opts);
  assert.equal(s.total, 6, "only in-window reports count");
  assert.equal(s.services.find((x) => x.id === "internet").level, "spike"); // >= 6
  assert.equal(s.level, "spike");
});

await test("summary is PII-free (no names/emails/descriptions leak)", () => {
  const withPII = [
    at(3, "internet", { name: "SECRET NAME", email: "secret@example.com", description: "PRIVATE DETAILS", phone: "5551234567" }),
  ];
  const json = JSON.stringify(summarizeReports(withPII, opts));
  for (const leak of ["SECRET NAME", "secret@example.com", "PRIVATE DETAILS", "5551234567"]) {
    assert.ok(!json.includes(leak), `must not leak: ${leak}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
