/* =====================================================================
   Plan catalogue + service-area data for the "Get started" wizard.
   ===================================================================== */

export const SERVICED_CITIES = [
  "Aurora",
  "Barrie",
  "Brooklin",
  "Markham",
  "Newmarket",
  "Richmond Hill",
  "Stouffville",
];

const TV_LINE =
  "All TV plans include the iOS/Android app, TV Everywhere, Restart & Lookback, 50 hours of recording and more";

/* Plans grouped by the service combination the customer picks.
   `speed` drives the step-3 internet upgrade offer. */
export const PLANS = {
  internet: [
    {
      id: "i500",
      name: "MAXfibre 500 Mbps",
      price: 79.95,
      speed: "500 Mbps",
      features: [
        "Download & upload speeds up to 500 Mbps",
        "Suitable for moderate users",
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
    {
      id: "i2000",
      name: "MAXfibre 2.0 Gbps",
      price: 89.95,
      speed: "2.0 Gbps",
      popular: true,
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
  ],

  "internet+tv": [
    {
      id: "tv-basic",
      name: "MAXfibre 2.0 Gbps & MAXview Basic TV",
      price: 119.95,
      speed: "2.0 Gbps",
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "Over 35 channels included - CTV News, CP24, TSN, Sportsnet & much more",
        TV_LINE,
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
    {
      id: "tv-ess",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials TV",
      price: 129.95,
      speed: "2.0 Gbps",
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "Over 55 channels included - CTV Drama, Home, Flavor & much more",
        TV_LINE,
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
    {
      id: "tv-essplus",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials+ TV",
      price: 139.95,
      speed: "2.0 Gbps",
      popular: true,
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "Over 85 channels included - CNN, CTV Drama, NFL Network & much more",
        TV_LINE,
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
  ],

  "internet+phone": [
    {
      id: "ph-talk",
      name: "MAXfibre 500 Mbps & MAXtalk",
      price: 109.9,
      speed: "500 Mbps",
      features: [
        "Download & upload speeds up to 500 Mbps",
        "Suitable for moderate users",
        "MAXtalk - unlimited nationwide calling across Canada",
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
    {
      id: "ph-talkplus",
      name: "MAXfibre 500 Mbps & MAXtalk Plus",
      price: 114.9,
      speed: "500 Mbps",
      features: [
        "Download & upload speeds up to 500 Mbps",
        "Suitable for moderate users",
        "MAXtalk Plus - unlimited nationwide calling across Canada and the U.S.",
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
    {
      id: "ph-2g",
      name: "MAXfibre 2.0 Gbps & MAXtalk Plus",
      price: 124.9,
      speed: "2.0 Gbps",
      popular: true,
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "MAXtalk Plus - unlimited nationwide calling across Canada and the U.S.",
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
  ],

  "internet+tv+phone": [
    {
      id: "all-basic",
      name: "MAXfibre 2.0 Gbps & MAXview Basic TV & MAXtalk Plus",
      price: 129.95,
      speed: "2.0 Gbps",
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "Over 35 channels included - TSN, Sportsnet, CTV News & much more",
        "MAXtalk Plus - unlimited nationwide calling across Canada and the U.S.",
        TV_LINE,
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
    {
      id: "all-ess",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials TV & MAXtalk Plus",
      price: 139.95,
      speed: "2.0 Gbps",
      popular: true,
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "Over 55 channels included - CTV Drama, Home, Flavor & more",
        "MAXtalk Plus - unlimited nationwide calling across Canada and the U.S.",
        TV_LINE,
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
    {
      id: "all-essplus",
      name: "MAXfibre 2.0 Gbps & MAXview Essentials+ TV & MAXtalk Plus",
      price: 149.95,
      speed: "2.0 Gbps",
      features: [
        "Download & upload speeds up to 2.0 Gbps",
        "Suitable for heavy users",
        "Over 85 channels included - CNN, CTV Drama, NFL Network & much more",
        "MAXtalk Plus - unlimited nationwide calling across Canada and the U.S.",
        TV_LINE,
        "1-year contract term",
        "eero router rental included",
        "Installation fee waived ($200 value)",
      ],
    },
  ],
};
