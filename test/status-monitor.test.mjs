/* =====================================================================
   telMAX status monitor - test suite (run with: npm test)
   Covers the pure logic, a REAL loopback probe (no external network), the
   incident lifecycle, and the HTTP routes.
   ===================================================================== */

import http from "node:http";
import assert from "node:assert/strict";
import {
  classify,
  probe,
  runCycle,
  buildPublic,
  emptyState,
  worse,
} from "../server/monitor.mjs";
import { makeHandler } from "../server/server.mjs";

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

const CONFIG = {
  timeoutMs: 2000,
  degradedMs: 60,
  windowDays: 90,
  services: [
    { id: "internet", name: "MAXfibre Internet", note: "Pure fibre network", url: "" },
    { id: "tv", name: "MAXview TV", note: "TV", url: "" },
  ],
  areas: ["Aurora", "Markham"],
};

console.log("\ntelMAX status monitor - tests\n");

/* ---- 1. classify ---------------------------------------------------- */
await test("classify: fast 200 is operational", () => {
  assert.equal(classify(200, 10, CONFIG), "operational");
});
await test("classify: slow 200 is degraded", () => {
  assert.equal(classify(200, 999, CONFIG), "degraded");
});
await test("classify: 404 still means reachable (operational)", () => {
  assert.equal(classify(404, 10, CONFIG), "operational");
});
await test("classify: 503 is an outage", () => {
  assert.equal(classify(503, 10, CONFIG), "outage");
});
await test("classify: no response (0) is an outage", () => {
  assert.equal(classify(0, 10, CONFIG), "outage");
});
await test("worse() picks the more severe status", () => {
  assert.equal(worse("operational", "degraded"), "degraded");
  assert.equal(worse("outage", "degraded"), "outage");
});

/* ---- 2. real loopback probe (no external network) ------------------- */
await test("probe hits a real endpoint over loopback and classifies it", async () => {
  const upstream = http.createServer((req, res) => {
    if (req.url === "/ok") return res.writeHead(200).end("ok");
    if (req.url === "/slow") return setTimeout(() => res.writeHead(200).end("slow"), 140);
    if (req.url === "/err") return res.writeHead(503).end("nope");
    res.writeHead(404).end("nf");
  });
  await new Promise((r) => upstream.listen(0, r));
  const base = `http://127.0.0.1:${upstream.address().port}`;
  try {
    assert.equal((await probe({ name: "X", url: `${base}/ok` }, CONFIG)).status, "operational");
    assert.equal((await probe({ name: "X", url: `${base}/slow` }, CONFIG)).status, "degraded");
    assert.equal((await probe({ name: "X", url: `${base}/err` }, CONFIG)).status, "outage");
    // Connection refused -> outage, and it must never throw.
    const dead = await probe({ name: "X", url: "http://127.0.0.1:1/" }, CONFIG);
    assert.equal(dead.status, "outage");
    assert.ok(dead.error, "a failed probe records an error string");
  } finally {
    await new Promise((r) => upstream.close(r));
  }
});

await test("probe times out and reports it, without throwing", async () => {
  const hang = http.createServer(() => {}); // never responds
  await new Promise((r) => hang.listen(0, r));
  const base = `http://127.0.0.1:${hang.address().port}`;
  try {
    const r = await probe({ name: "X", url: `${base}/` }, { ...CONFIG, timeoutMs: 120 });
    assert.equal(r.status, "outage");
    assert.equal(r.error, "timeout");
  } finally {
    await new Promise((r) => hang.close(r));
  }
});

/* ---- 3. incident lifecycle via injected probe ----------------------- */
function stubProbe(map) {
  // map: { serviceId: "operational"|"degraded"|"outage" }
  return async (service) => {
    const status = map[service.id] || "operational";
    return { status, httpStatus: status === "operational" ? 200 : status === "outage" ? 0 : 200, latencyMs: 5, error: status === "outage" ? "network error" : null };
  };
}

await test("an outage opens an incident, recovery closes it into history", async () => {
  const state = emptyState();
  const t0 = Date.parse("2026-07-10T12:00:00Z");

  // Cycle 1: internet down.
  await runCycle(state, CONFIG, t0, stubProbe({ internet: "outage" }));
  let pub = buildPublic(state, CONFIG, t0);
  assert.equal(pub.incidents.length, 1, "one active incident");
  assert.equal(pub.incidents[0].services[0], "internet");
  assert.equal(pub.services.find((s) => s.id === "internet").status, "outage");
  const startedAt = state.open.internet.started;

  // Cycle 2: still down 5 min later -> same incident, unchanged start.
  await runCycle(state, CONFIG, t0 + 300000, stubProbe({ internet: "outage" }));
  assert.equal(Object.keys(state.open).length, 1, "still one open incident");
  assert.equal(state.open.internet.started, startedAt, "start time is preserved");

  // Cycle 3: recovered -> incident closes.
  await runCycle(state, CONFIG, t0 + 600000, stubProbe({}));
  pub = buildPublic(state, CONFIG, t0 + 600000);
  assert.equal(pub.incidents.length, 0, "no active incidents after recovery");
  assert.equal(pub.history.length, 1, "resolved incident moved to history");
  assert.ok(pub.history[0].resolved, "history entry has a resolved time");
  assert.equal(pub.history[0].started, startedAt);
  assert.equal(pub.services.find((s) => s.id === "internet").status, "operational");
});

await test("uptime % drops after a down day and areas flag only on full outage", async () => {
  const state = emptyState();
  const t0 = Date.parse("2026-07-11T09:00:00Z");
  await runCycle(state, CONFIG, t0, stubProbe({ internet: "outage" })); // internet down, tv up
  const pub = buildPublic(state, CONFIG, t0);
  const internet = pub.services.find((s) => s.id === "internet");
  assert.ok(internet.uptimePct < 100, "internet uptime dropped below 100%");
  assert.equal(pub.services.find((s) => s.id === "tv").uptimePct, 100, "tv stays at 100%");
  assert.equal(pub.areas[0].status, "operational", "areas NOT flagged when only one service is down");

  // Now everything down -> areas flip to outage.
  await runCycle(state, CONFIG, t0 + 60000, stubProbe({ internet: "outage", tv: "outage" }));
  const pub2 = buildPublic(state, CONFIG, t0 + 60000);
  assert.equal(pub2.areas[0].status, "outage", "areas flagged when all services are down");
});

/* ---- 4. output schema matches what the page consumes ---------------- */
await test("buildPublic emits the status.json shape the page expects", () => {
  const state = emptyState();
  const pub = buildPublic(state, CONFIG, Date.now());
  for (const key of ["updated", "window_days", "services", "areas", "incidents", "history"]) {
    assert.ok(key in pub, `missing key: ${key}`);
  }
  assert.ok(Array.isArray(pub.services) && pub.services[0].id && pub.services[0].name);
  assert.equal(pub.window_days, 90);
});

/* ---- 5. HTTP routes ------------------------------------------------- */
await test("HTTP handler serves /status.json and /healthz with CORS", async () => {
  const current = { updated: "now", window_days: 90, services: [], areas: [], incidents: [], history: [] };
  const handler = makeHandler({
    getCurrent: () => current,
    getHealth: () => ({ ok: true, lastCycle: "now" }),
    allowOrigin: "*",
  });
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const s = await fetch(`${base}/status.json`);
    assert.equal(s.status, 200);
    assert.equal(s.headers.get("access-control-allow-origin"), "*");
    const body = await s.json();
    assert.equal(body.window_days, 90);

    const h = await fetch(`${base}/healthz`);
    assert.equal(h.status, 200);
    assert.equal((await h.json()).ok, true);

    const nf = await fetch(`${base}/nope`);
    assert.equal(nf.status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
