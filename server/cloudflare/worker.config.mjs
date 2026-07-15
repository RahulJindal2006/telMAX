/* Worker configuration - reuses the same SERVICES/AREAS as the Node monitor so
   the two can never drift, and reads tunables from the Worker's runtime `env`
   (set as vars in wrangler.toml or the Cloudflare dashboard). */

import { SERVICES, AREAS } from "../monitors.config.mjs";

const num = (v, d) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : d;
};

export function configFrom(env = {}) {
  return {
    timeoutMs: num(env.STATUS_TIMEOUT_MS, 8000),
    degradedMs: num(env.STATUS_DEGRADED_MS, 2500),
    windowDays: num(env.STATUS_WINDOW_DAYS, 90),
    // First-party "Downdetector" signal tunables.
    reportWindowMinutes: num(env.STATUS_REPORT_WINDOW_MIN, 60),
    reportBucketMinutes: num(env.STATUS_REPORT_BUCKET_MIN, 5),
    reportElevated: num(env.STATUS_REPORT_ELEVATED, 3),
    reportSpike: num(env.STATUS_REPORT_SPIKE, 6),
    services: SERVICES,
    areas: AREAS,
  };
}
