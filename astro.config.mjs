// @ts-check
import { defineConfig } from "astro/config";
import { SITE } from "./src/data/site.js";

// https://astro.build/config
export default defineConfig({
  /* Addresses the earlier version of this site had. Each now leads to
     telMAX's own page for the same thing, so an old link still lands
     somewhere true. */
  redirects: {
    "/careers": SITE.careers,
    "/privacy": SITE.legal.privacy,
    "/terms": SITE.legal.terms,
    "/accessibility": SITE.legal.accessibility,
    "/forgot-password": "/my-telmax",
  },
});
