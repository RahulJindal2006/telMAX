/* =====================================================================
   Excel export - test suite (run with: npm test)
   Verifies the .xlsx builder produces a valid ZIP/OOXML package and that the
   Node + Worker download routes serve it, gated by the reports token.
   ===================================================================== */

import http from "node:http";
import assert from "node:assert/strict";
import { reportsToXlsx, xlsxFilename } from "../server/xlsx.mjs";
import { normalizeReport } from "../server/reports.mjs";
import { makeHandler } from "../server/server.mjs";
import { serve } from "../server/cloudflare/worker.mjs";

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

const SAMPLE = [
  normalizeReport({
    name: "Priya Shah", email: "priya@example.com", phone: "905-555-0199",
    address: "88 Oak Ave, Aurora", service: "internet",
    description: "Down since 9am <fibre> box red LOS & alarm \"light\".", duration: "lt1h",
  }).record,
  normalizeReport({
    name: "Sam Rivera", email: "sam@example.com",
    address: "12 Elm St, Markham", service: "tv",
    description: "MAXview app keeps freezing.", duration: "since-yesterday",
  }).record,
];

console.log("\ntelMAX outage reports - Excel export tests\n");

await test("produces a valid ZIP (PK header + End-Of-Central-Directory)", () => {
  const buf = reportsToXlsx(SAMPLE);
  assert.ok(buf instanceof Uint8Array);
  assert.ok(buf.length > 400, "non-trivial size");
  // Local file header magic "PK\x03\x04"
  assert.deepEqual([...buf.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  // End of central directory magic "PK\x05\x06" appears near the end
  const tail = [...buf.slice(-64)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assert.ok(tail.includes("504b0506"), "has EOCD record");
});

await test("contains the required OOXML parts and the data (stored, so readable)", () => {
  const text = Buffer.from(reportsToXlsx(SAMPLE)).toString("latin1");
  for (const part of [
    "[Content_Types].xml",
    "xl/workbook.xml",
    "xl/worksheets/sheet1.xml",
    "xl/styles.xml",
  ]) {
    assert.ok(text.includes(part), `missing part: ${part}`);
  }
  // Header labels + a value are present, and free-text is XML-escaped.
  assert.ok(text.includes("Reference") && text.includes("Issue"));
  assert.ok(text.includes("Priya Shah") && text.includes("MAXfibre Internet"));
  assert.ok(text.includes("&lt;fibre&gt;") && text.includes("&quot;light&quot;"), "XML-escaped");
  assert.ok(text.includes("autoFilter") && text.includes('state="frozen"'), "filter + frozen header");
});

await test("empty input still yields a valid (header-only) workbook", () => {
  const buf = reportsToXlsx([]);
  assert.deepEqual([...buf.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
});

await test("xlsxFilename is dated and .xlsx", () => {
  assert.match(xlsxFilename(new Date("2026-07-14T12:00:00Z")), /^telmax-outage-reports-2026-07-14\.xlsx$/);
});

await test("Node GET /reports.xlsx downloads, gated by token", async () => {
  const store = [...SAMPLE];
  const getReports = (token) => (token === "secret" ? store : null);
  const server = http.createServer(makeHandler({ getCurrent: () => ({}), getHealth: () => ({}), onReport: async () => ({ ok: true, record: {} }), getReports }));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/reports.xlsx`)).status, 403);
    const res = await fetch(`${base}/reports.xlsx?token=secret`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /spreadsheetml\.sheet/);
    assert.match(res.headers.get("content-disposition"), /attachment; filename=".*\.xlsx"/);
    const buf = new Uint8Array(await res.arrayBuffer());
    assert.deepEqual([...buf.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

await test("Worker GET /reports.xlsx downloads, gated by token", async () => {
  const kv = (() => {
    const m = new Map();
    SAMPLE.forEach((r) => m.set("report:" + r.id, JSON.stringify(r)));
    return {
      get: async (k) => (m.has(k) ? m.get(k) : null),
      put: async (k, v) => void m.set(k, v),
      list: async ({ prefix } = {}) => ({ keys: [...m.keys()].filter((k) => !prefix || k.startsWith(prefix)).map((name) => ({ name })) }),
    };
  })();
  const env = { STATUS_KV: kv, REPORTS_TOKEN: "secret", ALLOW_ORIGIN: "*" };
  const req = (p) => new Request(`https://x.workers.dev${p}`);

  assert.equal((await serve(req("/reports.xlsx"), env)).status, 403);
  const res = await serve(req("/reports.xlsx?token=secret"), env);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /spreadsheetml\.sheet/);
  assert.match(res.headers.get("content-disposition"), /\.xlsx/);
  const buf = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...buf.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
