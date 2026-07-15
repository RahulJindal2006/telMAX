/* =====================================================================
   telMAX status monitor - core logic (framework-free, no dependencies).

   Pure-ish functions so the whole pipeline is unit-testable:
     probe()       - hit one endpoint, measure latency, classify the result
     runCycle()    - probe every service, update incidents + uptime history
     buildPublic() - render monitor state into the status.json the page reads
     load/saveState- persist state so incidents + history survive a restart

   Status severity order (worst wins):
     operational < maintenance < degraded < outage

   This module is intentionally free of Node built-ins so the exact same logic
   runs in a Cloudflare Worker. File persistence lives in server.mjs.
   ===================================================================== */

export const ORDER = ["operational", "maintenance", "degraded", "outage"];

/** Return the more severe of two statuses. Unknown values are treated as operational. */
export function worse(a, b) {
  const ia = Math.max(0, ORDER.indexOf(a));
  const ib = Math.max(0, ORDER.indexOf(b));
  return ORDER[Math.max(ia, ib)];
}

/** Map an HTTP result to a status. 4xx still means "server reachable" (a
    reachability probe), so only 5xx / no-response / slow are downgrades. */
export function classify(httpStatus, latencyMs, config) {
  if (!httpStatus || httpStatus >= 500) return "outage";
  if (latencyMs >= config.degradedMs) return "degraded";
  return "operational";
}

/** Probe a single service endpoint. Never throws - failures become "outage". */
export async function probe(service, config) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetch(service.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "telMAX-status-monitor/1.0 (+network status health check)" },
    });
    const latencyMs = Math.round(performance.now() - start);
    // Don't download the whole page - we only need the response line.
    try { await res.body?.cancel(); } catch { /* body may be empty */ }
    return {
      status: classify(res.status, latencyMs, config),
      httpStatus: res.status,
      latencyMs,
      error: null,
    };
  } catch (err) {
    return {
      status: "outage",
      httpStatus: 0,
      latencyMs: Math.round(performance.now() - start),
      error: err?.name === "AbortError" ? "timeout" : err?.code || err?.message || "network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ---- State ---------------------------------------------------------- */

export function emptyState() {
  return { latest: {}, daily: {}, open: {}, history: [], lastCycle: null };
}

/** Normalise a parsed state blob (from a file or KV) into a full state object. */
export function normalizeState(s) {
  if (!s || typeof s !== "object") return emptyState();
  return {
    latest: s.latest || {},
    daily: s.daily || {},
    open: s.open || {},
    history: Array.isArray(s.history) ? s.history : [],
    lastCycle: s.lastCycle || null,
  };
}

/* ---- Helpers -------------------------------------------------------- */

const dayKeyOf = (ms) => new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
const titleFor = (service, status) =>
  status === "outage" ? `${service.name} is unreachable` : `${service.name} degraded performance`;
const bodyFor = (service, result) => {
  if (result.error) return `Automated monitor could not reach ${service.name} (${result.error}).`;
  if (result.status === "degraded")
    return `Automated monitor: ${service.name} endpoint is responding slowly (${result.latencyMs} ms, HTTP ${result.httpStatus}).`;
  return `Automated monitor recorded a status change for ${service.name}.`;
};

function pruneWindow(state, config, nowMs) {
  const cutoff = dayKeyOf(nowMs - config.windowDays * 86_400_000);
  // Daily uptime buckets
  for (const id of Object.keys(state.daily)) {
    for (const k of Object.keys(state.daily[id])) {
      if (k < cutoff) delete state.daily[id][k];
    }
  }
  // Resolved incidents older than the window (keep at most 100)
  state.history = state.history
    .filter((h) => (h.resolved || h.started || "").slice(0, 10) >= cutoff)
    .slice(0, 100);
}

/**
 * Probe every service once and fold the results into `state`:
 *  - record the latest result + a per-day worst-status bucket (uptime history)
 *  - open an incident when a service leaves "operational", update it while it
 *    stays down, and close it (into history) when it recovers.
 * `probeImpl` is injectable so tests can drive it without a network.
 */
export async function runCycle(state, config, nowMs = Date.now(), probeImpl = probe) {
  const nowISO = new Date(nowMs).toISOString();
  const dayKey = dayKeyOf(nowMs);

  const results = await Promise.all(config.services.map((s) => probeImpl(s, config)));

  config.services.forEach((service, i) => {
    const r = results[i];
    state.latest[service.id] = {
      status: r.status,
      httpStatus: r.httpStatus,
      latencyMs: r.latencyMs,
      error: r.error,
      at: nowISO,
    };

    // Per-day worst status -> drives the uptime percentage.
    state.daily[service.id] = state.daily[service.id] || {};
    state.daily[service.id][dayKey] = worse(state.daily[service.id][dayKey] || "operational", r.status);

    // Incident lifecycle.
    const open = state.open[service.id];
    if (r.status !== "operational") {
      if (open) {
        open.status = worse(open.status, r.status);
        open.title = titleFor(service, open.status);
        open.body = bodyFor(service, r);
        open.time = nowISO;
      } else {
        state.open[service.id] = {
          id: `${service.id}-${nowMs}`,
          serviceId: service.id,
          title: titleFor(service, r.status),
          status: r.status,
          body: bodyFor(service, r),
          started: nowISO,
          time: nowISO,
          services: [service.id],
        };
      }
    } else if (open) {
      open.resolved = nowISO;
      open.time = nowISO;
      state.history.unshift(open);
      delete state.open[service.id];
    }
  });

  pruneWindow(state, config, nowMs);
  state.lastCycle = nowISO;
  return state;
}

/** Uptime % for one service over the window, from observed daily buckets.
    Days we never observed are assumed operational (no incident recorded). */
export function uptimePct(state, serviceId, config) {
  const buckets = state.daily[serviceId] || {};
  let down = 0;
  for (const k of Object.keys(buckets)) if (buckets[k] !== "operational") down += 1;
  return ((config.windowDays - down) / config.windowDays) * 100;
}

/** Render monitor state into the exact status.json shape the page consumes. */
export function buildPublic(state, config, nowMs = Date.now()) {
  const services = config.services.map((s) => ({
    id: s.id,
    name: s.name,
    note: s.note,
    status: state.latest[s.id]?.status || "operational",
    latencyMs: state.latest[s.id]?.latencyMs ?? null,
    uptimePct: Number(uptimePct(state, s.id, config).toFixed(3)),
  }));

  // Areas can't be probed individually - flag them only if telMAX is
  // unreachable across every service (public presence fully down).
  const allOutage = services.length > 0 && services.every((s) => s.status === "outage");
  const areas = config.areas.map((name) => ({ name, status: allOutage ? "outage" : "operational" }));

  const incidents = Object.values(state.open)
    .sort((a, b) => (a.started < b.started ? 1 : -1))
    .map((o) => ({ title: o.title, status: o.status, body: o.body, time: o.time, started: o.started, services: o.services }));

  const cutoff = dayKeyOf(nowMs - config.windowDays * 86_400_000);
  const history = state.history
    .filter((h) => (h.resolved || h.started || "").slice(0, 10) >= cutoff)
    .slice(0, 50)
    .map((h) => ({ title: h.title, status: h.status, body: h.body, started: h.started, resolved: h.resolved, services: h.services }));

  return {
    _note: "Machine-generated by the telMAX status monitor (server/). Do not hand-edit while the monitor is running; it is overwritten every cycle.",
    generated_by: "telmax-status-monitor",
    updated: new Date(nowMs).toISOString(),
    window_days: config.windowDays,
    services,
    areas,
    incidents,
    history,
  };
}
