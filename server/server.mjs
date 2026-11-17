/* =====================================================================
   telMAX status monitor - HTTP service.

   Runs the probe cycle on a schedule and:
     - serves the live board at    GET /status.json   (CORS-enabled)
     - reports its own health at    GET /healthz
     - publishes public/status.json each cycle, so the static site keeps
       working unchanged (the page can read the file OR the live endpoint)

   Run it:
     node server/server.mjs            # long-running monitor + HTTP server
     node server/server.mjs --once     # one probe cycle, publish, then exit
                                        # (ideal for a cron / CI heartbeat)

   Everything is configured in server/monitors.config.mjs (env-overridable).
   ===================================================================== */

import http from "node:http";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { config as defaultConfig } from "./monitors.config.mjs";
import { emptyState, normalizeState, runCycle, buildPublic } from "./monitor.mjs";
import { normalizeReport, summarizeReports } from "./reports.mjs";
import { reportsToXlsx, xlsxFilename } from "./xlsx.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const abs = (p) => (p.startsWith("/") ? p : resolve(ROOT, p));

/** Load persisted monitor state from disk (null if missing/corrupt). */
function loadState(path) {
  try {
    return normalizeState(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
}

/** Persist monitor state to disk so incidents + history survive a restart. */
function saveState(path, state) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
}

/** Build the CORS + JSON request handler. Pulls fresh values via getters so a
    background cycle's updates are always reflected. Exported for tests. */
export function makeHandler({ getCurrent, getHealth, allowOrigin = "*", onReport = null, getReports = null }) {
  const send = (res, status, obj) => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(obj, null, 2) + "\n");
  };
  return (req, res) => {
    res.setHeader("access-control-allow-origin", allowOrigin);
    res.setHeader("cache-control", "no-store");
    const [path, qs = ""] = (req.url || "/").split("?");
    const query = new URLSearchParams(qs);

    if (req.method === "OPTIONS") {
      res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      res.setHeader("access-control-allow-headers", "content-type");
      res.writeHead(204).end();
      return;
    }

    // Submit an outage report.
    if (path === "/report" && req.method === "POST") {
      if (!onReport) return send(res, 501, { ok: false, error: "reports are not enabled" });
      let body = "";
      let aborted = false;
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 32_768 && !aborted) {
          aborted = true;
          send(res, 413, { ok: false, error: "report too large" });
          req.destroy();
        }
      });
      req.on("end", async () => {
        if (aborted) return;
        let input;
        try { input = JSON.parse(body || "{}"); } catch { return send(res, 400, { ok: false, error: "invalid JSON" }); }
        try {
          const result = await onReport(input, { userAgent: req.headers["user-agent"], source: "web" });
          if (!result.ok) return send(res, 422, { ok: false, error: result.error });
          return send(res, 200, { ok: true, id: result.record.id });
        } catch {
          return send(res, 500, { ok: false, error: "could not save your report" });
        }
      });
      req.on("error", () => { if (!aborted) send(res, 400, { ok: false, error: "bad request" }); });
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, { error: "method not allowed" });
    }

    if (path === "/status.json" || path === "/" || path === "/status") return send(res, 200, getCurrent());
    if (path === "/healthz") return send(res, 200, getHealth());
    if (path === "/reports") {
      if (!getReports) return send(res, 501, { error: "reports are not enabled" });
      const reports = getReports(query.get("token"));
      if (reports == null) return send(res, 403, { error: "forbidden - set REPORTS_TOKEN and pass ?token=" });
      return send(res, 200, { count: reports.length, reports });
    }
    // Download all reports as a real Excel workbook.
    if (path === "/reports.xlsx") {
      if (!getReports) return send(res, 501, { error: "reports are not enabled" });
      const reports = getReports(query.get("token"));
      if (reports == null) return send(res, 403, { error: "forbidden - set REPORTS_TOKEN and pass ?token=" });
      res.writeHead(200, {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${xlsxFilename()}"`,
      });
      res.end(Buffer.from(reportsToXlsx(reports)));
      return;
    }
    return send(res, 404, { error: "not found" });
  };
}

/** Wire the monitor loop + HTTP server together. Returns handles for shutdown. */
export function startServer(config = defaultConfig, { listen = true } = {}) {
  const statePath = abs(config.statePath);
  const publishPath = abs(config.publishFile);
  const reportsPath = abs(config.reportsFile);
  let state = loadState(statePath) || emptyState();
  let current = buildPublic(state, config, Date.now());
  let lastCycle = null;
  let lastError = null;

  // Read every stored report (no token) - used for the aggregate signal.
  function readAllReports() {
    try {
      return readFileSync(reportsPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  // The first-party "Downdetector" signal (counts only, no personal info).
  const reportSignal = () =>
    summarizeReports(readAllReports(), {
      windowMinutes: config.reportWindowMinutes,
      bucketMinutes: config.reportBucketMinutes,
      elevated: config.reportElevated,
      spike: config.reportSpike,
      services: config.services,
    });

  // Persist an outage report (one JSON object per line, easy to append + read).
  async function onReport(input, meta) {
    const result = normalizeReport(input, meta);
    if (!result.ok) return result;
    mkdirSync(dirname(reportsPath), { recursive: true });
    appendFileSync(reportsPath, JSON.stringify(result.record) + "\n");
    console.log(`[report] ${result.record.id}  ${result.record.serviceLabel}  ${result.record.name} <${result.record.email}>`);
    // Refresh the live signal immediately so a new report shows without waiting
    // for the next probe cycle.
    current.userReports = reportSignal();
    try { writeFileSync(publishPath, JSON.stringify(current, null, 2) + "\n"); } catch { /* best effort */ }
    return result;
  }

  // Reviewing reports is gated: only works when REPORTS_TOKEN is set + matches.
  function getReports(token) {
    if (!config.reportsToken || token !== config.reportsToken) return null;
    return readAllReports().reverse();
  }

  async function cycle() {
    const now = Date.now();
    try {
      state = await runCycle(state, config, now);
      saveState(statePath, state);
      current = buildPublic(state, config, now);
      current.userReports = reportSignal();
      writeFileSync(publishPath, JSON.stringify(current, null, 2) + "\n");
      lastCycle = new Date(now).toISOString();
      lastError = null;
      logCycle(current);
    } catch (err) {
      lastError = err?.message || String(err);
      console.error("[status] cycle error:", lastError);
    }
  }

  const getCurrent = () => current;
  const getHealth = () => ({
    ok: !lastError,
    lastCycle,
    lastError,
    overall: worstOf(current),
    services: current.services.length,
    activeIncidents: current.incidents.length,
    intervalMs: config.intervalMs,
    pid: process.pid,
  });

  let server = null;
  let timer = null;

  async function start() {
    await cycle(); // publish immediately so the endpoint is never empty
    if (listen) {
      server = http.createServer(makeHandler({ getCurrent, getHealth, allowOrigin: config.allowOrigin, onReport, getReports }));
      await new Promise((r) => server.listen(config.port, r));
      console.log(
        `[status] monitor live on http://localhost:${config.port}` +
          ` (GET /status.json, /healthz, POST /report) - probing ${config.services.length} services every ${config.intervalMs / 1000}s`,
      );
      timer = setInterval(cycle, config.intervalMs);
    }
  }

  async function stop() {
    if (timer) clearInterval(timer);
    if (server) await new Promise((r) => server.close(r));
    saveState(statePath, state);
  }

  return { start, stop, cycle, getCurrent, getHealth };
}

function worstOf(pub) {
  const ORDER = ["operational", "maintenance", "degraded", "outage"];
  let w = "operational";
  pub.services.forEach((s) => { if (ORDER.indexOf(s.status) > ORDER.indexOf(w)) w = s.status; });
  return w;
}

function logCycle(pub) {
  const parts = pub.services.map((s) => {
    const lat = s.latencyMs != null ? ` ${s.latencyMs}ms` : "";
    return `${s.id}=${s.status}${lat}`;
  });
  console.log(`[status] ${pub.updated}  ${worstOf(pub).toUpperCase()}  |  ${parts.join("  ")}  |  incidents:${pub.incidents.length}`);
}

/* ---- CLI entry (only when run directly, not when imported by tests) ---- */
const runDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (runDirect) {
  const once = process.argv.includes("--once");
  const handles = startServer(defaultConfig, { listen: !once });
  await handles.start();
  if (once) {
    await handles.stop();
    process.exit(0);
  }
  const shutdown = async () => { console.log("\n[status] shutting down…"); await handles.stop(); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
