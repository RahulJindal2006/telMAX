/* =====================================================================
   Outage report - shared, dependency-free logic used by BOTH the Node
   server (persists to server/reports.jsonl) and the Cloudflare Worker
   (persists to KV). Keeping the field options + validation here means the
   form, the Node API and the Worker API can never drift apart.
   ===================================================================== */

// The affected-service dropdown. `value` is stored; `label` is shown. The
// get-started page imports these so the form options always match validation.
export const SERVICE_OPTIONS = [
  { value: "internet", label: "MAXfibre Internet" },
  { value: "tv", label: "MAXview TV" },
  { value: "phone", label: "MAXtalk Home Phone" },
  { value: "portal", label: "My telMAX (account / portal)" },
  { value: "multiple", label: "Multiple services / not sure" },
];

// "How long has this been happening?" dropdown.
export const DURATION_OPTIONS = [
  { value: "lt1h", label: "Just started - within the last hour" },
  { value: "hours", label: "A few hours" },
  { value: "since-yesterday", label: "Since yesterday" },
  { value: "days", label: "A couple of days" },
  { value: "week", label: "About a week" },
  { value: "gt1w", label: "More than a week" },
];

const mapOf = (opts) => Object.fromEntries(opts.map((o) => [o.value, o.label]));
export const SERVICE_LABELS = mapOf(SERVICE_OPTIONS);
export const DURATION_LABELS = mapOf(DURATION_OPTIONS);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

/** Short, human-friendly reference id, e.g. R-20260714-8F3K2Q. */
export function makeReportId(now = new Date()) {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `R-${day}-${rand}`;
}

/**
 * Validate + normalise an incoming outage report.
 * @returns {{ ok: true, record: object } | { ok: false, error: string }}
 */
export function normalizeReport(input = {}, meta = {}) {
  const name = clip(input.name, 120);
  const email = clip(input.email, 200);
  const phone = clip(input.phone, 40);
  const address = clip(input.address, 240);
  const service = clip(input.service, 40);
  const description = clip(input.description, 4000);
  const duration = clip(input.duration, 40);

  if (!name) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!address) return { ok: false, error: "Please enter your service address." };
  if (!SERVICE_LABELS[service]) return { ok: false, error: "Please choose which service is affected." };
  if (description.length < 5) return { ok: false, error: "Please describe the issue (a few words is fine)." };
  if (!DURATION_LABELS[duration]) return { ok: false, error: "Please choose how long this has been happening." };

  const now = meta.now instanceof Date ? meta.now : new Date();
  const record = {
    id: makeReportId(now),
    receivedAt: now.toISOString(),
    status: "new",
    name,
    email,
    phone: phone || null,
    address,
    service,
    serviceLabel: SERVICE_LABELS[service],
    duration,
    durationLabel: DURATION_LABELS[duration],
    description,
    source: clip(meta.source, 40) || "web",
    userAgent: clip(meta.userAgent, 300) || null,
  };
  return { ok: true, record };
}

/* ---- "Build your own Downdetector" -----------------------------------
   Aggregate recent report submissions into a live, first-party signal of how
   many customers are reporting problems - like Downdetector, but from our own
   form. Deliberately PII-FREE: the output is only counts, buckets and levels,
   never names/emails/descriptions, so it is safe to publish on the board. */

const LEVEL_RANK = { none: 0, elevated: 1, spike: 2 };

export function summarizeReports(reports = [], opts = {}) {
  const now = typeof opts.now === "number" ? opts.now : Date.now();
  const windowMinutes = opts.windowMinutes > 0 ? opts.windowMinutes : 60;
  const bucketMinutes = opts.bucketMinutes > 0 ? opts.bucketMinutes : 5;
  const elevated = opts.elevated > 0 ? opts.elevated : 3;
  const spike = opts.spike > 0 ? opts.spike : 6;
  const services = Array.isArray(opts.services) ? opts.services : [];

  const windowMs = windowMinutes * 60000;
  const start = now - windowMs;
  const nBuckets = Math.max(1, Math.round(windowMinutes / bucketMinutes));
  const bucketMs = windowMs / nBuckets;

  const inWindow = (Array.isArray(reports) ? reports : []).filter((r) => {
    const t = Date.parse(r && r.receivedAt);
    return Number.isFinite(t) && t >= start && t <= now;
  });

  const buckets = new Array(nBuckets).fill(0);
  for (const r of inWindow) {
    const t = Date.parse(r.receivedAt);
    let i = Math.floor((t - start) / bucketMs);
    if (i < 0) i = 0;
    if (i >= nBuckets) i = nBuckets - 1;
    buckets[i] += 1;
  }

  const levelOf = (c) => (c >= spike ? "spike" : c >= elevated ? "elevated" : "none");

  const perService = services.map((s) => {
    const count = inWindow.filter((r) => r.service === s.id).length;
    return { id: s.id, name: s.name, count, level: levelOf(count) };
  });

  const total = inWindow.length;
  let level = levelOf(total);
  for (const p of perService) if (LEVEL_RANK[p.level] > LEVEL_RANK[level]) level = p.level;

  return {
    windowMinutes,
    bucketMinutes,
    total,
    level,
    buckets,
    services: perService,
    updated: new Date(now).toISOString(),
  };
}
