# Redesign notes

What changed in the November 2026 redesign of this concept site, and why.
Facts were checked against telmax.com on 16 November 2026.

## The short version

- Every page was redesigned on one system: telMAX's own green, cream and
  lime, two typefaces, hairline rows instead of cards, one lime button per
  screen, and nothing that moves unless you move it.
- Six things were added: an address check on the first screen, a plan
  ladder that shows the price with the network fee, an upload-time tool, a
  rebuilt five-step order flow, a search-first support centre with a better
  search, and an assistant that answers from the help articles.
- Every fact on the site now matches telmax.com or says where it came from.
  Anything that could not be confirmed was taken out.
- The site says plainly that it is a concept. See `/about-this-concept`.

## Facts corrected

| Where | It said | It says now | Why |
| --- | --- | --- | --- |
| Internet plans | MAXfibre 4.0 at $164.95, "MAXfibre 8.0" at $249.95 | MAXfibre 4.0 at $119.95, MAXfibre ADVANCED (up to 8 Gbps) from $164.95 | telmax.com/internet |
| Home page offer | "Spring Offer" | "Black Friday Month: up to 70% off pure fibre internet" | The offer on telmax.com now. It is one entry (`PROMO`) in `src/data/catalog.js`; set it to `null` when it ends |
| Prices everywhere | The plan price alone | The plan price, and beside it the price with the $4 network access fee | telmax.com lists the fee for all new customers |
| Help article: speed tests | "about every two weeks" | "every two days" | telmax.com/support |
| Help article: TV box | "Netflix is not available" on the box, extra boxes "$8/month" | Netflix, Prime Video and YouTube sit beside live TV; no price | telmax.com/tv-and-streaming. The price is not published |
| Help article: extenders | "$8/month each" | Coverage by number of extenders; no price | telmax.com/internet gives coverage, not a price |
| Help article: technical support | A 905 number and "ext. 2" | 1-844-483-5629 and support@telmax.com | The one number telmax.com lists |
| "Not shared with the whole neighbourhood" | On the home, internet and about pages | "telMAX built and owns its pure fibre network from end to end" | telmax.com does not make the first claim |

## Removed because it could not be confirmed

- **Three customer quotes** on the home page. They are not the reviews on
  telmax.com. The site has no reviews section until real wording is supplied.
- **"99.95% network uptime."** telmax.com's business page says "greater than
  99.99%", which the business page here now quotes.
- **Three job openings** on a careers page. Careers now links to telMAX's
  own careers site.
- **Privacy, terms and accessibility pages** written from a template. The
  footer links to telMAX's own.
- **"Support hours: 7 days a week"** and **"reply within one business day."**
- **"Installation fee waived ($200 value)"** and **"Autopay required"** in the
  order flow. The bill now says installation is confirmed by telMAX.
- **The Honda Indy partner logo.**
- **The sign-in box and "forgot password" page.** A password for a telMAX
  account should only be typed on telMAX's own portal, so "My telMAX" goes
  there.
- **The newsletter sign-up** and the **contact form**, which had nowhere to
  send what was typed.

## Things that were broken

- "Try another address" in the order flow did nothing. It works.
- "Start referring" was dark text on a dark button. The page is rebuilt.
- The browser tab showed Astro's logo, not the site's.
- The status page labelled a file from July as "Live". It now says "Sample"
  whenever the file is more than 15 minutes old, and "Live" when it is fresh.
- The assistant took a name, an email, a phone number and an account number,
  then said the request "has been logged". Nothing was logged. It now asks
  for nothing and answers from the help articles.
- Help search matched pieces of words: "move" found "removed", and
  "subscription" matched "script". It now matches whole words, treats
  "reset", "restart" and "reboot" as one, and weighs rare words above common
  ones.
- Toggling a service or an extender in the order flow dropped keyboard
  focus, so the next Tab started from the top of the page. Focus now stays
  where it was.

## Measured

On a local build, 16 November 2026.

| Check | Result |
| --- | --- |
| Automated tests | 129 pass, in seven suites (`npm test`) |
| Accessibility (axe-core, WCAG 2.1 A and AA) | 0 issues on 15 pages and 12 interactive states, at desktop and phone width |
| Keyboard | Every stop on every page is visible, named and shows focus |
| Links | 42 internal links and anchors, none broken |
| Sideways scrolling | None at 1440, 1216, 820 and 390 pixels wide |
| Lighthouse, phone, home page (median of 3) | Performance 99, Accessibility 100, Best practices 100. Largest paint 2.0 s, layout shift 0, 139 KB |
| The same test on the earlier home page | Performance 96, Accessibility 98. Largest paint 2.7 s, 371 KB, not counting its Google Fonts, which could not load in the test |

Lighthouse's SEO score reads 63 on purpose: the site asks not to be indexed
while it is a concept, and that one check is the difference.

Lab numbers from one machine are a guide, not a promise. To compare the two
live sites, run both addresses through pagespeed.web.dev.

## Not done, and why

- **Bundle prices are from July.** telMAX's shop is an app that could not be
  read in November. The flow labels them and points to shop.telmax.com.
- **The address check is by community, not by street.** Only telMAX's own
  serviceability records can answer for a single address.
- **The help answers are this concept's own.** telMAX's support page does
  not show its answers to a page reader, so they could not be compared.
- **No reviews.** Real ones need telMAX's permission and exact wording.
- **telmax.com could not be looked at, only read.** Its text and structure
  were read; its layout was not seen. The visual comparison is with the
  earlier version of this site.
