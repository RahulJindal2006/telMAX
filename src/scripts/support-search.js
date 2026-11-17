/* =====================================================================
   Search over the help articles in src/data/support.js.
   Used by the support centre and by the assistant, so both give the
   same answers. No network: everything is matched in the browser.

   How a question is matched
     1. Both the question and the articles are cut into words, and each
        word is reduced to a root, so "moving", "moved" and "move" are
        one word, and so are "reset", "restart" and "reboot".
     2. An article scores for each root it shares with the question:
        most in its title, then its keywords, then the name of its
        section, least in its answer. A word found in few articles
        counts for more than one found in many.
     3. A question that names a product ("my TV...") or says something
        is broken ("...not working") lifts that product's articles and
        the troubleshooting ones, so a vague question still lands.
   Whole words are compared, never fragments: "move" does not match
   "removed". test/support-search.test.mjs holds the questions this is
   expected to answer.
   ===================================================================== */

import { supportData } from "../data/support.js";

/* Every article, flat, with where it lives. */
export const allArticles = [];
supportData.forEach((p) =>
  p.categories.forEach((c) =>
    c.articles.forEach((a, idx) => {
      allArticles.push({
        ...a,
        productId: p.id,
        productName: p.name,
        categoryId: c.id,
        categoryName: c.name,
        idx,
      });
    }),
  ),
);

export const productById = (id) => supportData.find((p) => p.id === id);
export const categoryById = (p, cid) => p && p.categories.find((c) => c.id === cid);
export const articleCount = (p) => p.categories.reduce((n, c) => n + c.articles.length, 0);
/* The address of one article inside the support centre. */
export const articleHref = (a) => `/support#p/${a.productId}/${a.categoryId}/${a.idx}`;

/* ---- Words ---------------------------------------------------------- */

/* Words too common to say what a question is about. */
const STOP = new Set(
  (
    "the a an of to in on at by is are am be was i im ive my me we our us you your it its this that " +
    "do does did how can could would should will what why when which who and or but with for from " +
    "have has had help please want get there any some if so as not no up out off about telmax"
  ).split(" "),
);

/* Different words for one thing, each written as the root it reduces to. */
const SAME = {
  reset: "reboot",
  restart: "reboot",
  color: "colour",
  television: "tv",
  telly: "tv",
  invoice: "bill",
  payment: "pay",
  relocat: "mov",
  frozen: "freez",
  froze: "freez",
  cellphone: "mobil",
  cell: "mobil",
};

/* Lower case, accents and apostrophes removed, "wi-fi" as one word. */
export function normalise(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/wi-fi/g, "wifi")
    .replace(/e-bill/g, "ebill");
}

const wordsOf = (text) => normalise(text).split(/[^a-z0-9]+/).filter(Boolean);

/* A word's root. Deliberately crude: it only has to treat the forms of
   one word alike, and it treats the question and the articles the same way. */
export function root(word) {
  let w = word;
  if (w.length > 3) {
    for (const suffix of ["ations", "ation", "ings", "ing", "ies", "ied", "ers", "er", "ed", "ly", "es", "s"]) {
      if (!w.endsWith(suffix) || w.length - suffix.length < 3) continue;
      if (suffix === "s" && w.endsWith("ss")) break;
      w = w.slice(0, -suffix.length);
      if (suffix === "ies" || suffix === "ied") w += "y";
      break;
    }
    // "cancell" and "dropp" lose the doubled letter; "e" goes so "move" meets "moving"
    if (w.length > 3 && /([b-df-hj-np-rtv-z])\1$/.test(w)) w = w.slice(0, -1);
    if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  }
  return SAME[w] || w;
}

const rootsOf = (text) => wordsOf(text).map(root);

/* ---- What the question seems to be about ----------------------------- */

/* Words that hint at which product a vague question is about. */
const PRODUCT_HINTS = {
  internet: ["internet", "connection", "online", "disconnect", "mbps", "gbps", "bandwidth", "ethernet"],
  wifi: ["wifi", "eero", "router", "signal", "coverage", "mesh", "dead zone", "deadzone", "extender", "hotspot"],
  tv: ["tv", "channel", "guide", "pvr", "record", "catch up", "maxview", "set top", "remote", "stream", "watch", "picture"],
  "home-phone": ["phone", "call", "dial tone", "dialtone", "voicemail", "landline", "star code", "maxtalk", "911", "caller"],
  account: ["bill", "pay", "charge", "account", "balance", "credit card"],
  installation: ["install", "technician", "appointment"],
};

/* Words and phrases that say something is wrong, which favours troubleshooting articles. */
const TROUBLE = [
  "not working", "doesnt work", "broken", "down", "wont", "cant", "cannot", "stopped", "no internet",
  "no signal", "no dial tone", "no picture", "no wifi", "issue", "problem", "fix", "error", "slow",
  "lag", "buffering", "freeze", "dead", "offline", "outage", "disconnect", "drop", "trouble",
  "not connecting", "reboot",
];

/* A hint of several words is looked for as a phrase; a single word by its root. */
function says(hint, text, roots) {
  return hint.includes(" ") ? text.includes(hint) : roots.has(root(hint));
}

function detectProduct(text, roots) {
  let best = null;
  let bestN = 0;
  for (const [pid, hints] of Object.entries(PRODUCT_HINTS)) {
    const n = hints.filter((h) => says(h, text, roots)).length;
    if (n > bestN) {
      bestN = n;
      best = pid;
    }
  }
  return best;
}

/* ---- The index: each article's roots, worked out once ----------------- */

const index = allArticles.map((a) => ({
  a,
  title: new Set(rootsOf(a.q)),
  keys: new Set((a.keywords || []).flatMap(rootsOf)),
  section: new Set(rootsOf(a.categoryName)),
  body: new Set(rootsOf(a.a)),
  phrases: (a.keywords || []).map(normalise).filter((k) => k.length > 4),
}));

/* How telling a word is: one found in two articles says more about which
   article is meant than one found in twenty ("pause" against "wifi"). */
const seenIn = new Map();
index.forEach(({ title, keys, body }) => {
  new Set([...title, ...keys, ...body]).forEach((r) => seenIn.set(r, (seenIn.get(r) || 0) + 1));
});
/* About 0.5 for a word in every article, 1 for one in a quarter of them, 2 for one in a single article. */
const weight = (r) => (1 + Math.log(index.length / (1 + (seenIn.get(r) || 0)))) / 2.2;

/* The ten best articles for a question, with what the search understood:
   the product it seems to be about, and whether it reads as a problem. */
export function searchSupport(query, limit = 10) {
  const text = normalise(query).replace(/[^a-z0-9]+/g, " ").trim();
  const words = text ? text.split(" ") : [];
  const allRoots = new Set(words.map(root));
  const tokens = [...new Set(words.filter((w) => w.length > 1 && !STOP.has(w)).map(root))];
  const product = detectProduct(text, allRoots);
  const trouble = TROUBLE.some((w) => says(w, text, allRoots));

  const scored = index
    .map(({ a, title, keys, section, body, phrases }) => {
      let score = 0;
      tokens.forEach((t) => {
        const w = weight(t);
        if (title.has(t)) score += 5 * w;
        if (keys.has(t)) score += 4 * w;
        if (section.has(t)) score += 3 * w;
        if (body.has(t)) score += w;
      });
      // a title that holds every word of the question is very likely the one meant
      if (tokens.length > 1 && tokens.every((t) => title.has(t))) score += 4;
      // a whole keyword phrase found in the question counts again
      phrases.forEach((k) => {
        if (text.includes(k)) score += 5;
      });
      // A vague question still gets somewhere: naming a product, or saying that
      // something is broken, lifts that product's and the troubleshooting articles.
      if (product && a.productId === product) score += 6;
      if (trouble && a.categoryId === "troubleshooting") score += 6;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);

  return { results: scored.slice(0, limit).map((x) => x.a), product, trouble };
}
