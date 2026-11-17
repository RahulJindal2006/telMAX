/* =====================================================================
   telMAX status monitor - Cloudflare Worker test suite (run with: npm test)
   Drives the real Worker handlers against an in-memory KV + a stubbed probe,
   so the KV-backed cycle and HTTP routing are verified without Cloudflare.
   ===================================================================== */

import assert from "node:assert/strict";
import { cycle, serve, loadBoard, KEY } from "../server/cloudflare/worker.mjs";

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

/* In-memory stand-in for a Workers KV namespace. */
function fakeKV() {
  const m = new Map();
  return {
    get: async (k) => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => void m.set(k, v),
    list: async ({ prefix } = {}) => ({ keys: [...m.keys()].filter((k) => !prefix || k.startsWith(prefix)).map((name) => ({ name })) }),
    _map: m,
  };
}

const stubProbe = (map) => async (service) => {
  const status = map[service.id] || "operational";
  return {
    status,
    httpStatus: status === "operational" ? 200 : status === "outage" ? 0 : 200,
    latencyMs: 12,
    error: status === "outage" ? "network error" : null,
  };
};

const req = (path) => new Request(`https://status.telmax.workers.dev${path}`);

console.log("\ntelMAX status monitor - Cloudflare Worker tests\n");

await test("cold-start GET /status.json probes once and returns the board", async () => {
  const env = { STATUS_KV: fakeKV(), ALLOW_ORIGIN: "*" };
  // Seed KV via a cycle so we don't hit the real network here.
  await cycle(env, { probeImpl: stubProbe({}), now: Date.parse("2026-07-12T10:00:00Z") });
  const res = await serve(req("/status.json"), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  const body = await res.json();
  assert.equal(body.window_days, 90);
  assert.ok(body.services.length >= 1);
  assert.equal(body.incidents.length, 0);
});

await test("cron cycle persists an outage to KV and it surfaces over HTTP", async () => {
  const env = { STATUS_KV: fakeKV(), ALLOW_ORIGIN: "*" };
  const t0 = Date.parse("2026-07-12T10:00:00Z");
  await cycle(env, { probeImpl: stubProbe({ internet: "outage" }), now: t0 });

  // Persisted to KV?
  const board = await loadBoard(env);
  assert.ok(board && board.public, "board persisted to KV");
  assert.equal(board.public.incidents.length, 1, "one active incident stored");
  assert.equal(board.public.services.find((s) => s.id === "internet").status, "outage");

  // Served over HTTP?
  const res = await serve(req("/status.json"), env);
  const body = await res.json();
  assert.equal(body.incidents.length, 1);
  assert.ok(body.incidents[0].services.includes("internet"));

  // healthz reflects it.
  const health = await (await serve(req("/healthz"), env)).json();
  assert.equal(health.ok, true);
  assert.equal(health.overall, "outage");
  assert.equal(health.activeIncidents, 1);
});

await test("recovery on the next cron closes the incident into history", async () => {
  const env = { STATUS_KV: fakeKV(), ALLOW_ORIGIN: "*" };
  const t0 = Date.parse("2026-07-12T10:00:00Z");
  await cycle(env, { probeImpl: stubProbe({ internet: "outage" }), now: t0 });
  await cycle(env, { probeImpl: stubProbe({}), now: t0 + 300000 });

  const body = await (await serve(req("/status.json"), env)).json();
  assert.equal(body.incidents.length, 0, "incident cleared");
  assert.equal(body.history.length, 1, "moved to history");
  assert.ok(body.history[0].resolved, "history entry has a resolved time");
  assert.equal(body.services.find((s) => s.id === "internet").status, "operational");
});

await test("CORS preflight + unknown route behave", async () => {
  const env = { STATUS_KV: fakeKV(), ALLOW_ORIGIN: "*" };
  const opt = await serve(new Request(req("/status.json").url, { method: "OPTIONS" }), env);
  assert.equal(opt.status, 204);
  assert.equal(opt.headers.get("access-control-allow-origin"), "*");

  const nf = await serve(req("/nope"), env);
  assert.equal(nf.status, 404);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
