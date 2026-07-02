/* =====================================================================
   telMAX chatbot - feature test suite (run with: npm test)
   Drives the widget through every flow using jsdom.
   ===================================================================== */

import { JSDOM } from "jsdom";
import assert from "node:assert/strict";
import {
  initChatbot,
  renderScreen,
  validateForm,
} from "../src/scripts/chatbot.mjs";

/* The static markup that Chatbot.astro renders */
const MARKUP = `
<div class="cb" id="telmax-chatbot">
  <div class="cb-panel" role="dialog" aria-label="telMAX assistant">
    <header class="cb-header">
      <button class="cb-back" type="button" aria-label="Go back" hidden>
        <span class="cb-back__icon"></span>
      </button>
      <div class="cb-ident">
        <span class="cb-ident__av"></span>
        <span class="cb-ident__text">
          <strong>telMAX Assistant</strong>
          <span class="cb-ident__status">Online now</span>
        </span>
      </div>
      <button class="cb-close" type="button" aria-label="Close chat">
        <span class="cb-close__icon"></span>
      </button>
    </header>
    <div class="cb-body" aria-live="polite"></div>
    <p class="cb-foot">Powered by telMAX</p>
  </div>
  <button class="cb-fab" type="button" aria-label="Open the telMAX assistant" aria-expanded="false">
    <span class="cb-fab__mark cb-fab__mark--logo"></span>
    <span class="cb-fab__mark cb-fab__mark--close"></span>
  </button>
</div>`;

/* ---- Harness -------------------------------------------------------- */

function setup() {
  const dom = new JSDOM(`<!doctype html><html><body>${MARKUP}</body></html>`);
  const { document } = dom.window;
  const root = document.getElementById("telmax-chatbot");
  initChatbot(root);
  return { dom, document, root };
}

const $ = (el, sel) => el.querySelector(sel);
const $$ = (el, sel) => [...el.querySelectorAll(sel)];

const choiceLabels = (root) =>
  $$(root, ".cb-body .cb-choice").map((c) => c.textContent.trim());

function clickChoice(root, label) {
  const btn = $$(root, ".cb-body .cb-choice").find((c) =>
    c.textContent.trim().includes(label),
  );
  assert.ok(btn, `expected a choice containing "${label}"`);
  btn.click();
}

function fillForm(root, values) {
  const form = $(root, ".cb-form");
  assert.ok(form, "expected a form on screen");
  for (const [name, value] of Object.entries(values)) {
    const input = form.querySelector(`input[name="${name}"]`);
    assert.ok(input, `expected an input named "${name}"`);
    input.value = value;
  }
}

function submitForm(root, dom) {
  const form = $(root, ".cb-form");
  assert.ok(form, "expected a form to submit");
  form.dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true }),
  );
}

function pressEscape(root, dom) {
  root.ownerDocument.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

const isOpen = (root) => root.classList.contains("cb-open");
const backVisible = (root) => !$(root, ".cb-back").hidden;

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

const VALID = {
  firstName: "Jordan",
  lastName: "Lee",
  email: "jordan.lee@example.com",
  phone: "905-555-0142",
};

console.log("\ntelMAX chatbot - feature tests\n");

/* ---- 1. Open / close ------------------------------------------------ */

test("panel starts closed and empty", () => {
  const { root } = setup();
  assert.equal(isOpen(root), false);
  assert.equal($(root, ".cb-body").children.length, 0);
});

test("clicking the FAB opens the panel", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.equal(isOpen(root), true);
  assert.equal($(root, ".cb-fab").getAttribute("aria-expanded"), "true");
});

test("the FAB toggles the panel open and closed", () => {
  const { root } = setup();
  const fab = $(root, ".cb-fab");
  fab.click();
  assert.equal(isOpen(root), true);
  fab.click();
  assert.equal(isOpen(root), false);
});

test("the close button closes the panel", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  $(root, ".cb-close").click();
  assert.equal(isOpen(root), false);
});

test("the Escape key closes the panel", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  pressEscape(root, dom);
  assert.equal(isOpen(root), false);
});

/* ---- 2. Welcome menu ------------------------------------------------ */

test("the opening screen introduces itself and welcomes the user", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  const text = $(root, ".cb-body").textContent;
  assert.ok(text.includes("Max"), "should introduce itself as Max");
  assert.ok(
    text.includes("power everyday possibilities"),
    "should include the welcome line",
  );
});

test("the menu offers the six expected options", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.deepEqual(choiceLabels(root), [
    "New services",
    "Account queries",
    "Technical help",
    "Account changes",
    "Troubleshooting",
    "Talk to our team",
  ]);
});

test("the back button is hidden on the menu", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  assert.equal(backVisible(root), false);
});

/* ---- 3. Contact form (the four form options) ------------------------ */

for (const topic of [
  "New services",
  "Account queries",
  "Technical help",
  "Account changes",
]) {
  test(`"${topic}" opens a form with 5 fields (4 required, 1 optional)`, () => {
    const { root } = setup();
    $(root, ".cb-fab").click();
    clickChoice(root, topic);
    const form = $(root, ".cb-form");
    assert.ok(form, "a form should be shown");
    const names = $$(form, "input").map((i) => i.name);
    assert.deepEqual(names, [
      "firstName",
      "lastName",
      "email",
      "phone",
      "accountNumber",
    ]);
    for (const n of ["firstName", "lastName", "email", "phone"]) {
      assert.ok(
        form.querySelector(`input[name="${n}"]`).required,
        `${n} should be required`,
      );
    }
    assert.equal(
      form.querySelector('input[name="accountNumber"]').required,
      false,
      "accountNumber should be optional",
    );
    assert.equal(backVisible(root), true, "back button should appear");
  });
}

test("submitting an empty form shows a validation error", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "New services");
  submitForm(root, dom);
  const err = $(root, ".cb-error");
  assert.equal(err.hidden, false, "error should be visible");
  assert.ok(/first name/i.test(err.textContent));
  assert.ok($(root, ".cb-form"), "should stay on the form");
});

test("each missing or invalid required field is caught", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Technical help");

  fillForm(root, { ...VALID, lastName: "" });
  submitForm(root, dom);
  assert.ok(/last name/i.test($(root, ".cb-error").textContent));

  fillForm(root, { ...VALID, email: "not-an-email" });
  submitForm(root, dom);
  assert.ok(/email/i.test($(root, ".cb-error").textContent));

  fillForm(root, { ...VALID, phone: "12" });
  submitForm(root, dom);
  assert.ok(/phone/i.test($(root, ".cb-error").textContent));
});

test("a valid form (with account number) reaches the thank-you screen", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Account queries");
  fillForm(root, { ...VALID, accountNumber: "TM-99887" });
  submitForm(root, dom);
  const text = $(root, ".cb-body").textContent;
  assert.ok(text.includes("Jordan"), "thank-you should greet by first name");
  assert.ok(/logged/i.test(text));
  assert.ok($(root, ".cb-form") === null, "form should be gone");
});

test("a valid form WITHOUT an account number still succeeds", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "New services");
  fillForm(root, VALID); // no accountNumber
  submitForm(root, dom);
  assert.ok($(root, ".cb-body").textContent.includes("Jordan"));
});

test("the thank-you screen returns to the main menu", () => {
  const { root, dom } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "New services");
  fillForm(root, VALID);
  submitForm(root, dom);
  clickChoice(root, "Back to the main menu");
  assert.equal(choiceLabels(root).length, 6);
  assert.equal(backVisible(root), false);
});

/* ---- 4. Troubleshooting -------------------------------------------- */

test("troubleshooting lists the four products", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Troubleshooting");
  assert.deepEqual(choiceLabels(root), [
    "Internet",
    "WiFi & eero",
    "TV & Streaming",
    "Home Phone",
  ]);
});

test("each product links to its support troubleshooting page", () => {
  const expected = {
    Internet: "/support#p/internet/troubleshooting",
    "WiFi & eero": "/support#p/wifi/troubleshooting",
    "TV & Streaming": "/support#p/tv/troubleshooting",
    "Home Phone": "/support#p/home-phone/troubleshooting",
  };
  for (const [label, href] of Object.entries(expected)) {
    const { root } = setup();
    $(root, ".cb-fab").click();
    clickChoice(root, "Troubleshooting");
    clickChoice(root, label);
    const link = $(root, "a.cb-choice--link");
    assert.ok(link, `expected a support link for ${label}`);
    assert.equal(link.getAttribute("href"), href);
  }
});

test("'Try another product' returns to the product list", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Troubleshooting");
  clickChoice(root, "Internet");
  clickChoice(root, "Try another product");
  assert.deepEqual(choiceLabels(root), [
    "Internet",
    "WiFi & eero",
    "TV & Streaming",
    "Home Phone",
  ]);
});

/* ---- 5. Back button ------------------------------------------------- */

test("the back button steps back one screen at a time", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Troubleshooting");
  clickChoice(root, "Internet"); // result screen
  assert.equal(backVisible(root), true);

  $(root, ".cb-back").click(); // -> product list
  assert.deepEqual(choiceLabels(root)[0], "Internet");

  $(root, ".cb-back").click(); // -> menu
  assert.equal(choiceLabels(root).length, 6);
  assert.equal(backVisible(root), false);
});

test("back undoes an accidental option pick", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Troubleshooting"); // oops
  $(root, ".cb-back").click();
  clickChoice(root, "New services"); // the option actually wanted
  assert.ok($(root, ".cb-form"), "should now be on the form");
});

/* ---- 6. Contact ----------------------------------------------------- */

test("'Talk to our team' shows phone, business and email details", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Talk to our team");
  const rows = $$(root, ".cb-contact__row").map((r) => r.getAttribute("href"));
  assert.deepEqual(rows, [
    "tel:18444835629",
    "tel:18444925333",
    "mailto:support@telmax.com",
  ]);
  const contactLink = $$(root, ".cb-choice").find(
    (c) => c.getAttribute("href") === "/contact",
  );
  assert.ok(contactLink, "expected a link to the contact page");
});

/* ---- 7. Reopening --------------------------------------------------- */

test("reopening the panel always returns to the menu", () => {
  const { root } = setup();
  $(root, ".cb-fab").click();
  clickChoice(root, "Troubleshooting");
  $(root, ".cb-close").click();
  $(root, ".cb-fab").click();
  assert.equal(choiceLabels(root).length, 6, "should be back on the menu");
  assert.equal(backVisible(root), false);
});

/* ---- 8. Pure logic -------------------------------------------------- */

test("validateForm accepts good input and rejects bad input", () => {
  assert.equal(validateForm(VALID), null);
  assert.equal(validateForm({ ...VALID, accountNumber: "" }), null);
  assert.ok(validateForm({ ...VALID, firstName: "  " }));
  assert.ok(validateForm({ ...VALID, email: "bad" }));
  assert.ok(validateForm({ ...VALID, phone: "" }));
});

test("renderScreen falls back to the menu for an unknown screen", () => {
  assert.ok(renderScreen("does-not-exist").includes("cb-choices"));
});

/* ---- Summary -------------------------------------------------------- */

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
