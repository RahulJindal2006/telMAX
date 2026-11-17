/* =====================================================================
   The plans the "Get started" flow offers, grouped by the services the
   visitor switches on.

   Where the prices come from
     internet only   telmax.com/internet, read on 16 November 2026
     bundles         telMAX's shop, captured in July 2026. The shop is an
                     app that could not be re-read in November, so check
                     these against shop.telmax.com before relying on them.
   The flow shows this under the plans (see PRICE_SOURCE below).

   What is inside a plan is not written out here: `tv` and `phone` name a
   package in src/data/catalog.js, so channel counts and calling areas
   are stated once, in one place.
   ===================================================================== */

import { CONCEPT } from "./site.js";

/* The communities telMAX serves live in site.js; this name is kept for
   anything that already imports it from here. */
export { AREAS as SERVICED_CITIES } from "./site.js";

/* Plans by the combination of services picked.
     speed   as telMAX's shop names it; a 500 Mbps plan can step up in step 3
     mbps    the same speed as a number, the same down and up
     tv      a TV.packages id in catalog.js
     phone   a PHONE.plans id in catalog.js */
export const PLANS = {
  internet: [
    { id: "i500", name: "MAXfibre 500 Mbps", price: 79.95, speed: "500 Mbps", mbps: 500 },
    { id: "i2000", name: "MAXfibre 2.0 Gbps", price: 89.95, speed: "2.0 Gbps", mbps: 2000, popular: true },
    { id: "i4000", name: "MAXfibre 4.0 Gbps", price: 119.95, speed: "4.0 Gbps", mbps: 4000, eeroPro: true },
  ],

  "internet+tv": [
    {
      id: "tv-basic",
      name: "MAXfibre 2.0 Gbps & MAXview Basic TV",
      price: 119.95,
      speed: "2.0 Gbps",
      mbps: 2000,
      tv: "basic",
    },
    {
      id: "tv-ess",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials TV",
      price: 129.95,
      speed: "2.0 Gbps",
      mbps: 2000,
      tv: "essentials",
    },
    {
      id: "tv-essplus",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials+ TV",
      price: 139.95,
      speed: "2.0 Gbps",
      mbps: 2000,
      tv: "essentials-plus",
      popular: true,
    },
  ],

  "internet+phone": [
    {
      id: "ph-talk",
      name: "MAXfibre 500 Mbps & MAXtalk",
      price: 109.9,
      speed: "500 Mbps",
      mbps: 500,
      phone: "talk",
    },
    {
      id: "ph-talkplus",
      name: "MAXfibre 500 Mbps & MAXtalk Plus",
      price: 114.9,
      speed: "500 Mbps",
      mbps: 500,
      phone: "talk-plus",
    },
    {
      id: "ph-2g",
      name: "MAXfibre 2.0 Gbps & MAXtalk Plus",
      price: 124.9,
      speed: "2.0 Gbps",
      mbps: 2000,
      phone: "talk-plus",
      popular: true,
    },
  ],

  "internet+tv+phone": [
    {
      id: "all-basic",
      name: "MAXfibre 2.0 Gbps & MAXview Basic TV & MAXtalk Plus",
      price: 129.95,
      speed: "2.0 Gbps",
      mbps: 2000,
      tv: "basic",
      phone: "talk-plus",
    },
    {
      id: "all-ess",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials TV & MAXtalk Plus",
      price: 139.95,
      speed: "2.0 Gbps",
      mbps: 2000,
      tv: "essentials",
      phone: "talk-plus",
      popular: true,
    },
    {
      id: "all-essplus",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials+ TV & MAXtalk Plus",
      price: 149.95,
      speed: "2.0 Gbps",
      mbps: 2000,
      tv: "essentials-plus",
      phone: "talk-plus",
    },
  ],
};

/* One sentence on where each group's prices were read, shown under the plans. */
export const PRICE_SOURCE = {
  internet: `Prices as listed on telmax.com on ${CONCEPT.factsChecked}, for new customers on a 12-month term.`,
  bundle:
    "Bundle prices as shown in telMAX's shop in July 2026, on a 12-month term. Check shop.telmax.com for today's.",
};
