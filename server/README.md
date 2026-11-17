# telMAX status monitor (backend)

A tiny, dependency-free Node service that turns the Network Status page from a
hand-edited file into a **live, self-updating board**. It probes endpoints on a
schedule, works out each service's status, tracks incidents and 90-day uptime,
and publishes the exact `status.json` shape the page already reads.

```
server/
  monitors.config.mjs   what to probe + all tunables (env-overridable)
  monitor.mjs           probe + classify + incident lifecycle + uptime (pure, tested)
  server.mjs            cycle loop + HTTP endpoints + file publishing
  state.json            runtime state (git-ignored, auto-created)
```

## Run it

```bash
npm run status:server     # long-running: probes every 60s, serves the live API
npm run status:once       # one probe cycle, publish status.json, then exit
```

On start it probes immediately, writes `public/status.json`, and serves:

| Route          | What                                                        |
| -------------- | ---------------------------------------------------------- |
| `GET /status.json`  | The live board (same schema as the static file), CORS-enabled |
| `GET /healthz`      | Monitor health: last cycle, overall status, active incidents  |
| `POST /report`      | Submit an outage report (used by `/report-outage`) → appends to `reports.jsonl` |
| `GET /reports?token=…`      | List submitted reports as JSON (needs `REPORTS_TOKEN`) |
| `GET /reports.xlsx?token=…` | Download **all reports as an Excel workbook** (needs `REPORTS_TOKEN`) |

## Outage reports

Submissions from `/report-outage` are appended to `server/reports.jsonl`
(one JSON record per line; git-ignored — it holds personal info). To review or
export them:

```bash
npm run reports          # print them, newest first
npm run reports:excel     # write server/reports.xlsx (real Excel file)
npm run reports:excel -- --out ~/Desktop/telmax-reports.xlsx
```

Or, while the server is running, download live (set `REPORTS_TOKEN` first):

```bash
REPORTS_TOKEN=secret npm run status:server
# then open in a browser / curl:
open "http://localhost:8787/reports.xlsx?token=secret"
```

The Excel writer (`server/xlsx.mjs`) is dependency-free and produces a real
`.xlsx` (bold frozen header, sized columns, auto-filter). The Cloudflare Worker
serves the same `GET /reports.xlsx?token=…` from KV.

## How the page consumes it

Two modes, both supported with zero code changes:

1. **File mode (default).** The monitor writes `public/status.json` every cycle;
   the page keeps fetching `/status.json`. Works on any static host — just run
   the monitor wherever it can write that file (or commit it from a cron).
2. **Live-endpoint mode.** Point the page straight at the monitor by setting
   `data-status-src` on `#status-app` in `src/pages/status.astro`:

   ```html
   <div id="status-app" class="status-app"
        data-status-src="https://status-api.telmax.com/status.json"></div>
   ```

## Configuration

Everything in `monitors.config.mjs`, each overridable by env var:

| Env | Default | Meaning |
| --- | --- | --- |
| `STATUS_INTERVAL_MS` | `60000` | Time between probe cycles |
| `STATUS_TIMEOUT_MS`  | `8000`  | Per-probe timeout (no answer ⇒ outage) |
| `STATUS_DEGRADED_MS` | `2500`  | Responding slower than this ⇒ *degraded* |
| `STATUS_WINDOW_DAYS` | `90`    | Uptime window + how far "Past incidents" reaches |
| `PORT`               | `8787`  | HTTP port |
| `STATUS_ALLOW_ORIGIN`| `*`     | CORS origin for the live endpoint |
| `STATUS_PUBLISH_FILE`| `public/status.json` | File the board is written to |
| `STATUS_STATE_FILE`  | `server/state.json`  | Where incident/uptime state persists |

### How status is decided (per service, per cycle)

- No response / timeout / HTTP 5xx → **outage**
- Responds but slower than `STATUS_DEGRADED_MS` → **degraded**
- Responds under threshold (incl. 3xx/4xx — the server is reachable) → **operational**

A service leaving *operational* opens an incident; when it recovers, the
incident is timestamped and moved to **Past incidents**. Those incidents drive
the 90-day uptime bars, so history is *measured*, not invented.

## Deploy

- **systemd / PM2 / Docker:** run `node server/server.mjs` as a restart-always
  process; front-end reads the published file or the live endpoint.
- **Cron heartbeat:** `*/1 * * * * cd /app && node server/server.mjs --once`
  (publishes the file each minute; no long-running process).
- **Serverless (Cloudflare Worker + Cron Trigger) — implemented, free:** see
  [`cloudflare/README.md`](./cloudflare/README.md). The Worker reuses this exact
  `monitor.mjs` logic, stores the board in KV, refreshes on a cron, and serves
  `/status.json`. Deploy with `npm run cf:login && npm run cf:kv:create && npm run cf:deploy`.

## Honest scope

telMAX exposes **no** internal per-service health API, so these probes measure
**reachability of telMAX's public endpoints** from wherever the monitor runs —
a real external signal (is it responding, and how fast), but *not* the internal
network telemetry only telMAX's NOC can see. Service **areas** likewise can't be
probed individually and are only flagged when telMAX is unreachable across the
board. Swap the URLs in `monitors.config.mjs` for real per-service/per-area
health checks whenever they become available — nothing else needs to change.
