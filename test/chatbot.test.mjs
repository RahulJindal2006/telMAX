/* =====================================================================
   telMAX help assistant - feature test suite (run with: npm test)
   Drives the widget through every flow using jsdom.
   ===================================================================== */

import { JSDOM } from "jsdom";
import assert from "node:assert/strict";
import {
  initChatbot,
  renderScreen,
  cleanQuestion,
  esc,
  supportTroubleHref,
  supportSearchHref,
  ANSWER_LIMIT,
  MENU,
} from "../src/scripts/chatbot.mjs";
import { SITE } from "../src/data/site.js";

/* The static markup that Chatbot.astro renders */
const MARKUP = `
<div class="cb" id="telmax-chatbot">
  <div class="cb-panel" role="dialog" aria-label="telMAX help assistant" tabindex="-1" hidden>
    <div class="cb-header">
      <button class="cb-back" type="button" aria-label="Go back" hidden>
        <span class="cb-back__icon" aria-hidden="true"></span>
      </button>
      <div class="cb-ident">
        <strong>Max</strong>
        <span class="cb-ident__status">Answers from the help centre</span>
      </div>
      <button class="cb-close" type="button" aria-label="Close the assistant">
        <span class="cb-close__icon" aria-hidden="true"></span>
      </button>
    </div>
    <div class="cb-body" aria-live="polite"></div>
    <p class="cb-foot">Max is automated and never asks for your personal details.</p>
  </div>
  <button class="cb-fab" type="button" aria-expanded="false" aria-controls="telmax-chatbot">
    <span class="cb-fab__icon" aria-hidden="true"></span>
    <span class="cb-fab__label">Ask a question</span>
  </button>
</div>`;

/* ---- Harness -------------------------------------------------------- */

function setup() {
  const dom = new JSDOM(`<!doctype html><html><body>${MARKUP}</body></html>`);
  const { document } = dom.window;
  const root = document.getElementById("telmax-chatbot");
  const widget = initChatbot(root);
  return { dom, document, root, widget };
}

const $ = (el, sel) => el.querySelector(sel);
const $$ = (el, sel) => [...el.querySelectorAll(sel)];

const choiceLabels = (root) => $$(root, ".cb-body .cb-choice").map((c) => c.textContent.trim());

function findChoice(root, label) {
  const el = $$(root, ".cb-body .cb-choice").find((c) => c.textContent.trim().includes(label));
  assert.ok(el, `expected a choice containing "${label}"`);
  return el;
}

function clickChoice(root, label) {
  findChoice(root, label).click();
}

function ask(root, dom, question) {
  const form = $(root, ".cb-ask");
  assert.ok(form, "expected a question box on screen");
  form.querySelector('input[name="q"]').value = question;
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
}

function pressEscape(root, dom) {
  root.ownerDocument.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

const isOpen = (root) => root.classList.contains("cb-open");
const backVisible = (root) => !$(root, ".cb-back").hidden;
const bodyText = (root) => $(root, ".cb-body").textContent;

const MENU_LABELS = [
  "Check my address",
  "Something is not working",
  "My bill or account",
  "Talk to telMAX",
];
const PRODUCTS = ["Internet", "WiFi & eero", "TV & Streaming", "Home Phone"];

/* ---- Tiny test runner ---------------------------------------------- */

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

console.log("\ntelMAX help assistant - feature tests\n");

/* ---- 1. Open / close ------------------------------------------------ */

test("panel starts closed, hidden and empty", () => {
  const { root } = setup();
  assert.equal(isOpen(root), false);
  assert.equal($(root, ".cb-panel").hidden, true);
  assert.equal($(root, ".cb-body").children.length, 0);
});

test("the button says what it does in words", () => {
  const { root } = setup();
  assert.equal($(root, ".cb-fab").textContent.trim(), "Ask a question");
});

test("clicking the button opens the panel", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.equal(isOpen(root), true);
  assert.equal($(root, ".cb-panel").hidden, false);
  assert.equal($(root, ".cb-fab").getAttribute("aria-expanded"), "true");
});

test("the button toggles the panel open and closed", () => {
  const { root } = setup();
  const fab = $(root, ".cb-fab");
  fab.click();
  assert.equal(isOpen(root), true);
  fab.click();
  assert.equal(isOpen(root), false);
  assert.equal(fab.getAttribute("aria-expanded"), "false");
});

test("the close button closes the panel and hands focus back", () => {
  const { root, document } = setup();
  $(root, ".cb-fab").click();
  $(root, ".cb-close").click();
  assert.equal(isOpen(root), false);
  assert.equal($(root, ".cb-panel").hidden, true);
  assert.equal(document.activeElement, $(root, ".cb-fab"));
});

test("the Escape key closes the panel", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  pressEscape(root, dom);
  assert.equal(isOpen(root), false);
});

test("a second initChatbot on the same element does nothing", () => {
  const { root } = setup();
  assert.equal(initChatbot(root), null);
  $(root, ".cb-fab").click();
  assert.equal(isOpen(root), true, "one click still opens it once");
});

test("initChatbot refuses markup with missing parts", () => {
  const dom = new JSDOM(`<!doctype html><body><div id="x"><button class="cb-fab"></button></div></body>`);
  assert.equal(initChatbot(dom.window.document.getElementById("x")), null);
  assert.equal(initChatbot(null), null);
});

/* ---- 2. Opening screen ---------------------------------------------- */

test("the opening screen introduces Max and invites a question", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.ok(bodyText(root).includes("Max"), "should introduce itself as Max");
  const input = $(root, '.cb-ask input[name="q"]');
  assert.ok(input, "should show a question box");
  assert.ok($(root, `label[for="${input.id}"]`), "the question box has a label");
});

test("the question box takes focus when the panel opens", () => {
  const { root, document } = setup();
  $(root, ".cb-fab").click();
  assert.equal(document.activeElement, $(root, ".cb-input"));
});

test("the menu offers the four expected options", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.deepEqual(choiceLabels(root), MENU_LABELS);
  assert.deepEqual(MENU.map((m) => m.label), MENU_LABELS);
});

test("'Check my address' goes to the sign-up flow", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.equal(findChoice(root, "Check my address").getAttribute("href"), "/get-started");
});

test("the back button is hidden on the opening screen", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.equal(backVisible(root), false);
});

/* ---- 3. Asking a question ------------------------------------------- */

test("a question is answered from the help articles", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "my internet is slow");
  assert.ok($(root, ".cb-asked").textContent.includes("my internet is slow"), "shows the question back");
  const answers = $$(root, ".cb-answer");
  assert.ok(answers.length >= 1 && answers.length <= ANSWER_LIMIT);
  assert.ok(/internet/i.test(answers[0].querySelector("summary").textContent));
  assert.ok(answers[0].querySelector("p").textContent.trim().length > 20, "the answer has a body");
  assert.equal(backVisible(root), true);
});

test("only the first answer starts open", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "pay my bill");
  const open = $$(root, ".cb-answer").map((d) => d.hasAttribute("open"));
  assert.equal(open[0], true);
  assert.ok(open.slice(1).every((o) => o === false));
});

test("every answer links to its place in the support centre", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "no dial tone");
  const links = $$(root, ".cb-answer__more").map((a) => a.getAttribute("href"));
  assert.ok(links.length >= 1);
  for (const href of links) assert.match(href, /^\/support#p\/[a-z-]+\/[a-z-]+\/\d+$/);
  assert.equal(links[0], "/support#p/home-phone/troubleshooting/0");
});

test("the answers screen links to every result and to a person", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "pay my bill");
  assert.equal(
    findChoice(root, "See every result").getAttribute("href"),
    "/support#q/pay%20my%20bill",
  );
  clickChoice(root, "Talk to telMAX");
  assert.equal($$(root, ".cb-contact__row").length, 3);
});

test("an empty question changes nothing", () => {
  const { root, dom, widget } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "   ");
  assert.equal(widget.state().screen, "menu");
  assert.equal(widget.depth(), 1);
  assert.deepEqual(choiceLabels(root), MENU_LABELS);
});

test("a question with no match says so and offers a way on", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "xyzzy plugh");
  assert.equal($$(root, ".cb-answer").length, 0);
  assert.ok(/could not find/i.test(bodyText(root)));
  assert.ok($(root, ".cb-ask"), "can ask again");
  assert.deepEqual(choiceLabels(root), ["Talk to telMAX", "Back to the start"]);
});

test("typed markup is shown as text, never run", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  const nasty = `<img src=x onerror="window.hacked=1"><script>window.hacked=1</script>`;
  ask(root, dom, nasty);
  assert.equal($(root, ".cb-body script"), null);
  assert.equal($(root, ".cb-body img"), null);
  assert.equal(dom.window.hacked, undefined);
  assert.ok($(root, ".cb-asked").textContent.includes("<img src=x"));
});

test("a long, messy question is tidied before use", () => {
  assert.equal(cleanQuestion("  slow \n\t internet  "), "slow internet");
  assert.equal(cleanQuestion("x".repeat(500)).length, 200);
  assert.equal(cleanQuestion(null), "");
  assert.equal(cleanQuestion(undefined), "");
});

test("a follow-up question can be asked from the answers", () => {
  const { root, dom, widget } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "pay my bill");
  ask(root, dom, "no dial tone");
  assert.equal(widget.depth(), 3);
  assert.ok($(root, ".cb-asked").textContent.includes("no dial tone"));
  $(root, ".cb-back").click();
  assert.ok($(root, ".cb-asked").textContent.includes("pay my bill"), "back returns to the first answer");
  $(root, ".cb-back").click();
  assert.deepEqual(choiceLabels(root), MENU_LABELS);
});

test("the widget can be asked from the page", () => {
  const { root, widget } = setup();
  widget.open();
  widget.ask("pay my bill");
  assert.equal(widget.state().screen, "answers");
  assert.equal(widget.state().data.q, "pay my bill");
  assert.ok($$(root, ".cb-answer").length >= 1);
});

/* ---- 4. Something is not working ------------------------------------ */

test("troubleshooting lists the four services", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Something is not working");
  assert.deepEqual(choiceLabels(root), PRODUCTS);
});

test("each service links to its troubleshooting guide", () => {
  const expected = {
    Internet: "/support#p/internet/troubleshooting",
    "WiFi & eero": "/support#p/wifi/troubleshooting",
    "TV & Streaming": "/support#p/tv/troubleshooting",
    "Home Phone": "/support#p/home-phone/troubleshooting",
  };
  for (const [label, href] of Object.entries(expected)) {
    const { root } = setup();
    $(root, ".cb-fab").click();
    clickChoice(root, "Something is not working");
    clickChoice(root, label);
    const link = $$(root, "a.cb-choice")[0];
    assert.ok(link, `expected a guide link for ${label}`);
    assert.equal(link.getAttribute("href"), href);
  }
});

test("a troubleshooting result also points to the status board and outage report", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Something is not working");
  clickChoice(root, "Internet");
  const hrefs = $$(root, "a.cb-choice").map((a) => a.getAttribute("href"));
  assert.ok(hrefs.includes("/status"));
  assert.ok(hrefs.includes("/report-outage"));
});

test("'Another service' returns to the list of services", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Something is not working");
  clickChoice(root, "Internet");
  clickChoice(root, "Another service");
  assert.deepEqual(choiceLabels(root), PRODUCTS);
});

test("an unknown service falls back to the list", () => {
  const html = renderScreen("troubleResult", { product: "toaster" });
  assert.ok(html.includes("Which service"));
});

/* ---- 5. Bill or account --------------------------------------------- */

test("account questions go to telMAX's own portal", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "My bill or account");
  const portal = findChoice(root, "Go to My telMAX");
  assert.equal(portal.getAttribute("href"), SITE.portal);
  assert.match(portal.getAttribute("href"), /^https:\/\//);
  assert.equal(portal.getAttribute("rel"), "noopener");
  assert.ok(/never ask for your password/i.test(bodyText(root)));
});

test("the account screen offers account articles and a way back", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "My bill or account");
  const articleLinks = $$(root, "a.cb-choice")
    .map((a) => a.getAttribute("href"))
    .filter((h) => h.startsWith("/support#p/account/"));
  assert.equal(articleLinks.length, 2);
  clickChoice(root, "Back to the start");
  assert.deepEqual(choiceLabels(root), MENU_LABELS);
  assert.equal(backVisible(root), false);
});

/* ---- 6. Talk to telMAX ---------------------------------------------- */

test("'Talk to telMAX' shows phone, business and email details", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Talk to telMAX");
  const rows = $$(root, ".cb-contact__row").map((r) => r.getAttribute("href"));
  assert.deepEqual(rows, ["tel:+18444835629", "tel:+18444925333", "mailto:support@telmax.com"]);
  assert.ok(bodyText(root).includes("1-844-483-5629"), "the number is written out, not only linked");
  assert.equal(findChoice(root, "All the ways to reach telMAX").getAttribute("href"), "/contact");
});

/* ---- 7. Back button ------------------------------------------------- */

test("the back button steps back one screen at a time", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Something is not working");
  clickChoice(root, "Internet"); // result screen
  assert.equal(backVisible(root), true);

  $(root, ".cb-back").click(); // -> list of services
  assert.deepEqual(choiceLabels(root), PRODUCTS);

  $(root, ".cb-back").click(); // -> opening screen
  assert.deepEqual(choiceLabels(root), MENU_LABELS);
  assert.equal(backVisible(root), false);
});

test("back undoes an accidental pick", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Something is not working"); // oops
  $(root, ".cb-back").click();
  clickChoice(root, "Talk to telMAX"); // the one actually wanted
  assert.equal($$(root, ".cb-contact__row").length, 3);
});

/* ---- 8. Reopening --------------------------------------------------- */

test("reopening the panel always returns to the opening screen", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  ask(root, dom, "pay my bill");
  $(root, ".cb-close").click();
  $(root, ".cb-fab").click();
  assert.deepEqual(choiceLabels(root), MENU_LABELS);
  assert.equal(backVisible(root), false);
  assert.equal($(root, ".cb-asked"), null, "the last question is not kept");
});

/* ---- 9. It asks for nothing personal -------------------------------- */

test("no screen asks for personal details", () => {
  const screens = [
    ["menu", {}],
    ["answers", { q: "pay my bill" }],
    ["answers", { q: "xyzzy plugh" }],
    ["troubleshoot", {}],
    ["troubleResult", { product: "internet" }],
    ["account", {}],
    ["contact", {}],
  ];
  for (const [screen, data] of screens) {
    const dom = new JSDOM(`<!doctype html><body>${renderScreen(screen, data)}</body>`);
    const inputs = [...dom.window.document.querySelectorAll("input, textarea, select")];
    for (const input of inputs) {
      assert.equal(input.name, "q", `${screen}: the only field is the question box`);
      assert.equal(input.type, "text");
    }
    assert.ok(inputs.length <= 1, `${screen}: at most one field`);
  }
});

test("nothing claims that a request was sent or logged", () => {
  for (const screen of ["menu", "troubleshoot", "account", "contact"]) {
    assert.ok(!/logged|we'll be in touch|request (has been|was) (sent|received)/i.test(renderScreen(screen)));
  }
});

/* ---- 10. Pure logic ------------------------------------------------- */

test("renderScreen falls back to the opening screen for an unknown screen", () => {
  const html = renderScreen("does-not-exist");
  assert.ok(html.includes("cb-choices"));
  assert.ok(html.includes("cb-ask"));
});

test("an answers screen with no question falls back to the opening screen", () => {
  assert.ok(renderScreen("answers", {}).includes("pick a place to start"));
});

test("esc neutralises markup characters", () => {
  assert.equal(esc(`<a href="x">Tom & 'Jerry'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  assert.equal(esc(42), "42");
});

test("support links are built the way the support centre reads them", () => {
  assert.equal(supportTroubleHref("tv"), "/support#p/tv/troubleshooting");
  assert.equal(supportSearchHref("wi-fi & eero?"), "/support#q/wi-fi%20%26%20eero%3F");
});

/* ---- Summary -------------------------------------------------------- */

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
