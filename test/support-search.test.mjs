/* =====================================================================
   Help search - test suite (run with: npm test)
   The same search answers the support centre and the assistant. These
   are the questions it is expected to get right, in visitors' words.
   ===================================================================== */

import assert from "node:assert/strict";
import {
  searchSupport,
  allArticles,
  articleHref,
  normalise,
  root,
} from "../src/scripts/support-search.js";
import { supportData } from "../src/data/support.js";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

const first = (q) => searchSupport(q).results[0];
const firstTitle = (q) => (first(q) ? first(q).q : "(nothing)");

/* A question, and a pattern the title of its first answer must match. */
const EXPECTED = [
  // internet
  ["my internet is slow", /keeps disconnecting or is slower/],
  ["internet is slow", /keeps disconnecting or is slower/],
  ["slow internet", /keeps disconnecting or is slower/],
  ["internet not working", /keeps disconnecting|completely down/],
  ["internet down", /completely down/],
  ["outage", /completely down/],
  ["is there an outage", /completely down/],
  ["slower than my plan", /different speeds than my plan|slower than usual/],
  ["what speed do i need", /speed do I need/],
  ["speed test", /run a speed test/],
  ["is my data unlimited", /data cap/],
  ["which areas", /areas does telMAX service/],
  ["is telmax in barrie", /areas does telMAX service/],
  ["do you serve markham", /areas does telMAX service/],
  // wifi and equipment
  ["reset my eero", /eero is offline/],
  ["restart eero", /eero is offline/],
  ["reboot router", /lights on my router|eero is offline|keeps disconnecting/],
  ["how do i restart my modem", /keeps disconnecting|lights on my router/],
  ["red light", /red light|red LOS/],
  ["LOS light", /red LOS/],
  ["eero light colours", /light colours on my eero/],
  ["eero colors", /light colours on my eero/],
  ["extender", /add extenders/],
  ["wifi coverage", /improve WiFi coverage/],
  ["weak wifi upstairs", /improve WiFi coverage/],
  ["own router", /my own router/],
  ["set up eero", /set up my eero/],
  ["devices won't connect", /certain devices connect|reconnect my devices/],
  ["parental controls", /parental controls/],
  ["pause wifi for kids", /parental controls/],
  // tv
  ["tv not working", /TV picture is frozen|common problems with the MAXview/],
  ["tv app not working", /common problems with the MAXview/],
  ["buffering", /TV picture is frozen/],
  ["record a show", /hours of recording|record certain shows/],
  ["recording hours", /hours of recording/],
  ["catch up", /Catch-Up TV/],
  ["channels", /channels are in each package|access all the channels/],
  ["upgrade tv", /upgrade my TV package/],
  ["netflix", /TV hardware/],
  ["smart tv", /Smart TV compatible/],
  ["tv on my phone", /phone or tablet/],
  ["watch tv on ipad", /phone or tablet/],
  // home phone
  ["no dial tone", /no dial tone/],
  ["phone not working", /no dial tone/],
  ["voicemail", /access my voicemail/],
  ["call forwarding", /set up call forwarding/],
  ["star codes", /star codes/],
  ["block a number", /star codes/],
  ["911", /Will 911 work/],
  ["transfer my number", /transfer \(port\) my phone number/],
  ["port my number", /transfer \(port\) my phone number/],
  ["keep my phone number", /transfer \(port\) my phone number/],
  // account
  ["pay my bill", /pay my bill online/],
  ["pay bill by phone", /pay my bill over the phone/],
  ["autopay", /e-billing and automatic payments/],
  ["e-billing", /e-billing and automatic payments/],
  ["balance", /account balance/],
  ["update credit card", /update my payment information/],
  ["how do i move", /I'm moving/],
  ["moving", /I'm moving/],
  ["new address", /I'm moving/],
  ["cancel", /cancel my telMAX service/],
  ["cancel service", /cancel my telMAX service/],
  ["change my plan", /upgrade my services/],
  ["authorized user", /authorized person/],
  ["sign in", /sign in to My telMAX|sign in to the telMAX TV app/],
  ["my telmax", /My telMAX/],
  // installation
  ["installation", /prepare for my installation|installed in my home/],
  ["prepare for install", /prepare for my installation/],
  ["technical support", /technical service department/],
];

console.log("\ntelMAX help search - tests\n");

test(`${EXPECTED.length} everyday questions each land on the right article first`, () => {
  const wrong = EXPECTED.filter(([q, want]) => !want.test(firstTitle(q))).map(
    ([q, want]) => `"${q}" gave "${firstTitle(q)}", wanted ${want}`,
  );
  assert.deepEqual(wrong, []);
});

test("every article can be found by its own title", () => {
  const lost = allArticles.filter((a) => firstTitle(a.q) !== a.q).map((a) => `${a.q} -> ${firstTitle(a.q)}`);
  assert.deepEqual(lost, []);
});

test("nonsense and empty questions find nothing", () => {
  for (const q of ["xyzzy plugh", "qwertyuiop", "???", "", "   ", "the a of", null, undefined]) {
    assert.equal(searchSupport(q).results.length, 0, JSON.stringify(q));
  }
});

test("markup in a question is only ever text to match", () => {
  assert.equal(searchSupport("<script>alert(1)</script>").results.length, 0);
  assert.ok(searchSupport('<img src=x onerror="x"> voicemail').results.length > 0);
});

test("whole words are matched, not fragments of longer words", () => {
  // "move" is inside "removed", "script" inside "subscription", "down" inside "download"
  assert.match(firstTitle("how do i move"), /I'm moving/);
  assert.equal(searchSupport("script").results.length, 0);
  assert.equal(searchSupport("download speed").trouble, false);
  assert.equal(searchSupport("internet is down").trouble, true);
});

test("the forms of a word count as one word", () => {
  assert.equal(root("moving"), root("move"));
  assert.equal(root("moved"), root("move"));
  assert.equal(root("recordings"), root("record"));
  assert.equal(root("cancellation"), root("cancel"));
  assert.equal(root("cancelling"), root("cancel"));
  assert.equal(root("channels"), root("channel"));
  assert.equal(root("installed"), root("installation"));
  assert.equal(root("slower"), root("slow"));
  assert.notEqual(root("removed"), root("move"));
});

test("different words for one thing find the same article", () => {
  assert.equal(firstTitle("reset my eero"), firstTitle("restart my eero"));
  assert.equal(firstTitle("reset my eero"), firstTitle("reboot my eero"));
  assert.equal(firstTitle("eero light colors"), firstTitle("eero light colours"));
  assert.equal(firstTitle("wi-fi coverage"), firstTitle("wifi coverage"));
  assert.equal(normalise("Wi-Fi won’t connect"), "wifi wont connect");
});

test("the search says what it understood", () => {
  const tv = searchSupport("tv not working");
  assert.equal(tv.product, "tv");
  assert.equal(tv.trouble, true);
  const bill = searchSupport("pay my bill");
  assert.equal(bill.product, "account");
  assert.equal(bill.trouble, false);
  assert.equal(searchSupport("voicemail").product, "home-phone");
  assert.equal(searchSupport("eero").product, "wifi");
});

test("a one-word question about a product leads with that product's articles", () => {
  for (const [q, product] of [["tv", "tv"], ["wifi", "wifi"], ["my phone", "home-phone"], ["bill", "account"]]) {
    const { results } = searchSupport(q, 3);
    assert.equal(results.length, 3, q);
    assert.equal(results[0].productId, product, `${q}: ${results.map((a) => a.productId)}`);
  }
});

test("results are capped, ordered and never repeated", () => {
  assert.ok(searchSupport("internet").results.length <= 10);
  assert.equal(searchSupport("internet", 3).results.length, 3);
  const titles = searchSupport("wifi", 50).results.map((a) => a.q);
  assert.equal(new Set(titles).size, titles.length);
});

test("every article has a place in the support centre", () => {
  assert.equal(allArticles.length, supportData.reduce((n, p) => n + p.categories.reduce((m, c) => m + c.articles.length, 0), 0));
  const hrefs = allArticles.map(articleHref);
  assert.equal(new Set(hrefs).size, hrefs.length, "no two articles share an address");
  for (const href of hrefs) assert.match(href, /^\/support#p\/[a-z-]+\/[a-z-]+\/\d+$/);
  for (const a of allArticles) {
    assert.ok(a.q.trim().length > 8 && a.a.trim().length > 20, a.q);
    assert.ok(Array.isArray(a.keywords) && a.keywords.length > 0, `${a.q} has keywords`);
  }
});

test("no article states a price, a phone extension or a menu option telmax.com does not", () => {
  for (const a of allArticles) {
    assert.ok(!/\$\d/.test(a.a), `a price in: ${a.q}`);
    assert.ok(!/\bext\.?\s*\d/i.test(a.a), `an extension in: ${a.q}`);
    assert.ok(!/press \d/i.test(a.a), `a phone menu option in: ${a.q}`);
    const numbers = a.a.match(/\b1?-?\d{3}-\d{3}-\d{4}\b/g) || [];
    for (const n of numbers) assert.equal(n, "1-844-483-5629", `an unlisted number in: ${a.q}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
