/* =====================================================================
   Get-started wizard - flow test suite (run with: npm run test:signup)
   Drives the multi-step wizard end to end using jsdom.
   ===================================================================== */

import { JSDOM } from "jsdom";
import assert from "node:assert/strict";

const STEP_LI = [1, 2, 3, 4, 5]
  .map((n) => `<li class="sw-step" data-step="${n}"><span>${n}</span></li>`)
  .join("");

const MARKUP = `
  <section id="signup-wizard">
    <ol class="sw-steps" id="sw-steps">${STEP_LI}</ol>
    <div class="sw-body" id="sw-body"></div>
  </section>`;

let importCounter = 0;

// Postal codes for the cities the tests exercise (mirrors the live areas).
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
  Mississauga: "L5B 1A1",
  Vaughan: "L4K 1A1",
};

// Cities returned by the stubbed geocoder when a test doesn't request a
// specific one (used by the generic "suggestions appear" test).
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

async function setup() {
  const dom = new JSDOM(`<!doctype html><html><body>${MARKUP}</body></html>`, {
    url: "https://telmax.test/get-started",
  });
  dom.window.scrollTo = () => {};
  global.window = dom.window;
  global.document = dom.window.document;

  // Stub the Photon geocoder so the address autocomplete is deterministic and
  // never hits the network. The cities returned are controlled per-test via
  // global.__TEST_CITIES__ (set by pickAddress).
  global.__TEST_CITIES__ = DEFAULT_CITIES;
  global.fetch = async (url) => {
    const q = new URL(url).searchParams.get("q") || "";
    const features = (global.__TEST_CITIES__ || DEFAULT_CITIES).map((c) =>
      photonFeature(q, c),
    );
    return { ok: true, json: async () => ({ features }) };
  };

  // Fresh module instance per test so wizard state never leaks between tests
  const mod = await import(`../src/scripts/signup.js?t=${importCounter++}`);
  mod.initSignup();
  return dom;
}

// Poll until a condition holds (the autocomplete is debounced + async).
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
const text = (d) => d.window.document.getElementById("sw-body").textContent;

function fire(dom, target, type, opts) {
  target.dispatchEvent(
    new dom.window.Event(type, { bubbles: true, cancelable: true, ...opts }),
  );
}

function typeAddress(dom, value) {
  const input = $(dom, "#sw-addr");
  input.value = value;
  fire(dom, input, "input");
}

async function pickAddress(dom, street, city) {
  // Make the stubbed geocoder return the city this test needs.
  global.__TEST_CITIES__ = [city];
  typeAddress(dom, street);
  await waitFor(() => $$(dom, ".sw-ac__item").length > 0);
  const item = $$(dom, ".sw-ac__item").find((i) =>
    i.textContent.includes(city),
  );
  assert.ok(item, `expected an address suggestion in ${city}`);
  item.click();
}

function clickByText(dom, selector, needle) {
  const node = $$(dom, selector).find((n) => n.textContent.includes(needle));
  assert.ok(node, `expected "${needle}" (${selector})`);
  node.click();
  return node;
}

function fillForm(dom, formSel, values) {
  const form = $(dom, formSel);
  for (const [name, value] of Object.entries(values)) {
    const node = form.querySelector(`[name="${name}"]`);
    assert.ok(node, `field "${name}" missing`);
    if (node.type === "checkbox") node.checked = value;
    else node.value = value;
  }
  return form;
}

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

const ACCOUNT = {
  firstName: "Jordan",
  lastName: "Lee",
  phone: "905-555-0142",
  email: "jordan@example.com",
};

console.log("\ntelMAX get-started wizard - flow tests\n");

await test("step 1 renders the address screen", async () => {
  const dom = await setup();
  assert.ok($(dom, "#sw-addr"), "address input should exist");
  assert.ok(text(dom).includes("Enter your address"));
});

await test("typing shows Canadian address suggestions", async () => {
  const dom = await setup();
  typeAddress(dom, "123 Main Street");
  const list = $(dom, "#sw-addr-list");
  await waitFor(() => !list.hidden && $$(dom, ".sw-ac__item").length > 0);
  assert.equal(list.hidden, false, "suggestion list should open");
  assert.ok($$(dom, ".sw-ac__item").length > 0, "should list addresses");
});

await test("a serviced address advances to Choose Services", async () => {
  const dom = await setup();
  await pickAddress(dom, "14 Main Street", "Stouffville");
  assert.ok(text(dom).includes("Every plan starts with fibre"));
  assert.ok($(dom, ".sw-step[data-step='2']").classList.contains("is-active"));
});

await test("an address outside the service area reaches the not-found page", async () => {
  const dom = await setup();
  await pickAddress(dom, "14 Main Street", "Milton");
  assert.ok(text(dom).includes("can't find that address"));
  assert.ok($(dom, "#sw-ns-form"), "lead-capture form should show");
});

await test("not-found form requires consent before sending", async () => {
  const dom = await setup();
  await pickAddress(dom, "9 King Street", "Toronto");
  const form = fillForm(dom, "#sw-ns-form", {
    ...ACCOUNT,
    member: "Business",
    consent: false,
  });
  fire(dom, form, "submit");
  assert.equal($(dom, "#sw-ns-err").hidden, false, "should block without consent");
  fillForm(dom, "#sw-ns-form", { consent: true });
  fire(dom, form, "submit");
  assert.ok(text(dom).includes("you're on the list"), "should confirm after consent");
});

await test("internet-only shows two plans; adding TV shows three", async () => {
  const dom = await setup();
  await pickAddress(dom, "5 Oak Drive", "Aurora");
  assert.equal($$(dom, ".sw-plan").length, 2, "internet-only = 2 plans");
  clickByText(dom, ".sw-svc", "TV").click?.();
  // toggle TV
  $$(dom, ".sw-svc").find((s) => s.textContent.includes("TV")).click();
  assert.equal($$(dom, ".sw-plan").length, 3, "internet + TV = 3 plans");
});

await test("full happy path: address - plan - customize - account - schedule - done", async () => {
  const dom = await setup();
  // Step 1
  await pickAddress(dom, "100 King Street", "Newmarket");
  // Step 2 - choose the first plan
  $$(dom, '[data-act="choose"]')[0].click();
  assert.ok($(dom, ".sw-bill"), "customize screen shows the running bill");
  // Step 3 - add an eero, then continue
  $(dom, '[data-act="eero+"]').click();
  assert.ok(text(dom).includes("Additional eero Wi-Fi Extender x1"));
  $(dom, '[data-act="to-account"]').click();
  // Step 4 - account details
  const form = fillForm(dom, "#sw-account-form", ACCOUNT);
  fire(dom, form, "submit");
  assert.ok(text(dom).includes("Schedule your installation"));
  // Step 5 - next available, then confirm
  $(dom, '[data-act="mode"][data-mode="next"]').click();
  const finish = $(dom, '[data-act="finish"]');
  assert.equal(finish.disabled, false, "confirm should be enabled");
  finish.click();
  assert.ok(text(dom).includes("You're all set"), "reaches the done screen");
  assert.ok(text(dom).includes("Jordan"), "greets the customer by name");
});

await test("the internet upgrade adds $10 to the monthly bill", async () => {
  const dom = await setup();
  await pickAddress(dom, "8 Mill Street", "Barrie");
  // Choose the 500 Mbps plan (it supports the 2.0 Gbps upgrade)
  const plan500 = $$(dom, ".sw-plan").find((p) =>
    p.textContent.includes("500 Mbps"),
  );
  plan500.querySelector('[data-act="choose"]').click();
  const upgrade = $(dom, '[data-act="upgrade"]');
  assert.ok(upgrade, "500 Mbps plan should offer an upgrade");
  const before = $(dom, ".sw-bill__total strong").textContent;
  upgrade.click();
  const after = $(dom, ".sw-bill__total strong").textContent;
  assert.notEqual(before, after, "total should change after upgrading");
  assert.ok(text(dom).includes("Internet speed upgrade"));
});

await test("specific scheduling needs two dated preferences before confirming", async () => {
  const dom = await setup();
  await pickAddress(dom, "3 Pine Road", "Markham");
  $$(dom, '[data-act="choose"]')[0].click();
  $(dom, '[data-act="to-account"]').click();
  fire(dom, fillForm(dom, "#sw-account-form", ACCOUNT), "submit");
  $(dom, '[data-act="mode"][data-mode="specific"]').click();

  const pickDay = (which) => {
    const day = $$(dom, `.sw-cal__day[data-cal="${which}"]`)[0];
    assert.ok(day, `an open day should exist in calendar ${which}`);
    day.click();
  };

  assert.equal($(dom, '[data-act="finish"]').disabled, true, "blocked at first");
  pickDay("1"); // first preference date
  $$(dom, '.sw-slot[data-cal="1"]')[0].click(); // first time window
  pickDay("2"); // second preference date
  $$(dom, '.sw-slot[data-cal="2"]')[0].click(); // second time window
  const finish = $(dom, '[data-act="finish"]');
  assert.equal(finish.disabled, false, "enabled once both prefs chosen");
  finish.click();
  assert.ok(text(dom).includes("You're all set"));
});

await test("the stepper lets you jump back to a completed step", async () => {
  const dom = await setup();
  await pickAddress(dom, "7 Elm Crescent", "Brooklin");
  $$(dom, '[data-act="choose"]')[0].click(); // now on step 3
  $(dom, ".sw-step[data-step='2']").click(); // jump back to step 2
  assert.ok(text(dom).includes("Every plan starts with fibre"));
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
