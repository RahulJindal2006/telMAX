/* =====================================================================
   What telMAX sells, as this site states it.

   Every figure here was read from the telmax.com page named beside it
   on 16 November 2026. Change a price or a plan here and every page
   that shows it follows. Nothing on the site should state a price, a
   speed or a channel count that is not in this file.
   ===================================================================== */

/* Charges that sit on top of a plan's price. */
export const FEES = {
  networkAccess: 4, // dollars a month, new customers (telmax.com/internet, fine print)
  hst: 0.13, // Ontario harmonized sales tax
};

/* The offer running on telmax.com right now. Set to null when it ends.
   Source: telmax.com and telmax.com/max-deals */
export const PROMO = {
  name: "Black Friday Month",
  line: "Up to 70% off pure fibre internet",
  extras: "eero Secure is included, and one eero extender is free for 6 months.",
};

/* ---------------------------------------------------------------------
   Internet. Source: telmax.com/internet
   `mbps` is the plan's top speed in megabits a second, the same up and down.
   --------------------------------------------------------------------- */
export const INTERNET = {
  topSpeed: "8 Gbps",
  plans: [
    {
      id: "500",
      name: "MAXfibre 500",
      speed: "500 Mbps",
      mbps: 500,
      price: 79.95,
      fit: "Everyday use in a connected home",
    },
    {
      id: "2000",
      name: "MAXfibre 2.0",
      speed: "2 Gbps",
      mbps: 2000,
      price: 89.95,
      popular: true,
      fit: "Busy homes with many devices",
    },
    {
      id: "4000",
      name: "MAXfibre 4.0",
      speed: "4 Gbps",
      mbps: 4000,
      price: 119.95,
      fit: "Power users",
      extra: "Comes with eero Pro 7, a WiFi 7 system", // the spaces before each 7 do not break
    },
    {
      id: "8000",
      name: "MAXfibre ADVANCED",
      speed: "8 Gbps",
      upTo: true,
      mbps: 8000,
      price: 164.95,
      from: true,
      fit: "Advanced home networks",
    },
  ],
  included: [
    { title: "Unlimited data", text: "No cap on any plan." },
    { title: "eero WiFi", text: "A high-performance eero system, as a rental, is part of the plan." },
    { title: "eero Secure", text: "Security, parental controls, network backup and insights at no extra cost." },
    { title: "Dedicated customer care", text: "Canadian support from a local team." },
  ],
  includedNote: "eero WiFi and eero Secure come with every plan except Bring Your Own Router plans.",
  fine: [
    "Prices are the ones listed on telmax.com for new customers and can change without notice.",
    "A $4 a month network access fee applies to all new customers. Tax is extra.",
    "telMAX offers a 12-month term and a monthly option. When a term ends you can renew for another.",
  ],
};

/* eero. Source: telmax.com/internet */
export const EERO = {
  coverage: [
    { extenders: 1, sqft: "2,000" },
    { extenders: 2, sqft: "4,000" },
    { extenders: 3, sqft: "6,000" },
  ],
  secure: ["Advanced security", "Parental controls", "Network backup", "Network insights"],
};

/* ---------------------------------------------------------------------
   TV. Source: telmax.com/tv-and-streaming
   --------------------------------------------------------------------- */
export const TV = {
  totalChannels: 132,
  named: ["TSN", "Sportsnet", "CNN", "Crave"],
  condition: "For 12 months, with a qualifying internet plan.",
  packages: [
    { id: "basic", name: "MAXview Basic", channels: "35+", price: 44.95 },
    { id: "essentials", name: "MAXview Essentials", channels: "55+", price: 64.95 },
    { id: "essentials-plus", name: "MAXview Essentials+", channels: "85+", price: 84.95 },
  ],
  addons: [
    { name: "À-la-carte", detail: "Add single channels", price: 5, unit: "channel" },
    { name: "Hollywood Suites", detail: "4 channels of commercial-free movies", price: 5 },
    { name: "Crave & HBO", detail: "6 channels", price: 20 },
    { name: "Fairchild Combo", detail: "3 channels", price: 25 },
    { name: "Phoenix Combo", detail: "2 channels", price: 10 },
    { name: "CNN Package", detail: "1 channel", price: 5 },
  ],
  features: [
    { icon: "video-player", title: "MAXview app", text: "Watch on tablets and phones at home. Some channels travel with you." },
    { icon: "line-bubble-message", title: "Voice control", text: "Google Assistant is built in." },
    { icon: "tv", title: "Entertainment box and remote", text: "Netflix, Prime Video and YouTube sit beside live TV." },
    { icon: "play", title: "Catch-up TV", text: "Go back up to 3 days and pause live TV." },
    { icon: "cloud-upload", title: "Cloud PVR", text: "Record up to 50 hours and reach it from anywhere." },
  ],
};

/* ---------------------------------------------------------------------
   Home phone. Source: telmax.com/home-phone
   --------------------------------------------------------------------- */
export const PHONE = {
  condition: "With a qualifying internet plan.",
  plans: [
    { id: "talk", name: "MAXtalk", reach: "Canada", price: 29.95, text: "Unlimited calling across Canada." },
    {
      id: "talk-plus",
      name: "MAXtalk Plus",
      reach: "Canada and the continental USA",
      price: 34.95,
      text: "Unlimited calling across Canada and the continental USA.",
    },
  ],
};

/* What telMAX says sets it apart. Source: telmax.com, "Our difference makers".
   The wording here is this site's own. */
export const DIFFERENCE = [
  {
    title: "Independent pure fibre",
    text: "A fibre network built for the purpose, owned and operated by telMAX. No copper on the last stretch to your home.",
  },
  {
    title: "Fast in both directions",
    text: "Upload matches download on every plan, up to 8 Gbps.",
  },
  {
    title: "Local people, local service",
    text: "Canadian support from a team that knows the communities it serves.",
  },
  {
    title: "Simple switching",
    text: "Help moving over from the provider you have now.",
  },
  {
    title: "Whole-home WiFi",
    text: "eero WiFi in every room, with eero Secure on eligible plans.",
  },
];

/* Recognition and company news, newest first.
   Source: telmax.com/about-telmax, which links each release. */
export const NEWS = [
  {
    date: "September 2026",
    text: "$215 million in new growth financing, with a structured investment from Hamilton Lane.",
    href: "https://www.newswire.ca/news-releases/telmax-secures-215-million-in-growth-financing-through-structured-investment-from-hamilton-lane-and-upsized-psic-credit-facility-831050807.html",
  },
  {
    date: "January 2026",
    text: "PCMag names telMAX Canada's fastest overall ISP for gaming.",
    href: "https://www.newswire.ca/news-releases/telmax-earns-pcmag-recognition-as-canada-s-fastest-overall-isp-for-gaming-829139680.html",
    award: true,
  },
  {
    date: "October 2025",
    text: "The network expands into Barrie.",
    href: "https://www.newswire.ca/news-releases/telmax-expands-into-barrie-with-canada-s-fastest-fibre-internet-856332745.html",
  },
  {
    date: "September 2025",
    text: "Ground is broken in Markham.",
    href: "https://www.newswire.ca/news-releases/telmax-breaks-ground-in-markham-to-expand-canada-s-fastest-fibre-internet-network-833492325.html",
  },
  {
    date: "July 2025",
    text: "PCMag names telMAX the fastest ISP in Canada for the fourth year in a row.",
    href: "https://www.newswire.ca/news-releases/telmax-named-fastest-isp-in-canada-by-pcmag-for-fourth-consecutive-year-839702302.html",
    award: true,
  },
  {
    date: "June 2025",
    text: "telMAX is on PCMag's list of the best Canadian ISPs for 2025.",
    href: "https://www.pcmag.com/articles/best-isps-canada-2025",
    award: true,
  },
];

/* ---------------------------------------------------------------------
   Business. Sources: telmax.com/business and telmax.com/business/plans
   telMAX lists no business prices: every plan is quoted.
   --------------------------------------------------------------------- */
export const BUSINESS = {
  topSpeed: "10 Gbps",
  uptime: "Greater than 99.99%",
  internet: [
    {
      name: "Business Fibre Internet",
      text: "Pure fibre with unlimited usage and the same speed up and down.",
      href: "https://www.telmax.com/business/business-fibre-internet/",
    },
    {
      name: "Enterprise Dedicated Internet Access",
      text: "Fibre that is not shared with anyone, backed by a service level agreement.",
      href: "https://www.telmax.com/business/dedicated-internet-access/",
    },
  ],
  voice: [
    {
      name: "MAXvoice Basic",
      fit: "The essentials",
      features: ["Call display", "Voicemail", "Hunt groups", "Call handling", "Call screening"],
    },
    {
      name: "MAXvoice Standard",
      fit: "More features and flexibility",
      features: ["Everything in Basic", "Auto attendant", "Call routing and queues", "Self-serve portal", "Voicemail to email"],
    },
    {
      name: "MAXvoice Enhanced",
      fit: "The full set, with an app",
      features: ["Everything in Standard", "Desktop and mobile app", "Soft phone", "Call recording"],
    },
  ],
  tv: [
    { name: "MAXview Basic", channels: "35+", text: "Includes Citytv, CTV2, Sportsnet and TSN." },
    { name: "MAXview Essentials", channels: "55+", text: "Adds History, Golf Channel, MuchMusic and TLC." },
    { name: "MAXview Essentials+", channels: "85+", text: "Adds CNN, Documentary Channel, Sportsnet 360 and Showcase." },
  ],
  difference: [
    { title: "Pure fibre, end to end", text: "The network telMAX built and runs itself." },
    { title: "Local and responsive", text: "A team based in the GTA." },
    { title: "Business-grade reliability", text: "Greater than 99.99% network uptime, with proactive monitoring." },
    { title: "Dedicated capacity", text: "Bandwidth kept for your business, around the clock." },
    { title: "More than a connection", text: "Managed WiFi, cybersecurity, cloud services and unified communications." },
    { title: "A committed repair standard", text: "A Mean Time To Repair commitment, backed by 24/7 network monitoring." },
    { title: "Room to grow", text: "Service frameworks designed with your team and built to expand." },
  ],
  security: [
    { title: "Hard to intercept", text: "Unauthorized tapping of a fibre line is far more detectable." },
    { title: "Resistant to interference", text: "Light in glass is not disrupted by radio-frequency noise." },
    { title: "Encrypted at the core", text: "Enterprise-grade encryption at the hardware and network levels." },
  ],
};

/* "$89.95" */
export const money = (n) => `$${Number(n).toFixed(2)}`;

/* What a plan costs each month before tax, with the network access fee. */
export const withFee = (price) => price + FEES.networkAccess;
