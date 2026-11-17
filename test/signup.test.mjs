/* =====================================================================
   "Get started" flow - test suite (run with: npm test)
   Drives the five steps end to end using jsdom. The address lookup is
   stubbed, so nothing here touches the network.
   ===================================================================== */

import { JSDOM } from "jsdom";
import assert from "node:assert/strict";
import { PLANS } from "../src/data/plans.js";
import { FEES, TV, PHONE, EERO } from "../src/data/catalog.js";
import { SITE, AREAS } from "../src/data/site.js";

const STEP_LI = [1, 2, 3, 4, 5]
  .map(
    (n) =>
      `<li class="sw-step" data-step="${n}"><button type="button" class="sw-step__btn" disabled><span>${n}</span></button></li>`,
  )
  .join("");

const MARKUP = `
  <section id="signup-wizard">
    <p id="sw-now"></p>
    <ol class="sw-steps" id="sw-steps">${STEP_LI}</ol>
    <div class="sw-body" id="sw-body"></div>
  </section>`;

let importCounter = 0;

// Postal codes for the cities the tests use.
const POSTCODE = {
  Aurora: "L4G 1A1",
  Barrie: "L4M 1A1",
  Brooklin: "L1M 1A1",
  Markham: "L3R 1A1",
  Newmarket: "L3Y 1A1",
  "Richmond Hill": "L4C 1A1",
  Stouffville: "L4A 1A1",
  Milton: "L9T 1A1",
  Toronto: "M5V 1A1",
};

const DEFAULT_CITIES = ["Aurora", "Newmarket", "Markham"];

const photonFeature = (street, city) => ({
  properties: {
    countrycode: "CA",
    street,
    city,
    state: "Ontario",
    postcode: POSTCODE[city] || "L0L 0L0",
  },
});

/* A fresh page and a fresh copy of the flow for every test.
     seed.address  an address checked on another page, waiting in the tab
     seed.plan     a plan picked on another page */
async function setup(seed = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>${MARKUP}</body></html>`, {
    url: "https://telmax.test/get-started",
  });
  dom.window.scrollTo = () => {};
  global.window = dom.window;
  global.document = dom.window.document;
  global.sessionStorage = dom.window.sessionStorage;
  if (seed.address) sessionStorage.setItem("telmax:address", JSON.stringify(seed.address));
  if (seed.plan) sessionStorage.setItem("telmax:plan", seed.plan);

  // The address lookup, stubbed. Every request the flow makes is recorded.
  global.__TEST_CITIES__ = DEFAULT_CITIES;
  global.__FETCH_FAILS__ = false;
  dom.requests = [];
  global.fetch = async (url) => {
    dom.requests.push(String(url));
    if (global.__FETCH_FAILS__) throw new Error("offline");
    const q = new URL(url).searchParams.get("q") || "";
    const features = (global.__TEST_CITIES__ || DEFAULT_CITIES).map((c) => photonFeature(q, c));
    return { ok: true, json: async () => ({ features }) };
  };

  const mod = await import(`../src/scripts/signup.js?t=${importCounter++}`);
  mod.initSignup();
  return dom;
}

// Poll until a condition holds (the suggestions are debounced and async).
async function waitFor(fn, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("timed out waiting for condition");
}

const $ = (d, sel) => d.window.document.querySelector(sel);
const $$ = (d, sel) => [...d.window.document.querySelectorAll(sel)];
const text = (d) => d.window.document.getElementById("sw-body").textContent.replace(/\s+/g, " ");
const active = (d) => d.window.document.activeElement;
const total = (d) => $(d, ".sw-bill__total strong").textContent;

function fire(dom, target, type, opts) {
  target.dispatchEvent(new dom.window.Event(type, { bubbles: true, cancelable: true, ...opts }));
}

function key(dom, target, k) {
  target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

function typeAddress(dom, value) {
  const input = $(dom, "#sw-addr");
  input.value = value;
  fire(dom, input, "input");
}

async function pickAddress(dom, street, city) {
  global.__TEST_CITIES__ = [city];
  typeAddress(dom, street);
  await waitFor(() => $$(dom, ".sw-ac__item").length > 0);
  const item = $$(dom, ".sw-ac__item").find((i) => i.textContent.includes(city));
  assert.ok(item, `expected an address suggestion in ${city}`);
  item.click();
}

function fillForm(dom, formSel, values) {
  const form = $(dom, formSel);
  for (const [name, value] of Object.entries(values)) {
    const node = form.querySelector(`[name="${name}"]`);
    assert.ok(node, `field "${name}" missing`);
    if (node.type === "checkbox") node.checked = value;
    else node.value = value;
    fire(dom, node, "input");
  }
  return form;
}

const toggle = (dom, svc) => $(dom, `.sw-svc[data-svc="${svc}"]`).click();
const choose = (dom, id) => $(dom, `[data-act="choose"][data-plan="${id}"]`).click();
const planIds = (dom) => $$(dom, '[data-act="choose"]').map((b) => b.dataset.plan);

const ACCOUNT = {
  firstName: "Jordan",
  lastName: "Lee",
  phone: "905-555-0142",
  email: "jordan@example.com",
};

/* Straight to a step, the way a visitor would get there. */
async function toServices(dom, city = "Aurora") {
  await pickAddress(dom, "5 Oak Drive", city);
}
async function toCustomize(dom, planId = "i2000") {
  await toServices(dom);
  choose(dom, planId);
}
async function toAccount(dom, planId) {
  await toCustomize(dom, planId);
  $(dom, '[data-act="to-account"]').click();
}
async function toSchedule(dom, planId) {
  await toAccount(dom, planId);
  fire(dom, fillForm(dom, "#sw-account-form", ACCOUNT), "submit");
}

const withFeeAndTax = (price) => ((price + FEES.networkAccess) * (1 + FEES.hst)).toFixed(2);

/* ---- Tiny runner ---------------------------------------------------- */

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

console.log("\ntelMAX get-started flow - tests\n");

/* ---- Step 1: address ------------------------------------------------- */

await test("step 1 asks for an address, with a label and the communities served", async () => {
  const dom = await setup();
  const input = $(dom, "#sw-addr");
  assert.ok(input, "address input should exist");
  assert.ok(text(dom).includes("Enter your address"));
  assert.ok($(dom, `label[for="${input.id}"]`), "the input has a visible label");
  for (const city of AREAS) assert.ok(text(dom).includes(city), `names ${city}`);
  assert.ok($(dom, ".sw-step[data-step='1']").classList.contains("is-active"));
  assert.equal($(dom, "#sw-now").textContent, "Step 1 of 5: Address");
});

await test("typing shows Canadian address suggestions", async () => {
  const dom = await setup();
  typeAddress(dom, "123 Main Street");
  const list = $(dom, "#sw-addr-list");
  await waitFor(() => !list.hidden && $$(dom, ".sw-ac__item").length > 0);
  assert.equal($$(dom, ".sw-ac__item").length, 3);
  assert.equal($(dom, "#sw-addr").getAttribute("aria-expanded"), "true");
});

await test("the suggestions work from the keyboard", async () => {
  const dom = await setup();
  global.__TEST_CITIES__ = ["Aurora", "Newmarket"];
  typeAddress(dom, "14 Main Street");
  await waitFor(() => $$(dom, ".sw-ac__item").length === 2);
  const input = $(dom, "#sw-addr");
  key(dom, input, "ArrowDown");
  key(dom, input, "ArrowDown");
  assert.equal($$(dom, ".sw-ac__item")[1].getAttribute("aria-selected"), "true");
  key(dom, input, "Enter");
  assert.ok(text(dom).includes("telMAX serves Newmarket"), "Enter picks the highlighted address");
});

await test("Escape closes the suggestions", async () => {
  const dom = await setup();
  typeAddress(dom, "14 Main Street");
  const list = $(dom, "#sw-addr-list");
  await waitFor(() => !list.hidden && $$(dom, ".sw-ac__item").length > 0);
  key(dom, $(dom, "#sw-addr"), "Escape");
  assert.equal(list.hidden, true);
});

await test("'Check availability' without a chosen address says what to do", async () => {
  const dom = await setup();
  typeAddress(dom, "14 Main Street");
  $(dom, "#sw-addr-next").click();
  const hint = $(dom, "#sw-addr-hint");
  assert.equal(hint.hidden, false);
  assert.equal(hint.getAttribute("role"), "alert");
  assert.ok(/choose your address/i.test(hint.textContent));
  assert.ok($(dom, "#sw-addr"), "stays on step 1");
});

await test("when the address lookup is down, the box says so and lists the communities", async () => {
  const dom = await setup();
  global.__FETCH_FAILS__ = true;
  typeAddress(dom, "14 Main Street");
  await waitFor(() => /not answering/i.test($(dom, "#sw-addr-list").textContent));
  assert.ok($(dom, "#sw-addr-list").textContent.includes("Stouffville"));
});

await test("a serviced address advances to the plans", async () => {
  const dom = await setup();
  await pickAddress(dom, "14 Main Street", "Stouffville");
  assert.ok(text(dom).includes("Every plan starts with fibre"));
  assert.ok(text(dom).includes("telMAX serves Stouffville"));
  assert.ok($(dom, ".sw-step[data-step='2']").classList.contains("is-active"));
  assert.equal($(dom, ".sw-step[data-step='2']").getAttribute("aria-current"), "step");
  assert.ok($(dom, ".sw-step[data-step='1']").classList.contains("is-done"));
  assert.equal($(dom, "#sw-now").textContent, "Step 2 of 5: Plan");
});

await test("an address checked on another page arrives already checked", async () => {
  const dom = await setup({ address: { city: "Barrie", label: "8 Mill Street, Barrie, ON L4M 1A1" } });
  assert.ok(text(dom).includes("Every plan starts with fibre"), "starts on step 2");
  assert.ok(text(dom).includes("8 Mill Street, Barrie, ON L4M 1A1"));
  assert.equal(dom.window.sessionStorage.getItem("telmax:address"), null, "the waiting address is used once");
});

await test("a waiting address outside the service area goes to the not-here screen", async () => {
  const dom = await setup({ address: { city: "Milton", label: "1 Main Street, Milton, ON L9T 1A1" } });
  assert.ok($(dom, "#sw-ns-form"));
});

await test("a damaged waiting address is ignored", async () => {
  const dom = await setup({ address: { city: 42 } });
  assert.ok($(dom, "#sw-addr"), "falls back to step 1");
});

/* ---- Not in the service area ----------------------------------------- */

await test("an address outside the service area reaches the not-here screen", async () => {
  const dom = await setup();
  await pickAddress(dom, "14 Main Street", "Milton");
  assert.ok(text(dom).includes("can't find that address"));
  assert.ok(text(dom).includes("14 Main Street, Milton"), "shows the address it checked");
  assert.ok($(dom, "#sw-ns-form"), "the keep-me-posted form should show");
});

await test("'Try another address' goes back to step 1 with an empty box", async () => {
  const dom = await setup();
  await pickAddress(dom, "14 Main Street", "Milton");
  $(dom, '[data-act="restart"]').click();
  assert.ok($(dom, "#sw-addr"));
  assert.equal($(dom, "#sw-addr").value, "");
});

await test("the not-here form checks each field in turn and marks it", async () => {
  const dom = await setup();
  await pickAddress(dom, "9 King Street", "Toronto");
  const err = () => $(dom, "#sw-ns-err");
  const invalid = () => $$(dom, "#sw-ns-form [aria-invalid='true']").map((n) => n.name);
  const form = $(dom, "#sw-ns-form");

  fire(dom, form, "submit");
  assert.equal(err().hidden, false);
  assert.deepEqual(invalid(), ["firstName"]);
  assert.equal(active(dom).name, "firstName", "the cursor goes to the problem");

  fillForm(dom, "#sw-ns-form", { firstName: "Jordan", lastName: "Lee", phone: "12" });
  fire(dom, form, "submit");
  assert.deepEqual(invalid(), ["phone"]);

  fillForm(dom, "#sw-ns-form", { phone: "905-555-0142", email: "nope" });
  fire(dom, form, "submit");
  assert.deepEqual(invalid(), ["email"]);

  fillForm(dom, "#sw-ns-form", { email: "jordan@example.com" });
  fire(dom, form, "submit");
  assert.deepEqual(invalid(), ["member"]);
});

await test("the not-here form needs consent, then says plainly that nothing was sent", async () => {
  const dom = await setup();
  await pickAddress(dom, "9 King Street", "Toronto");
  const before = dom.requests.length;
  const form = fillForm(dom, "#sw-ns-form", { ...ACCOUNT, member: "Business", consent: false });
  fire(dom, form, "submit");
  assert.equal($(dom, "#sw-ns-err").hidden, false, "should block without consent");
  fillForm(dom, "#sw-ns-form", { consent: true });
  fire(dom, form, "submit");
  assert.ok(text(dom).includes("you're on the list"), "should confirm after consent");
  assert.ok(/not sent or kept/i.test(text(dom)), "says the details went nowhere");
  assert.equal(dom.requests.length, before, "no request was made");
});

await test("typing clears the last error message", async () => {
  const dom = await setup();
  await pickAddress(dom, "9 King Street", "Toronto");
  fire(dom, $(dom, "#sw-ns-form"), "submit");
  assert.equal($(dom, "#sw-ns-err").hidden, false);
  fillForm(dom, "#sw-ns-form", { firstName: "J" });
  assert.equal($(dom, "#sw-ns-err").hidden, true);
  assert.equal($$(dom, "#sw-ns-form [aria-invalid='true']").length, 0);
});

/* ---- Step 2: services and plans -------------------------------------- */

await test("each mix of services shows its own three plans", async () => {
  const dom = await setup();
  await toServices(dom);
  assert.deepEqual(planIds(dom), PLANS.internet.map((p) => p.id));
  toggle(dom, "tv");
  assert.deepEqual(planIds(dom), PLANS["internet+tv"].map((p) => p.id));
  toggle(dom, "phone");
  assert.deepEqual(planIds(dom), PLANS["internet+tv+phone"].map((p) => p.id));
  toggle(dom, "tv");
  assert.deepEqual(planIds(dom), PLANS["internet+phone"].map((p) => p.id));
  toggle(dom, "phone");
  assert.deepEqual(planIds(dom), ["i500", "i2000", "i4000"]);
});

await test("the service switches say whether they are on, and internet cannot be turned off", async () => {
  const dom = await setup();
  await toServices(dom);
  const internet = $$(dom, ".sw-svc")[0];
  assert.equal(internet.disabled, true);
  assert.equal(internet.getAttribute("aria-pressed"), "true");
  assert.equal($(dom, '.sw-svc[data-svc="tv"]').getAttribute("aria-pressed"), "false");
  toggle(dom, "tv");
  assert.equal($(dom, '.sw-svc[data-svc="tv"]').getAttribute("aria-pressed"), "true");
});

await test("a plan lists what is in it, read from the catalog", async () => {
  const dom = await setup();
  await toServices(dom);
  toggle(dom, "tv");
  toggle(dom, "phone");
  const plan = $$(dom, ".sw-plan").find((p) => p.textContent.includes("Essentials+"));
  const body = plan.textContent.replace(/\s+/g, " ");
  const tv = TV.packages.find((p) => p.id === "essentials-plus");
  const phone = PHONE.plans.find((p) => p.id === "talk-plus");
  assert.ok(body.includes(`${tv.channels} channels`));
  assert.ok(body.includes(phone.reach));
  assert.ok(body.includes("2 Gbps"));
  assert.ok(body.includes("$149.95"));
  assert.ok(body.includes("$153.95 with the $4 network fee"));
});

await test("prices say where they were read: telmax.com for internet, the July shop for bundles", async () => {
  const dom = await setup();
  await toServices(dom);
  assert.ok(/telmax\.com on 16 November 2026/.test($(dom, ".sw-source").textContent));
  toggle(dom, "tv");
  assert.ok(/July 2026/.test($(dom, ".sw-source").textContent));
});

await test("one plan on screen gets the solid button: the most popular", async () => {
  const dom = await setup();
  await toServices(dom);
  const solid = $$(dom, ".sw-plan .btn--primary");
  assert.equal(solid.length, 1);
  assert.equal(solid[0].dataset.plan, "i2000");
});

await test("a plan picked on another page is marked and leads", async () => {
  const dom = await setup({
    address: { city: "Aurora", label: "5 Oak Drive, Aurora, ON L4G 1A1" },
    plan: "i4000",
  });
  const picked = $(dom, ".sw-plan.is-pick");
  assert.ok(picked, "the picked plan is marked");
  assert.ok(picked.textContent.includes("Your pick"));
  assert.ok(picked.textContent.includes("4.0 Gbps"));
  assert.equal($(dom, ".sw-plan .btn--primary").dataset.plan, "i4000");
  assert.equal(dom.window.sessionStorage.getItem("telmax:plan"), null);
});

await test("a made-up plan id from storage is ignored", async () => {
  const dom = await setup({
    address: { city: "Aurora", label: "5 Oak Drive, Aurora, ON L4G 1A1" },
    plan: '"><img src=x onerror=alert(1)>',
  });
  assert.equal($(dom, ".sw-plan.is-pick"), null);
  assert.equal($(dom, "#sw-body img"), null);
});

await test("the keyboard stays on a switch after it redraws the plans", async () => {
  const dom = await setup();
  await toServices(dom);
  $(dom, '.sw-svc[data-svc="tv"]').focus();
  toggle(dom, "tv");
  assert.equal(active(dom), $(dom, '.sw-svc[data-svc="tv"]'));
});

/* ---- Step 3: options and the bill ------------------------------------ */

await test("choosing a plan opens the options with a running bill, focus on the title", async () => {
  const dom = await setup();
  await toCustomize(dom, "i2000");
  assert.ok($(dom, ".sw-bill"));
  assert.ok($(dom, ".sw-step[data-step='3']").classList.contains("is-active"));
  assert.equal(active(dom), $(dom, ".sw-title"));
  assert.ok($(dom, ".sw-bill__name").textContent.includes("MAXfibre 2.0 Gbps"));
});

await test("the bill adds the network fee and 13% HST to the plan", async () => {
  for (const plan of PLANS.internet) {
    const dom = await setup();
    await toCustomize(dom, plan.id);
    assert.equal(total(dom), `$${withFeeAndTax(plan.price)}`, plan.name);
  }
  const dom = await setup();
  await toCustomize(dom, "i2000");
  assert.equal(total(dom), "$106.16");
  const bill = $(dom, ".sw-bill").textContent.replace(/\s+/g, " ");
  assert.ok(bill.includes("Network access fee $4.00"));
  assert.ok(bill.includes("HST (13%) $12.21"));
});

await test("the step up from 500 Mbps costs exactly what the 2 Gbps plan costs", async () => {
  const dom = await setup();
  await toCustomize(dom, "i500");
  const upgrade = $(dom, '[data-act="upgrade"]');
  assert.ok(upgrade, "a 500 Mbps plan offers the step up");
  assert.equal(upgrade.getAttribute("aria-pressed"), "false");
  assert.equal(total(dom), "$94.86");
  upgrade.click();
  assert.equal(total(dom), "$106.16");
  assert.ok(text(dom).includes("Internet speed upgrade"));
  assert.equal($(dom, '[data-act="upgrade"]').getAttribute("aria-pressed"), "true");
  $(dom, '[data-act="upgrade"]').click();
  assert.equal(total(dom), "$94.86", "and it comes off again");
});

await test("plans that are already faster offer no step up", async () => {
  const dom = await setup();
  await toCustomize(dom, "i2000");
  assert.equal($(dom, '[data-act="upgrade"]'), null);
});

await test("extenders follow telMAX's coverage table and stay out of the total", async () => {
  const dom = await setup();
  await toCustomize(dom, "i2000");
  const before = total(dom);
  assert.equal($(dom, '[data-act="eero-"]').disabled, true, "cannot go below none");
  for (const row of EERO.coverage) {
    $(dom, '[data-act="eero+"]').click();
    assert.ok($(dom, ".sw-eero__cover").textContent.includes(`up to ${row.sqft} sq. ft.`));
  }
  assert.equal($(dom, '[data-act="eero+"]').disabled, true, "stops at the table's last row");
  assert.ok($(dom, ".sw-bill").textContent.includes("Not in total"));
  assert.equal(total(dom), before);
});

await test("the keyboard stays on the extender buttons as they redraw", async () => {
  const dom = await setup();
  await toCustomize(dom, "i2000");
  $(dom, '[data-act="eero+"]').focus();
  $(dom, '[data-act="eero+"]').click();
  assert.equal(active(dom), $(dom, '[data-act="eero+"]'));
});

await test("the bill makes no claim telmax.com does not make", async () => {
  const dom = await setup();
  await toCustomize(dom, "i2000");
  const bill = $(dom, ".sw-bill").textContent;
  assert.ok(!/waived|\$200|autopay/i.test(bill));
  assert.ok(bill.includes("telMAX confirms"), "installation is left for telMAX to confirm");
  const terms = $(dom, ".sw-bill__fine a");
  assert.equal(terms.getAttribute("href"), SITE.legal.terms);
});

/* ---- Step 4: your details -------------------------------------------- */

await test("the details form checks each field and keeps what was typed", async () => {
  const dom = await setup();
  await toAccount(dom);
  const form = $(dom, "#sw-account-form");
  const err = $(dom, "#sw-account-err");
  fire(dom, form, "submit");
  assert.equal(err.hidden, false);
  assert.ok(/first name/i.test(err.textContent));

  fillForm(dom, "#sw-account-form", { ...ACCOUNT, phone: "555-0142" });
  fire(dom, form, "submit");
  assert.ok(/area code/i.test(err.textContent), "seven digits is not a full number");
  assert.equal($(dom, '#sw-account-form [name="phone"]').getAttribute("aria-invalid"), "true");

  fillForm(dom, "#sw-account-form", { phone: "+1 (905) 555-0142" });
  fire(dom, form, "submit");
  assert.ok(text(dom).includes("Schedule your installation"), "a formatted number is accepted");

  $(dom, '[data-act="back-account"]').click();
  assert.equal($(dom, '#sw-account-form [name="firstName"]').value, "Jordan");
  assert.equal($(dom, '#sw-account-form [name="email"]').value, "jordan@example.com");
});

await test("the fields are labelled for autofill", async () => {
  const dom = await setup();
  await toAccount(dom);
  const auto = (n) => $(dom, `#sw-account-form [name="${n}"]`).getAttribute("autocomplete");
  assert.equal(auto("firstName"), "given-name");
  assert.equal(auto("lastName"), "family-name");
  assert.equal(auto("phone"), "tel");
  assert.equal(auto("email"), "email");
});

await test("the email check shows its code on screen and says no email is sent", async () => {
  const dom = await setup();
  await toAccount(dom);
  const before = dom.requests.length;

  $(dom, '[data-act="verify-email"]').click();
  assert.equal($(dom, "#sw-account-err").hidden, false, "needs an email first");

  fillForm(dom, "#sw-account-form", { email: "jordan@example.com" });
  $(dom, '[data-act="verify-email"]').click();
  const demo = $(dom, ".sw-verify__demo").textContent;
  assert.ok(/sends no email/i.test(demo));
  const code = demo.match(/\b(\d{6})\b/)[1];

  $(dom, "#sw-verify-code").value = "000000" === code ? "111111" : "000000";
  $(dom, '[data-act="verify-confirm"]').click();
  assert.equal($(dom, "#sw-verify-err").hidden, false, "a wrong code is refused");

  $(dom, "#sw-verify-code").value = code;
  key(dom, $(dom, "#sw-verify-code"), "Enter");
  assert.ok($(dom, ".sw-verify__ok"), "the right code is accepted, also with Enter");

  fillForm(dom, "#sw-account-form", { email: "someone.else@example.com" });
  assert.equal($(dom, ".sw-verify__ok"), null, "a changed email is unverified again");
  assert.equal(dom.requests.length, before, "no request was made");
});

/* ---- Step 5: installation -------------------------------------------- */

await test("'next available' can be confirmed straight away", async () => {
  const dom = await setup();
  await toSchedule(dom);
  assert.equal($(dom, '[data-act="finish"]').disabled, true, "nothing chosen yet");
  $(dom, '[data-act="mode"][data-mode="next"]').click();
  assert.equal($(dom, '[data-act="mode"][data-mode="next"]').getAttribute("aria-pressed"), "true");
  assert.equal($(dom, '[data-act="finish"]').disabled, false);
});

await test("choosing dates needs two days and two time windows", async () => {
  const dom = await setup();
  await toSchedule(dom);
  $(dom, '[data-act="mode"][data-mode="specific"]').click();
  const finish = () => $(dom, '[data-act="finish"]');
  const pickDay = (which, n = 0) => $$(dom, `button.sw-cal__day[data-cal="${which}"]`)[n].click();

  assert.equal(finish().disabled, true);
  assert.equal($$(dom, ".sw-cal").length, 1, "the second calendar waits for the first choice");
  pickDay("1");
  assert.equal(finish().disabled, true);
  $$(dom, '.sw-slot[data-cal="1"]')[0].click();
  assert.equal($$(dom, ".sw-cal").length, 2);
  pickDay("2");
  assert.equal(finish().disabled, true);
  $$(dom, '.sw-slot[data-cal="2"]')[1].click();
  assert.equal(finish().disabled, false);
  finish().click();
  assert.ok(text(dom).includes("You're all set"));
  assert.ok(text(dom).includes("First choice"));
  assert.ok(text(dom).includes("Second choice"));
});

await test("the calendar offers weekdays from tomorrow on, each named in full", async () => {
  const dom = await setup();
  await toSchedule(dom);
  $(dom, '[data-act="mode"][data-mode="specific"]').click();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = $$(dom, 'button.sw-cal__day[data-cal="1"]');
  for (const day of days) {
    const [y, m, d] = day.dataset.date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    assert.ok(date > today, `${day.dataset.date} is after today`);
    assert.ok(date.getDay() !== 0 && date.getDay() !== 6, `${day.dataset.date} is a weekday`);
    assert.ok(/day, \w+ \d+/.test(day.getAttribute("aria-label")), "has a spoken date");
  }
  assert.equal($(dom, '.sw-cal__arrow[data-dir="-1"]').disabled, true, "cannot page into the past");
  const title = $(dom, ".sw-cal__title").textContent;
  $(dom, '.sw-cal__arrow[data-dir="1"]').click();
  assert.notEqual($(dom, ".sw-cal__title").textContent, title, "pages forward a month");
  assert.equal($(dom, '.sw-cal__arrow[data-dir="-1"]').disabled, false);
});

await test("the second choice cannot fall before the first, and is dropped if it ends up there", async () => {
  const dom = await setup();
  await toSchedule(dom);
  $(dom, '[data-act="mode"][data-mode="specific"]').click();
  // page one month on, so there are plenty of open days either side
  $(dom, '.sw-cal__arrow[data-cal="1"][data-dir="1"]').click();
  const open1 = () => $$(dom, 'button.sw-cal__day[data-cal="1"]');
  const firstPick = open1()[3].dataset.date;
  open1()[3].click();
  $$(dom, '.sw-slot[data-cal="1"]')[0].click();

  $(dom, '.sw-cal__arrow[data-cal="2"][data-dir="1"]').click();
  const open2 = $$(dom, 'button.sw-cal__day[data-cal="2"]').map((b) => b.dataset.date);
  assert.ok(open2.every((d) => d >= firstPick), "nothing before the first choice is offered");
  $(dom, `button.sw-cal__day[data-cal="2"][data-date="${firstPick}"]`).click();
  $$(dom, '.sw-slot[data-cal="2"]')[2].click();
  assert.equal($(dom, '[data-act="finish"]').disabled, false);

  // move the first choice later than the second
  open1()[8].click();
  assert.equal($(dom, '[data-act="finish"]').disabled, true, "the stranded second choice is cleared");
});

/* ---- The end --------------------------------------------------------- */

await test("full path: address, plan, options, details, installation, done", async () => {
  const dom = await setup();
  await pickAddress(dom, "100 King Street", "Newmarket");
  choose(dom, "i500");
  $(dom, '[data-act="upgrade"]').click();
  $(dom, '[data-act="eero+"]').click();
  $(dom, '[data-act="to-account"]').click();
  fire(dom, fillForm(dom, "#sw-account-form", ACCOUNT), "submit");
  assert.ok(text(dom).includes("Schedule your installation"));
  $(dom, '[data-act="mode"][data-mode="next"]').click();
  $(dom, '[data-act="finish"]').click();

  const done = text(dom);
  assert.ok(done.includes("You're all set, Jordan."), "greets the customer by name");
  assert.ok(done.includes("100 King Street, Newmarket"));
  assert.ok(done.includes("MAXfibre 500 Mbps, with the step up to 2 Gbps"));
  assert.ok(done.includes("$106.16"));
  assert.ok(done.includes("Earliest available appointment"));
  assert.equal($(dom, "#sw-now").textContent, "All five steps done");
  assert.ok($$(dom, ".sw-step").every((li) => li.classList.contains("is-done")));
});

await test("the last screen says no order was placed and points to telMAX's shop", async () => {
  const dom = await setup();
  await toSchedule(dom);
  $(dom, '[data-act="mode"][data-mode="next"]').click();
  $(dom, '[data-act="finish"]').click();
  assert.ok(/no order was placed/i.test(text(dom)));
  assert.ok(!/order has been received/i.test(text(dom)));
  const cta = $(dom, ".sw-done__cta");
  assert.equal(cta.getAttribute("href"), SITE.shop);
  assert.equal(cta.getAttribute("rel"), "noopener");
});

/* ---- Moving around ---------------------------------------------------- */

await test("a finished step in the row at the top is a way back; a later one is not", async () => {
  const dom = await setup();
  await toCustomize(dom);
  const step = (n) => $(dom, `.sw-step[data-step='${n}']`);
  assert.equal(step(2).querySelector("button").disabled, false);
  assert.equal(step(4).querySelector("button").disabled, true);
  step(4).click();
  assert.ok($(dom, ".sw-bill"), "a step not reached yet does nothing");
  step(2).querySelector("button").click();
  assert.ok(text(dom).includes("Every plan starts with fibre"));
});

await test("the browser's Back and Forward buttons move between steps", async () => {
  const dom = await setup();
  await toAccount(dom);
  dom.window.history.back();
  await waitFor(() => text(dom).includes("Fit it to your home"));
  dom.window.history.back();
  await waitFor(() => text(dom).includes("Every plan starts with fibre"));
  dom.window.history.forward();
  await waitFor(() => text(dom).includes("Fit it to your home"));
  assert.ok($(dom, ".sw-bill"), "the chosen plan is still there");
});

await test("Back buttons inside the flow keep every choice", async () => {
  const dom = await setup();
  await toCustomize(dom, "i500");
  $(dom, '[data-act="upgrade"]').click();
  $(dom, '[data-act="to-account"]').click();
  $(dom, '[data-act="back-customize"]').click();
  assert.equal($(dom, '[data-act="upgrade"]').getAttribute("aria-pressed"), "true");
  assert.equal(total(dom), "$106.16");
});

await test("'Change address' on the plans goes back to step 1", async () => {
  const dom = await setup();
  await toServices(dom);
  $(dom, '[data-act="restart"]').click();
  assert.ok($(dom, "#sw-addr"));
});

/* ---- What the flow never does ----------------------------------------- */

await test("no step asks for a password or a card, and no link goes to a missing page", async () => {
  const dom = await setup();
  const check = (where) => {
    for (const input of $$(dom, "#sw-body input, #sw-body select, #sw-body textarea")) {
      assert.notEqual(input.type, "password", `${where}: no password field`);
      assert.ok(!/card|cvv|cvc|sin|password/i.test(input.name || ""), `${where}: ${input.name}`);
    }
    for (const a of $$(dom, "#sw-body a")) {
      const href = a.getAttribute("href");
      assert.ok(!["/terms", "/privacy", "/careers", "/accessibility", "/forgot-password"].includes(href), `${where}: ${href}`);
    }
  };
  check("address");
  await pickAddress(dom, "5 Oak Drive", "Aurora");
  check("plans");
  choose(dom, "i2000");
  check("options");
  $(dom, '[data-act="to-account"]').click();
  check("details");
  fire(dom, fillForm(dom, "#sw-account-form", ACCOUNT), "submit");
  $(dom, '[data-act="mode"][data-mode="specific"]').click();
  check("installation");
});

await test("the only request the whole flow makes is the address lookup", async () => {
  const dom = await setup();
  await toSchedule(dom, "i500");
  $(dom, '[data-act="mode"][data-mode="next"]').click();
  $(dom, '[data-act="finish"]').click();
  assert.ok(dom.requests.length >= 1);
  for (const url of dom.requests) {
    assert.ok(url.startsWith("https://photon.komoot.io/api/"), url);
    assert.ok(!/jordan|example\.com|555/i.test(url), "no personal detail is in a request");
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
