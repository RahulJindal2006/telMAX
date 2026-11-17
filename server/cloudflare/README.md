# telMAX status monitor on Cloudflare (free)

Run the status monitor entirely on Cloudflare's **free** tier: a Worker probes
telMAX on a **Cron Trigger**, stores the board in **Workers KV**, and serves it
at a public URL. No always-on server, no cost.

```
server/cloudflare/
  worker.mjs         Worker: scheduled() cron cycle + fetch() endpoints
  worker.config.mjs  shares SERVICES/AREAS with the Node monitor
  wrangler.toml      Worker + cron + KV config
```

It reuses the exact same tested logic as the Node monitor (`server/monitor.mjs`),
so the board looks and behaves identically.

## Why it's free

| Resource        | This setup           | Free limit        |
| --------------- | -------------------- | ----------------- |
| Cron runs       | every 5 min = 288/day | Cron Triggers are free |
| KV writes       | 1 per run = 288/day  | 1,000/day         |
| KV reads        | 1 per page fetch     | 100,000/day       |
| Worker requests | cron + page fetches  | 100,000/day       |

(1-minute cron would be 1,440 KV writes/day and needs a paid plan — 5 min stays free.)

## Deploy (one-time, ~5 minutes)

You need a free Cloudflare account. These steps run `wrangler`, Cloudflare's CLI,
via `npx` (nothing to install globally).

```bash
# 1. Log in (opens your browser to authorise your Cloudflare account)
npm run cf:login

# 2. Create the KV namespace, then paste the printed id into
#    server/cloudflare/wrangler.toml  ->  kv_namespaces[0].id
npm run cf:kv:create

# 3. Deploy the Worker
npm run cf:deploy
```

`wrangler deploy` prints your Worker URL, e.g.
`https://telmax-status.<your-subdomain>.workers.dev`. Open
`…/status.json` — the first visit probes on demand; after that the cron keeps it
fresh every 5 minutes. `npm run cf:tail` streams live logs.

> The login + deploy are the only steps that need **your** Cloudflare account —
> they can't be done for you, but that's the whole manual part.

## Point the website at it

Build the site with the Worker URL and the status page streams live:

```bash
PUBLIC_STATUS_SRC="https://telmax-status.<your-subdomain>.workers.dev/status.json" npm run build
```

Leave `PUBLIC_STATUS_SRC` unset and the page falls back to the static
`public/status.json` — nothing breaks either way. For production, also set
`ALLOW_ORIGIN` in `wrangler.toml` to your site's origin instead of `*`.

## Local dry run (optional)

```bash
npm run cf:dev      # runs the Worker locally with a simulated scheduler
```

Then hit `http://localhost:8787/status.json` and `/healthz`, or trigger the cron
from wrangler's dev console.

## Honest scope

Same as the Node monitor: these probes measure **reachability of telMAX's public
endpoints**, not internal NOC telemetry. Service areas are only flagged when
telMAX is unreachable across the board. Swap the URLs in
`server/monitors.config.mjs` for real health checks whenever they exist —
the Worker picks them up automatically.
