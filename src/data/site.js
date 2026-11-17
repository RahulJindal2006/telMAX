/* =====================================================================
   Who this site is about and where the real things live.
   Every phone number, address and outside link on the site is read from
   here, so a change is one edit.

   Checked against telmax.com on 16 November 2026.
   ===================================================================== */

/* ---------------------------------------------------------------------
   The concept notice.

   This build is a redesign proposal. It is not telMAX's website, it runs
   on a domain telMAX does not own, and nothing typed into it is sent to
   telMAX. While that is true the notice must stay on: it tells visitors
   what they are looking at, keeps the pages out of search engines, and
   makes every form say plainly that it sends nothing.

   Turn it off only when telMAX itself publishes this site on its own
   domain, with its own forms wired to its own systems.
   --------------------------------------------------------------------- */
export const CONCEPT = {
  on: true,
  by: "Rahul Jindal",
  factsChecked: "16 November 2026",
};

export const SITE = {
  name: "telMAX",
  tagline: "Connection at the speed of life",
  founded: 2016,

  /* telMAX's own pages and systems. The concept links out to these for
     anything that needs a real account, a real order or a real policy. */
  official: "https://www.telmax.com/",
  shop: "https://shop.telmax.com/",
  portal: "https://mybroadbandaccount.com/telmax/",
  portalBusiness: "https://mybroadbandaccount.com/telmaxbiz/",
  referral: "https://www.telmax.com/refer-a-friend-rv/",
  support: "https://www.telmax.com/support/",
  residentRelations: "https://www.telmax.com/resident-relations/",
  businessQuote: "https://share.hsforms.com/2Lpnd1D0jTlCZ1vnnw0YrYgrwujg",
  careers:
    "https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=1036e8b8-54d5-4483-a474-294291879890&ccId=19000101_000001&lang=en_CA",
  channelGuide:
    "https://www.telmax.com/wp-content/uploads/2026/08/MAXview-Guides-as-of-05-AUG-2026.pdf",
  starCodes: "https://www.telmax.com/wp-content/uploads/2025/04/telMAX-Star-Codes.pdf",

  legal: {
    privacy: "https://www.telmax.com/privacy-policy/",
    terms: "https://www.telmax.com/terms-of-service/",
    accessibility: "https://offers.telmax.com/lp-accessibility-centre/",
  },

  social: [
    { name: "Facebook", href: "https://www.facebook.com/telMAXinc/" },
    { name: "Instagram", href: "https://www.instagram.com/telmax_inc/" },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/telmaxinc" },
  ],

  apps: {
    eero: {
      ios: "https://apps.apple.com/ca/app/eero-wifi-system/id1023499075",
      android: "https://play.google.com/store/apps/details?id=com.eero.android",
    },
    maxview: {
      ios: "https://apps.apple.com/us/app/maxview-by-telmax/id1563454771",
      android: "https://play.google.com/store/apps/details?id=com.espial.elevate.custom.telmax",
    },
  },

  guides: [
    {
      name: "Installation preparation",
      href: "https://www.telmax.com/wp-content/uploads/2026/02/Installation-Preparation.pdf",
    },
    {
      name: "WiFi best practices",
      href: "https://www.telmax.com/wp-content/uploads/2026/02/Wifi-Best-Practices.pdf",
    },
    {
      name: "Troubleshooting guide",
      href: "https://www.telmax.com/wp-content/uploads/2026/06/Troubleshooting_Guide_Digital_June_12_26.pdf",
    },
  ],
};

export const CONTACT = {
  support: {
    label: "Residential support",
    phone: "1-844-483-5629",
    tel: "tel:+18444835629",
    email: "support@telmax.com",
  },
  business: {
    label: "Business",
    phone: "1-844-492-5333",
    tel: "tel:+18444925333",
    email: "businesssupport@telmax.com",
  },
  residents: {
    label: "Resident Relations",
    email: "rr@telmax.com",
  },
};

/* Communities with residential service. The sign-up flow checks an
   address against this list. */
export const AREAS = [
  "Aurora",
  "Barrie",
  "Brooklin",
  "Markham",
  "Newmarket",
  "Richmond Hill",
  "Stouffville",
];

/* Business service reaches further, and telmax.com/business names three
   more communities as coming soon. */
export const BUSINESS_AREAS = {
  now: ["Aurora", "Barrie", "Brooklin", "Markham", "Newmarket", "Oakville", "Richmond Hill", "Stouffville"],
  soon: ["Burlington", "Brampton", "Mississauga"],
};

/* "Aurora, Barrie and Brooklin" */
export function listOf(names) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
