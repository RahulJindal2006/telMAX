/* =====================================================================
   telMAX status monitor - Cloudflare Worker.

   Same probe/incident/uptime logic as the Node monitor (imported from
   ../monitor.mjs), but state lives in Workers KV and the probe cycle runs on a
   Cron Trigger. Everything here fits Cloudflare's FREE tier:
     - Cron Trigger every 5 min  -> 288 runs/day
     - one KV write per run      -> 288 writes/day  (free = 1,000/day)
     - KV reads on page fetch     -> (free = 100,000/day)

   Endpoints:
     GET /status.json  the live board (same schema as the static file), CORS
     GET /healthz       monitor health

   Bindings (wrangler.toml):
     STATUS_KV          KV namespace holding the board
     ALLOW_ORIGIN       (var) CORS origin, defaults to "*"
   ===================================================================== */

import { runCycle, buildPublic, emptyState, normalizeState } from "../monitor.mjs";
import { configFrom } from "./worker.config.mjs";
import { normalizeReport, summarizeReports } from "../reports.mjs";
import { reportsToXlsx, xlsxFilename } from "../xlsx.mjs";

export const KEY = "board";
const ORDER = ["operational", "maintenance", "degraded", "outage"];

const worstOf = (pub) =>
  pub && Array.isArray(pub.services)
    ? pub.services.reduce((w, s) => (ORDER.indexOf(s.status) > ORDER.indexOf(w) ? s.status : w), "operational")
    : "operational";

const json = (obj, headers, status = 200) =>
  new Response(JSON.stringify(obj, null, 2) + "\n", {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

/** Read every stored outage report from KV, newest first. */
export async function collectReports(env) {
  const list = await env.STATUS_KV.list({ prefix: "report:" });
  const reports = [];
  for (const k of list.keys) {
    const v = await env.STATUS_KV.get(k.name);
    if (v) reports.push(JSON.parse(v));
  }
  reports.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return reports;
}

/** Read the persisted board ({ state, public }) from KV. */
export async function loadBoard(env) {
  const raw = await env.STATUS_KV.get(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const reportOpts = (config, now) => ({
  now,
  windowMinutes: config.reportWindowMinutes,
  bucketMinutes: config.reportBucketMinutes,
  elevated: config.reportElevated,
  spike: config.reportSpike,
  services: config.services,
});

/** Run one probe cycle, persist state + published board to KV, return the board. */
export async function cycle(env, { now = Date.now(), probeImpl } = {}) {
  const config = configFrom(env);
  const prev = (await loadBoard(env)) || {};
  const state = await runCycle(normalizeState(prev.state) || emptyState(), config, now, probeImpl);
  const pub = buildPublic(state, config, now);
  pub.userReports = summarizeReports(await collectReports(env), reportOpts(config, now));
  await env.STATUS_KV.put(KEY, JSON.stringify({ state, public: pub, updated: pub.updated }));
  return pub;
}

/** Recompute the first-party "Downdetector" signal and update the stored board.
    Called after a new report so it shows without waiting for the next cron. */
async function refreshUserReports(env) {
  const board = await loadBoard(env);
  if (!board || !board.public) return;
  const config = configFrom(env);
  board.public.userReports = summarizeReports(await collectReports(env), reportOpts(config, Date.now()));
  await env.STATUS_KV.put(KEY, JSON.stringify(board));
}

/** Handle an HTTP request (GET /status.json, /healthz). Exported for tests. */
export async function serve(req, env) {
  const url = new URL(req.url);
  const cors = { "access-control-allow-origin": env.ALLOW_ORIGIN || "*", "cache-control": "no-store" };

  if (req.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: { ...cors, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" },
    });

  // Submit an outage report -> store one KV entry per report (no read-modify-write).
  if (url.pathname === "/report" && req.method === "POST") {
    let input;
    try {
      input = await req.json();
    } catch {
      return json({ ok: false, error: "invalid JSON" }, cors, 400);
    }
    const result = normalizeReport(input, { userAgent: req.headers.get("user-agent"), source: "web" });
    if (!result.ok) return json({ ok: false, error: result.error }, cors, 422);
    await env.STATUS_KV.put("report:" + result.record.id, JSON.stringify(result.record));
    await refreshUserReports(env);
    return json({ ok: true, id: result.record.id }, cors);
  }

  if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "method not allowed" }, cors, 405);

  // Review submitted reports - gated behind REPORTS_TOKEN. Serve JSON or a
  // downloadable Excel workbook.
  if (url.pathname === "/reports" || url.pathname === "/reports.xlsx") {
    const token = url.searchParams.get("token");
    if (!env.REPORTS_TOKEN || token !== env.REPORTS_TOKEN)
      return json({ error: "forbidden - set REPORTS_TOKEN and pass ?token=" }, cors, 403);
    const reports = await collectReports(env);
    if (url.pathname === "/reports.xlsx") {
      return new Response(reportsToXlsx(reports), {
        headers: {
          ...cors,
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="${xlsxFilename()}"`,
        },
      });
    }
    return json({ count: reports.length, reports }, cors);
  }

  if (url.pathname === "/healthz") {
    const board = await loadBoard(env);
    const pub = board?.public;
    return json(
      {
        ok: !!pub,
        lastCycle: pub?.updated || null,
        overall: worstOf(pub),
        services: pub?.services?.length || 0,
        activeIncidents: pub?.incidents?.length || 0,
      },
      cors,
    );
  }

  if (url.pathname === "/status.json" || url.pathname === "/" || url.pathname === "/status") {
    const board = await loadBoard(env);
    // Cold start (before the first cron fires): probe once on demand.
    const pub = board?.public || (await cycle(env));
    return json(pub, cors);
  }

  return json({ error: "not found" }, cors, 404);
}

export default {
  // Cron Trigger -> refresh the board.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cycle(env));
  },
  // HTTP -> serve the board.
  async fetch(req, env) {
    return serve(req, env);
  },
};
