/* =====================================================================
   telMAX status monitor - configuration.

   Each service maps to one public HTTP endpoint the monitor probes on a
   schedule. IMPORTANT / HONEST framing: telMAX exposes no internal per-service
   health API, so these probes measure REACHABILITY of telMAX's public
   endpoints from wherever this monitor runs. That is a genuine external signal
   (is the public presence responding, and how fast) but it is NOT the same as
   telMAX's internal network telemetry, which only their NOC can see. Point
   these URLs at real per-service health checks if/when they exist.

   SERVICES + AREAS are exported on their own so the Cloudflare Worker shares
   exactly the same targets (see server/cloudflare/). Env reads are guarded so
   this file also imports cleanly inside a Worker, where `process` is absent.
   ===================================================================== */

const ENV = typeof process !== "undefined" && process.env ? process.env : {};

// Services shown on the board, each with the endpoint to probe.
export const SERVICES = [
  { id: "internet", name: "MAXfibre Internet", note: "Pure fibre network", url: "https://www.telmax.com/internet/" },
  { id: "tv", name: "MAXview TV", note: "Live TV, apps and Cloud-PVR", url: "https://www.telmax.com/tv/" },
  { id: "phone", name: "MAXtalk Home Phone", note: "Calling and voicemail", url: "https://www.telmax.com/home-phone/" },
  { id: "portal", name: "My telMAX", note: "Account portal and billing", url: "https://www.telmax.com/" },
];

// Service areas cannot be probed individually from outside (no per-area
// endpoint), so they track the overall public-presence signal: they are only
// flagged when telMAX is unreachable across the board.
export const AREAS = [
  "Aurora", "Barrie", "Brooklin", "Markham",
  "Newmarket", "Richmond Hill", "Stouffville",
];

export const config = {
  // How often to probe (ms). 60s is a courteous default for an external check.
  intervalMs: Number(ENV.STATUS_INTERVAL_MS) || 60_000,
  // Per-probe timeout (ms). A probe that doesn't answer in time counts as down.
  timeoutMs: Number(ENV.STATUS_TIMEOUT_MS) || 8_000,
  // Responding, but slower than this (ms) => "degraded" instead of operational.
  degradedMs: Number(ENV.STATUS_DEGRADED_MS) || 2_500,
  // Rolling window for uptime history + how far back "Past incidents" reaches.
  windowDays: Number(ENV.STATUS_WINDOW_DAYS) || 90,

  // HTTP server
  port: Number(ENV.PORT) || 8787,
  // CORS origin allowed to read the live endpoint from a browser ("*" for any).
  allowOrigin: ENV.STATUS_ALLOW_ORIGIN || "*",

  // Where to publish the generated board + where to persist monitor state.
  // Paths are resolved relative to the repo root.
  publishFile: ENV.STATUS_PUBLISH_FILE || "public/status.json",
  statePath: ENV.STATUS_STATE_FILE || "server/state.json",

  // Outage reports submitted from /report-outage are appended here (JSONL).
  // Contains personal info - it's git-ignored; back it up/secure it in prod.
  reportsFile: ENV.STATUS_REPORTS_FILE || "server/reports.jsonl",
  // GET /reports is disabled unless this is set; then ?token=... must match.
  reportsToken: ENV.REPORTS_TOKEN || "",

  // First-party "Downdetector" signal built from those reports (counts only).
  reportWindowMinutes: Number(ENV.STATUS_REPORT_WINDOW_MIN) || 60, // rolling window
  reportBucketMinutes: Number(ENV.STATUS_REPORT_BUCKET_MIN) || 5, // sparkline resolution
  reportElevated: Number(ENV.STATUS_REPORT_ELEVATED) || 3, // >= this -> "elevated"
  reportSpike: Number(ENV.STATUS_REPORT_SPIKE) || 6, // >= this -> "spike"

  services: SERVICES,
  areas: AREAS,
};

export default config;
