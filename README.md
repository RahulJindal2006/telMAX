# telMAX website: a concept redesign

A redesign proposal for [telmax.com](https://www.telmax.com/), built with
[Astro](https://astro.build). It is **not** telMAX's website. Every page says
so in a bar at the top, and the page `/about-this-concept` lists what on the
site is real, what is simulated and what going live would take.

`REDESIGN-NOTES.md` lists what the November 2026 redesign changed, what it
removed and what was measured.

## Run it

```sh
npm install      # first time only
npm run dev      # the site at http://localhost:4321, reloading as you edit
npm run build    # the finished site, into ./dist
npm run preview  # look at ./dist the way a host would serve it
npm test         # every automated test (seven suites)
```

Needs Node 22.12 or newer.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/data/site.js` | Phone numbers, emails, links to telMAX's own pages, the communities served, and the concept switch |
| `src/data/catalog.js` | Every plan, price, speed and channel count, each with the telmax.com page it was read from |
| `src/data/plans.js` | The plans the order flow offers, by mix of services |
| `src/data/support.js` | The help articles (question, answer, search keywords) |
| `src/styles/global.css` | Colours, type, spacing and the shared parts (buttons, forms, notes) |
| `src/components/` | Header, footer, concept bar, address check, plan ladder, upload tool, assistant |
| `src/pages/` | One file per address: `index.astro` is `/`, `internet.astro` is `/internet`, and so on |
| `src/scripts/` | `address.js` (address lookup), `signup.js` (order flow), `chatbot.mjs` (assistant), `support-search.js` (help search), `upload.js` (upload times) |
| `src/assets/` | Photographs (resized and re-encoded at build time) and the two font files |
| `public/` | Files served as they are: icons, logos, badges, `status.json` |
| `server/` | The network status monitor and outage-report backend. It has its own `README.md` |
| `test/` | The tests `npm test` runs |

## Change something

- **A price, a speed, a channel count:** `src/data/catalog.js`. Every page
  that shows it follows. The order flow's plans are in `src/data/plans.js`.
- **A phone number, an email or a link to telMAX:** `src/data/site.js`.
- **A help article:** `src/data/support.js`. The support page and the
  assistant both read it. `npm test` checks that everyday questions still
  find the right article.
- **Colours and type:** the tokens at the top of `src/styles/global.css`.
- **The fonts:** see `src/assets/fonts/README.md`.
- **Navigation:** the `nav` list in `src/components/Header.astro` and the
  `groups` list in `src/components/Footer.astro`.
- **A new page:** add an `.astro` file to `src/pages/`. Its name is its address.

## The concept switch

`CONCEPT.on` in `src/data/site.js` is `true`. While it is, the site:

- shows the bar at the top of every page and the mauve notes beside
  anything simulated,
- asks search engines not to index it,
- sends no form anywhere, and says so,
- has no sign-in box: "My telMAX" goes to telMAX's own portal.

Leave it on for as long as this runs anywhere but telMAX's own domain. It is
there so that nobody mistakes the concept for the real site. The comment
above it in `site.js` says when it may be turned off.

## What is checked and what is not

Facts were checked against telmax.com on 16 November 2026.

- **Checked:** internet, TV and home phone plans and prices, the network
  fee, the current offer, eero coverage, business services, service areas,
  contact details, awards and news.
- **Not checkable from outside:** bundle prices in the order flow (seen in
  telMAX's shop in July 2026 and labelled that way), and the wording of
  telMAX's own help answers, which its support page does not show to a
  page reader. Nothing the public site does not state (an installation
  fee, an extender price, a phone extension) is stated here.

## Two optional settings

Set these as environment variables when building (on Vercel: Project,
Settings, Environment Variables), then rebuild.

| Name | What it does |
| --- | --- |
| `PUBLIC_STATUS_SRC` | Address of a live `status.json` from the monitor. Without it the status page reads `public/status.json` and labels the board "Sample" when that file is more than 15 minutes old |
| `PUBLIC_REPORT_ENDPOINT` | Address that receives outage reports. Without it the form checks the entries and sends nothing |

## Hosting

Any static host works. On Vercel, import the repository and keep the Astro
preset (build command `npm run build`, output folder `dist`). Every push to
the main branch rebuilds the site.

Addresses the earlier version had (`/careers`, `/privacy`, `/terms`,
`/accessibility`, `/forgot-password`) forward to telMAX's own page for the
same thing. They are listed in `astro.config.mjs`.

## Credits

- Photographs, logos, icons and badges are telMAX's, taken from telmax.com.
- Figtree and Fraunces are open fonts (SIL Open Font License), used as
  stand-ins for telMAX's licensed Proxima Nova and Quincy CF.
- Address suggestions come from [Photon](https://photon.komoot.io/), built
  on data © OpenStreetMap contributors.
