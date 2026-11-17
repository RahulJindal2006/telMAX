/* =====================================================================
   The "Get started" flow: address, plan, options, your details,
   installation date. Framework-free; initSignup() wires the markup in
   get-started.astro.

   Nothing in this file talks to telMAX. It is a working prototype of
   the ordering experience: every choice is real and every total is
   computed, but no account is made and no order is placed. The last
   screen says so and points to shop.telmax.com.

   How it is put together
     state            everything the visitor has chosen so far
     screen*()        one function per step, each returning HTML
     render()         draws the current step into #sw-body
     onClick/onSubmit one listener each on #sw-body, for every step
     go()             moves to a step, records it in the browser's
                      history (so Back steps back) and moves focus
   ===================================================================== */

import { PLANS, PRICE_SOURCE } from "../data/plans.js";
import { FEES, TV, PHONE, EERO, INTERNET } from "../data/catalog.js";
import { SITE, CONCEPT, AREAS, listOf } from "../data/site.js";
import { esc, attachAddressBox, isServiced, takeAddress, takePlan } from "./address.js";

/* ---- Small helpers -------------------------------------------------- */

const el = (id) => document.getElementById(id);
const money = (n) => Number(n).toFixed(2);

/* 2000 -> "2 Gbps", 500 -> "500 Mbps" */
const speedLabel = (mbps) => (mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`);

const TV_BY_ID = Object.fromEntries(TV.packages.map((p) => [p.id, p]));
const PHONE_BY_ID = Object.fromEntries(PHONE.plans.map((p) => [p.id, p]));

/* ---- Wizard state --------------------------------------------------- */

const state = {
  screen: "address",
  addressLabel: "",
  addressCity: "",
  selected: false,
  services: { internet: true, tv: false, phone: false },
  pick: null, // a plan id chosen on another page before arriving here
  plan: null,
  upgrade: false,
  extraEero: 0,
  account: { firstName: "", lastName: "", phone: "", email: "", emailVerified: false },
  schedule: {
    mode: null,
    cal1: null,
    cal2: null,
    date1: null,
    slot1: null,
    date2: null,
    slot2: null,
  },
};

export const STEPS = [
  { screen: "address", label: "Address" },
  { screen: "services", label: "Plan" },
  { screen: "customize", label: "Options" },
  { screen: "account", label: "Your details" },
  { screen: "schedule", label: "Installation" },
];
const STEP_OF = Object.fromEntries(STEPS.map((s, i) => [s.screen, i + 1]));

const MEMBER_OPTIONS = [
  ["Condominium / Rental Townhouse", "Condominium or rental townhouse"],
  ["Condominium / Rental Apartment", "Condominium or rental apartment"],
  ["Business", "Business"],
  ["N/A", "None of these"],
];

const SLOTS = [
  { id: "morning", label: "8 AM - 12 PM", sub: "Morning" },
  { id: "afternoon", label: "12 PM - 4 PM", sub: "Afternoon" },
  { id: "evening", label: "4 PM - 8 PM", sub: "Evening" },
];

const MAX_EXTENDERS = EERO.coverage.length;

/* ---- Validation ----------------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* The first thing wrong with a set of contact details, as
   { field, message }, or null when they are fine. */
function validatePerson(d) {
  if (!String(d.firstName || "").trim()) return { field: "firstName", message: "Enter your first name." };
  if (!String(d.lastName || "").trim()) return { field: "lastName", message: "Enter your last name." };
  const digits = String(d.phone || "").replace(/\D/g, "").length;
  if (digits < 10 || digits > 15)
    return { field: "phone", message: "Enter a phone number with its area code, like 905-555-0142." };
  if (!EMAIL.test(String(d.email || "").trim()))
    return { field: "email", message: "Enter an email address, like name@example.com." };
  return null;
}

/* Show one problem under a form, mark its field and put the cursor there. */
function showProblem(form, errorEl, problem) {
  form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
  if (!problem) {
    errorEl.hidden = true;
    return;
  }
  errorEl.textContent = problem.message;
  errorEl.hidden = false;
  const field = problem.field && form.querySelector(`[name="${problem.field}"]`);
  if (field) {
    field.setAttribute("aria-invalid", "true");
    focusQuietly(field);
  }
}

/* ---- Pricing -------------------------------------------------------- */

function planKey() {
  const s = state.services;
  if (s.tv && s.phone) return "internet+tv+phone";
  if (s.tv) return "internet+tv";
  if (s.phone) return "internet+phone";
  return "internet";
}

/* What stepping up from 500 Mbps to 2 Gbps adds each month: the gap between the two plans. */
const UPGRADE_PRICE =
  PLANS.internet.find((p) => p.id === "i2000").price - PLANS.internet.find((p) => p.id === "i500").price;

function computeBill() {
  const price = state.plan ? state.plan.price : 0;
  const up = state.upgrade ? UPGRADE_PRICE : 0;
  const fee = FEES.networkAccess;
  const sub = price + up + fee;
  const tax = sub * FEES.hst;
  return { price, up, fee, tax, total: sub + tax };
}

/* Where the plan's price was read. Bundles and internet-only plans differ. */
const priceSource = (plan) => (plan && (plan.tv || plan.phone) ? PRICE_SOURCE.bundle : PRICE_SOURCE.internet);

function coverageLine(n) {
  const row = EERO.coverage.find((c) => c.extenders === n);
  if (!row) return "No extender added.";
  return `${n} extender${n === 1 ? "" : "s"}: up to ${row.sqft} sq. ft.`;
}

function billHTML() {
  const p = state.plan;
  if (!p) return "";
  const b = computeBill();
  const line = (k, v) => `<li><span>${k}</span> <span>${v}</span></li>`;
  return `
    <aside class="sw-bill" aria-label="Your plan and monthly total">
      <h3 class="sw-bill__head">Your plan</h3>
      <p class="sw-bill__name">${esc(p.name)}</p>
      <ul class="sw-bill__lines">
        ${line("Plan", "$" + money(b.price))}
        ${state.upgrade ? line("Internet speed upgrade to 2 Gbps", "$" + money(UPGRADE_PRICE)) : ""}
        ${line("Network access fee", "$" + money(b.fee))}
        ${line(`HST (${Math.round(FEES.hst * 100)}%)`, "$" + money(b.tax))}
      </ul>
      <p class="sw-bill__total">
        <span>Monthly total</span> <strong>$${money(b.total)}</strong>
      </p>
      <ul class="sw-bill__lines sw-bill__lines--also">
        ${line(p.eeroPro ? "eero Pro 7 with eero Secure" : "eero WiFi with eero Secure", "Included")}
        ${state.extraEero ? line(`eero extender &times; ${state.extraEero}`, "Not in total") : ""}
        ${line("Installation", "telMAX confirms")}
      </ul>
      <p class="sw-bill__fine">
        ${esc(priceSource(p))} Prices can change without notice. When a term
        ends you can renew for another.
        <a class="out" href="${SITE.legal.terms}" rel="noopener">telMAX's Terms of Service</a>
      </p>
    </aside>`;
}

/* On a phone the bill sits below the choices, so the total rides along
   at the bottom of the screen until the bill itself comes into view. */
function totalBarHTML() {
  if (!state.plan) return "";
  return `
    <p class="sw-totalbar">
      <span>Monthly total</span>
      <strong>$${money(computeBill().total)}</strong>
      <button type="button" class="sw-linkbtn" data-act="see-bill">See the bill</button>
    </p>`;
}

/* ---- Calendar ------------------------------------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = [
  ["Su", "Sunday"], ["Mo", "Monday"], ["Tu", "Tuesday"], ["We", "Wednesday"],
  ["Th", "Thursday"], ["Fr", "Friday"], ["Sa", "Saturday"],
];

const pad = (n) => (n < 10 ? "0" + n : "" + n);
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function calendarHTML(which) {
  const cal = which === "1" ? state.schedule.cal1 : state.schedule.cal2;
  const selected = which === "1" ? state.schedule.date1 : state.schedule.date2;
  const { y, m } = cal;
  const today = startOfToday();
  const min = new Date(today);
  min.setDate(min.getDate() + 1); // earliest bookable day is tomorrow
  // A second preference can never fall before the first one.
  if (which === "2" && state.schedule.date1) {
    const [dy, dm, dd] = state.schedule.date1.split("-").map(Number);
    const firstPref = new Date(dy, dm - 1, dd);
    if (firstPref > min) min.setTime(firstPref.getTime());
  }
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const atStartMonth = y === today.getFullYear() && m === today.getMonth();

  let cells = "";
  for (let i = 0; i < firstDow; i++) cells += `<span class="sw-cal__cell" aria-hidden="true"></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const dow = date.getDay();
    const iso = isoOf(y, m, d);
    const blocked = dow === 0 || dow === 6 || date < min;
    if (blocked) {
      cells += `<span class="sw-cal__cell sw-cal__day is-off" aria-hidden="true">${d}</span>`;
    } else {
      const on = selected === iso;
      cells += `<button type="button" class="sw-cal__cell sw-cal__day${on ? " is-sel" : ""}"
        data-act="pick-date" data-cal="${which}" data-date="${iso}"
        aria-pressed="${on}" aria-label="${esc(fmtIso(iso))}">${d}</button>`;
    }
  }

  return `
    <div class="sw-cal">
      <div class="sw-cal__nav">
        <button type="button" class="sw-cal__arrow sw-cal__arrow--prev" data-act="cal-nav"
          data-cal="${which}" data-dir="-1" ${atStartMonth ? "disabled" : ""}
          aria-label="Previous month"></button>
        <span class="sw-cal__title" aria-live="polite">${MONTHS[m]} ${y}</span>
        <button type="button" class="sw-cal__arrow sw-cal__arrow--next" data-act="cal-nav"
          data-cal="${which}" data-dir="1" aria-label="Next month"></button>
      </div>
      <div class="sw-cal__dow" aria-hidden="true">${DOW.map(([short]) => `<span>${short}</span>`).join("")}</div>
      <div class="sw-cal__grid">${cells}</div>
    </div>`;
}

function slotsHTML(which, chosen) {
  return `<div class="sw-slots">${SLOTS.map(
    (s) => `
      <button type="button" class="sw-slot${chosen === s.id ? " is-sel" : ""}"
        data-act="slot" data-cal="${which}" data-slot="${s.id}" aria-pressed="${chosen === s.id}">
        <strong>${s.label}</strong><span>${s.sub}</span>
      </button>`,
  ).join("")}</div>`;
}

const slotLabel = (id) => {
  const s = SLOTS.find((x) => x.id === id);
  return s ? `${s.label} (${s.sub})` : "";
};

/* ---- Pieces shared by the screens ----------------------------------- */

/* The mauve note that marks what this prototype does not really do. */
function conceptNote(text) {
  return CONCEPT.on ? `<p class="note note--concept">${esc(text)}</p>` : "";
}

const turnBack = (act) => `<button type="button" class="btn btn--line" data-act="${act}">Back</button>`;

/* Every screen's title can take focus, so a new step starts at its top. */
const title = (text) => `<h2 class="sw-title" tabindex="-1">${text}</h2>`;

const speedPair = (mbps) => {
  const s = speedLabel(mbps);
  return `<span class="speed"><span class="speed__dir"><span class="sr-only">download </span>${s}</span><span class="speed__dir speed__dir--up"><span class="sr-only">upload </span>${s}</span></span>`;
};

/* ---- Screens -------------------------------------------------------- */

function screenAddress() {
  return `
    <div class="sw-screen">
      <div class="sw-address on-green">
        ${title("Enter your address")}
        <p class="sw-address__sub">See whether telMAX pure fibre reaches your home.
        Canadian addresses only.</p>
        <label class="sw-label" for="sw-addr">Street address</label>
        <div class="sw-address__row">
          <div class="sw-ac">
            <span class="sw-ac__icon" aria-hidden="true"></span>
            <input id="sw-addr" class="sw-ac__input" type="text"
              placeholder="Start typing your street address" autocomplete="off"
              autocapitalize="words" spellcheck="false" aria-describedby="sw-addr-hint" />
            <div class="sw-ac__list" id="sw-addr-list" hidden></div>
          </div>
          <button type="button" class="btn btn--go" id="sw-addr-next">Check availability</button>
        </div>
        <p class="sw-error" id="sw-addr-hint" role="alert" hidden></p>
        <p class="sw-address__areas">Serving ${esc(listOf(AREAS))}.</p>
      </div>
    </div>`;
}

function screenNotServiced() {
  return `
    <div class="sw-screen sw-narrow">
      <div class="sw-head">
        ${title("telMAX is not at this address yet")}
        <p>We can't find that address in telMAX's service area. Check that it is
        right, or leave your details to hear when fibre reaches you.</p>
        <p class="sw-at">
          <span>${esc(state.addressLabel)}</span>
          <button type="button" class="sw-linkbtn" data-act="restart">Try another address</button>
        </p>
      </div>
      <div id="sw-ns-body">
        <form class="form sw-form" id="sw-ns-form" novalidate>
          <div class="field-row">
            <label>First name<input name="firstName" autocomplete="given-name" required /></label>
            <label>Last name<input name="lastName" autocomplete="family-name" required /></label>
          </div>
          <div class="field-row">
            <label>Phone number<input name="phone" type="tel" autocomplete="tel" maxlength="20" required /></label>
            <label>Email address<input name="email" type="email" autocomplete="email" required /></label>
          </div>
          <label>Is this a condominium, a rental or a business?
            <select name="member" required>
              <option value="">Choose one</option>
              ${MEMBER_OPTIONS.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("")}
            </select>
          </label>
          <label class="sw-consent">
            <input type="checkbox" name="consent" required />
            <span>telMAX may contact me by email, phone or text about fibre internet
            in my area. I can opt out at any time.
            <a class="link out" href="${SITE.legal.privacy}" rel="noopener">telMAX's Privacy Policy</a></span>
          </label>
          <p class="sw-error" id="sw-ns-err" role="alert" hidden></p>
          ${conceptNote("This prototype does not send the form. Nothing you type here leaves this page.")}
          <div class="sw-actions">
            <button type="submit" class="btn btn--primary">Send</button>
          </div>
        </form>
      </div>
    </div>`;
}

function planHTML(p, primary) {
  const rows = [["Internet", speedPair(p.mbps)]];
  if (p.tv && TV_BY_ID[p.tv]) {
    const t = TV_BY_ID[p.tv];
    rows.push(["TV", `${esc(t.name)}<span class="sw-plan__more">${esc(t.channels)} channels</span>`]);
  }
  if (p.phone && PHONE_BY_ID[p.phone]) {
    const ph = PHONE_BY_ID[p.phone];
    rows.push([
      "Phone",
      `${esc(ph.name)}<span class="sw-plan__more">Unlimited calling across ${esc(ph.reach)}</span>`,
    ]);
  }
  if (p.eeroPro) rows.push(["WiFi", "eero Pro&nbsp;7, a WiFi&nbsp;7 system"]);

  const picked = state.pick === p.id;
  const flag = picked ? "Your pick" : p.popular ? "Most popular" : "";
  return `
    <article class="sw-plan${p.popular ? " is-popular" : ""}${picked ? " is-pick" : ""}">
      <p class="sw-plan__flag">${flag}</p>
      <h3 class="sw-plan__name">${esc(p.name)}</h3>
      <dl class="sw-plan__rows">
        ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
      </dl>
      <p class="sw-plan__price"><span class="price">$${money(p.price)}<small>/mo</small></span></p>
      <p class="sw-plan__term">$${money(p.price + FEES.networkAccess)} with the $${FEES.networkAccess} network fee, before tax</p>
      <button type="button" class="btn ${primary ? "btn--primary" : "btn--line"} btn--wide sw-plan__btn"
        data-act="choose" data-plan="${p.id}">Choose plan<span class="sr-only">: ${esc(p.name)}</span></button>
    </article>`;
}

function screenServices() {
  const s = state.services;
  const svc = (key, name, sub, locked) => `
    <button type="button" class="sw-svc${s[key] ? " is-on" : ""}${locked ? " is-locked" : ""}"
      ${locked ? `disabled aria-pressed="true"` : `data-act="svc" data-svc="${key}" aria-pressed="${s[key]}"`}>
      <span class="sw-svc__check" aria-hidden="true"></span>
      <span class="sw-svc__name">${name}</span>
      <span class="sw-svc__sub">${sub}</span>
    </button>`;

  const key = planKey();
  const plans = PLANS[key];
  // One plan gets the solid button: the one picked on the way here, else the most popular.
  const lead = plans.find((p) => p.id === state.pick) || plans.find((p) => p.popular) || plans[0];
  const top = INTERNET.plans.find((p) => p.from);

  return `
    <div class="sw-screen">
      <div class="sw-head">
        <p class="sw-at">
          <span>telMAX serves ${esc(state.addressCity)}. Installing at ${esc(state.addressLabel)}</span>
          <button type="button" class="sw-linkbtn" data-act="restart">Change address</button>
        </p>
        ${title("Every plan starts with fibre")}
        <p>Internet is part of every plan. Add TV or Home Phone to see the bundles.</p>
      </div>
      <div class="sw-services" role="group" aria-label="Services in your plan">
        ${svc("internet", "Internet", "Pure fibre, always included", true)}
        ${svc("tv", "TV", "MAXview TV", false)}
        ${svc("phone", "Home Phone", "MAXtalk", false)}
      </div>
      <div class="sw-plans" style="--n:${plans.length}" aria-live="polite">
        ${plans.map((p) => planHTML(p, p === lead)).join("")}
      </div>
      <div class="sw-incl">
        <h3>With every plan</h3>
        <ul class="ticks">
          ${INTERNET.included.map((i) => `<li>${esc(i.title)}</li>`).join("")}
        </ul>
      </div>
      ${
        key === "internet" && top
          ? `<p class="sw-more">Need more? ${esc(top.name)} reaches up to ${esc(top.speed)},
             from $${money(top.price)} a month. <a class="link" href="/contact">Ask telMAX</a></p>`
          : ""
      }
      <p class="sw-source">${esc(key === "internet" ? PRICE_SOURCE.internet : PRICE_SOURCE.bundle)}</p>
    </div>`;
}

function screenCustomize() {
  const p = state.plan;
  const canUpgrade = p && p.speed === "500 Mbps";
  const n = state.extraEero;
  return `
    <div class="sw-screen sw-grid2">
      <div class="sw-col">
        <div class="sw-head">
          ${title("Fit it to your home")}
        </div>
        ${
          canUpgrade
            ? `<section class="sw-opt">
                 <h3>Internet speed</h3>
                 <div class="sw-upg">
                   <div class="sw-upg__text">
                     <strong>Step up to 2 Gbps</strong>
                     <span>Four times the speed for $${money(UPGRADE_PRICE)} more a month.</span>
                   </div>
                   <button type="button" class="btn btn--sm ${state.upgrade ? "btn--primary" : "btn--line"} sw-upg__btn${
                     state.upgrade ? " is-on" : ""
                   }" data-act="upgrade" aria-pressed="${state.upgrade}">${state.upgrade ? "Added" : "Add"}</button>
                 </div>
               </section>`
            : ""
        }
        <section class="sw-opt">
          <h3>WiFi coverage</h3>
          <p class="sw-muted">${p && p.eeroPro ? "An eero Pro 7 system" : "An eero WiFi system"} comes with
          your plan. A larger home, or one with an unusual layout, can add extenders.</p>
          <div class="sw-eero">
            <div class="sw-stepper" role="group" aria-label="eero extenders">
              <button type="button" data-act="eero-" aria-label="Remove an extender"
                ${n === 0 ? "disabled" : ""}><span aria-hidden="true">&minus;</span></button>
              <span class="sw-stepper__val" aria-live="polite">${n}<span class="sr-only"> extender${n === 1 ? "" : "s"}</span></span>
              <button type="button" data-act="eero+" aria-label="Add an extender"
                ${n >= MAX_EXTENDERS ? "disabled" : ""}><span aria-hidden="true">+</span></button>
            </div>
            <p class="sw-eero__cover">${esc(coverageLine(n))}</p>
          </div>
          <p class="sw-fine">One extender is free for 6 months in telMAX's current offer.
          telMAX does not list a price for extenders, so they are left out of the total.</p>
        </section>
        <div class="sw-actions">
          ${turnBack("back-services")}
          <button type="button" class="btn btn--primary" data-act="to-account">Next: your details</button>
        </div>
      </div>
      ${totalBarHTML()}
      <div class="sw-col" id="sw-bill-col" tabindex="-1">${billHTML()}</div>
    </div>`;
}

/* The email check. Front-end only: "Verify" shows a code on screen,
   which the visitor types back. */
function verifyHTML(a) {
  if (a.emailVerified) return `<span class="sw-verify__ok">Email verified</span>`;
  return `<button type="button" class="sw-linkbtn" data-act="verify-email">Verify this email address</button>`;
}

function screenAccount() {
  const a = state.account;
  return `
    <div class="sw-screen sw-grid2">
      <div class="sw-col">
        <div class="sw-head">
          ${title("Your details")}
          <p>Who the installation is for, and where the confirmation goes.</p>
        </div>
        <p class="sw-at sw-at--plain">
          <span>Installing at ${esc(state.addressLabel)}</span>
        </p>
        <form class="form sw-form" id="sw-account-form" novalidate>
          <div class="field-row">
            <label>First name
              <input name="firstName" autocomplete="given-name" value="${esc(a.firstName)}" required />
            </label>
            <label>Last name
              <input name="lastName" autocomplete="family-name" value="${esc(a.lastName)}" required />
            </label>
          </div>
          <label>Phone number
            <input name="phone" type="tel" autocomplete="tel" maxlength="20" value="${esc(a.phone)}" required />
          </label>
          <label>Email address
            <input name="email" type="email" autocomplete="email" value="${esc(a.email)}" required />
          </label>
          <div class="sw-verify" id="sw-verify">${verifyHTML(a)}</div>
          <p class="sw-error" id="sw-account-err" role="alert" hidden></p>
          ${conceptNote("Nothing you type here leaves this page. This prototype makes no account.")}
          <div class="sw-actions">
            ${turnBack("back-customize")}
            <button type="submit" class="btn btn--primary">Next: installation</button>
          </div>
        </form>
      </div>
      ${totalBarHTML()}
      <div class="sw-col" id="sw-bill-col" tabindex="-1">${billHTML()}</div>
    </div>`;
}

function screenSchedule() {
  const sc = state.schedule;
  const mode = sc.mode;

  let detail = "";
  if (mode === "next") {
    detail = `
      <div class="sw-sched-note">
        <strong>Earliest available appointment</strong>
        <p>telMAX books the next open installation and confirms the date and
        time window by email.</p>
      </div>`;
  } else if (mode === "specific") {
    const choice = (which, heading, date, slot) => `
      <div class="sw-choice">
        <h3>${heading}</h3>
        ${calendarHTML(which)}
        ${date ? `<p class="sw-pick-summary">${esc(fmtIso(date))}</p>${slotsHTML(which, slot)}` : ""}
      </div>`;
    detail = `
      <div class="sw-sched-pick">
        ${choice("1", "First choice", sc.date1, sc.slot1)}
        ${
          sc.date1 && sc.slot1
            ? choice("2", "Second choice", sc.date2, sc.slot2)
            : `<div class="sw-choice sw-choice--wait">
                 <h3>Second choice</h3>
                 <p class="sw-muted">Pick a first day and a time window, then choose a second.</p>
               </div>`
        }
      </div>`;
  }

  const canSubmit = mode === "next" || (mode === "specific" && sc.date1 && sc.slot1 && sc.date2 && sc.slot2);

  return `
    <div class="sw-screen sw-sched">
      <div class="sw-head">
        ${title("Schedule your installation")}
        <p>Take the first opening, or ask for two dates that suit you.</p>
      </div>
      <div class="sw-modes" role="group" aria-label="How to book">
        <button type="button" class="sw-mode${mode === "next" ? " is-on" : ""}"
          data-act="mode" data-mode="next" aria-pressed="${mode === "next"}">
          <strong>Next available</strong>
          <span>The earliest open appointment.</span>
        </button>
        <button type="button" class="sw-mode${mode === "specific" ? " is-on" : ""}"
          data-act="mode" data-mode="specific" aria-pressed="${mode === "specific"}">
          <strong>Choose dates</strong>
          <span>Two days and time windows you prefer.</span>
        </button>
      </div>
      ${detail}
      ${
        mode === "specific"
          ? conceptNote(
              "The open days and time windows here are samples. telMAX's own installation calendar would fill them in.",
            )
          : ""
      }
      <div class="sw-actions">
        ${turnBack("back-account")}
        <button type="button" class="btn btn--primary" data-act="finish"
          ${canSubmit ? "" : "disabled"}>Confirm installation</button>
      </div>
    </div>`;
}

function screenDone() {
  const sc = state.schedule;
  let when = "Earliest available appointment";
  if (sc.mode === "specific" && sc.date1 && sc.date2) {
    when = `First choice: ${esc(fmtIso(sc.date1))}, ${esc(slotLabel(sc.slot1))}<br />
            Second choice: ${esc(fmtIso(sc.date2))}, ${esc(slotLabel(sc.slot2))}`;
  }
  const name = esc(state.account.firstName.trim());
  /* On the concept site this screen says what is true: nothing was ordered.
     The real ending, for when telMAX wires the flow to its systems, is the
     other branch. */
  const ending = CONCEPT.on
    ? `<p class="sw-done__lead">That is the whole order, start to finish.</p>
       ${conceptNote(
         "This is a concept site, so no order was placed, no account was made and nothing you entered was sent or kept. To order telMAX for real, use telMAX's own shop.",
       )}`
    : `<p class="sw-done__lead">Thanks for choosing telMAX pure fibre. Your
       order has been received.</p>`;
  const next = CONCEPT.on
    ? `<a href="${SITE.shop}" class="btn btn--go btn--lg sw-done__cta out" rel="noopener">Order at shop.telmax.com</a>`
    : `<p class="sw-done__confirm">A confirmation email with every detail of your
       order and your installation appointment is on its way.</p>
       <a href="${SITE.portal}" class="btn btn--primary btn--lg sw-done__cta">Go to My telMAX</a>`;
  return `
    <div class="sw-screen sw-narrow sw-done">
      <div class="sw-head">
        <span class="sw-done__badge" aria-hidden="true"></span>
        ${title(`You're all set${name ? `, ${name}` : ""}.`)}
        ${ending}
      </div>
      <dl class="sw-done__summary">
        <div><dt>Address</dt><dd>${esc(state.addressLabel)}</dd></div>
        <div><dt>Plan</dt><dd>${esc(state.plan ? state.plan.name : "")}${
          state.upgrade ? ", with the step up to 2 Gbps" : ""
        }</dd></div>
        <div><dt>Monthly total</dt><dd>$${money(computeBill().total)} with the network fee and HST</dd></div>
        <div><dt>Installation</dt><dd>${when}</dd></div>
      </dl>
      ${next}
    </div>`;
}

/* The first step as plain HTML, so the page can carry it before any script
   runs and nothing jumps when the flow starts. */
export const firstScreen = () => screenAddress();

const SCREENS = {
  address: screenAddress,
  "not-serviced": screenNotServiced,
  services: screenServices,
  customize: screenCustomize,
  account: screenAccount,
  schedule: screenSchedule,
  done: screenDone,
};

/* ---- Drawing -------------------------------------------------------- */

function updateStepper() {
  const current = STEP_OF[state.screen] || (state.screen === "done" ? STEPS.length + 1 : 1);
  document.querySelectorAll(".sw-step").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("is-done", n < current);
    li.classList.toggle("is-active", n === current);
    li.classList.toggle("is-todo", n > current);
    if (n === current) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
    // A finished step is a way back; the others are not buttons yet.
    const btn = li.querySelector("button");
    if (btn) btn.disabled = !(n < current);
  });
  const now = el("sw-now");
  if (now) {
    now.textContent =
      current > STEPS.length
        ? "All five steps done"
        : `Step ${current} of ${STEPS.length}: ${STEPS[current - 1].label}`;
  }
}

function render() {
  const body = el("sw-body");
  if (!body) return;
  body.innerHTML = (SCREENS[state.screen] || screenAddress)();
  updateStepper();
  if (state.screen === "address") wireAddress();
}

function focusQuietly(node) {
  if (!node) return;
  try {
    node.focus({ preventScroll: true });
  } catch (e) {
    /* focus is best-effort */
  }
}

/* What to look for after a redraw to put focus back where it was. */
function focusKey(node) {
  if (node.id) return `#${node.id}`;
  const d = node.dataset || {};
  if (!d.act) return null;
  let sel = `[data-act="${d.act}"]`;
  for (const k of ["svc", "plan", "mode", "cal", "dir", "date", "slot"]) {
    if (d[k] != null) sel += `[data-${k}="${d[k]}"]`;
  }
  return sel;
}

/* Redraw the step the visitor is on, keeping the keyboard where it was. */
function redraw() {
  const body = el("sw-body");
  if (!body) return;
  const active = document.activeElement;
  const key = active && body.contains(active) ? focusKey(active) : null;
  render();
  if (!key) return;
  const again = body.querySelector(key);
  if (again && !again.disabled) focusQuietly(again);
  else focusQuietly(body.querySelector(".sw-title"));
}

const calm = () => {
  try {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
};

/* Whether a step can be shown yet: used when the browser's Back and
   Forward buttons ask for one. */
function reachable(screen) {
  const here = state.selected && state.addressLabel;
  const sc = state.schedule;
  switch (screen) {
    case "address":
      return true;
    case "not-serviced":
      return !!here && !isServiced(state.addressCity);
    case "services":
      return !!here && isServiced(state.addressCity);
    case "customize":
    case "account":
      return !!state.plan;
    case "schedule":
      return !!state.plan && !!state.account.firstName;
    case "done":
      return (
        !!state.plan &&
        !!state.account.firstName &&
        (sc.mode === "next" || (sc.mode === "specific" && !!(sc.date1 && sc.slot1 && sc.date2 && sc.slot2)))
      );
    default:
      return false;
  }
}

function show(screen) {
  state.screen = screen;
  if (screen === "account") sentCode = null;
  render();
  focusQuietly(el("sw-body").querySelector(".sw-title"));
  // Bring the row of steps to the top, so each step opens at the same place.
  const anchor = el("sw-now") || el("sw-steps") || el("signup-wizard");
  if (anchor && anchor.scrollIntoView) {
    anchor.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
  }
}

/* Move to a step. Each move is one entry in the browser's history, so
   the Back button steps back through the flow instead of leaving it. */
function go(screen) {
  show(screen);
  try {
    window.history.pushState({ swScreen: screen }, "");
  } catch (e) {
    /* history is unavailable: the flow still works, Back just leaves the page */
  }
}

/* ---- Step 1: the address box ---------------------------------------- */

let addressBox = null;

function setAddressHint(message) {
  const hint = el("sw-addr-hint");
  if (!hint) return;
  hint.hidden = message == null;
  hint.textContent = message == null ? "" : message;
}

function wireAddress() {
  const input = el("sw-addr");
  const list = el("sw-addr-list");
  if (!input || !list) return;
  if (state.addressLabel) input.value = state.addressLabel;

  addressBox = attachAddressBox({
    input,
    list,
    onType() {
      state.selected = false;
      setAddressHint(null);
    },
    onPick(address) {
      state.addressLabel = address.label;
      state.addressCity = address.city;
      state.selected = true;
      advanceFromAddress();
    },
  });

  el("sw-addr-next").addEventListener("click", () => {
    if (!state.selected) {
      setAddressHint("Choose your address from the suggestions.");
      input.focus();
      return;
    }
    advanceFromAddress();
  });
}

function advanceFromAddress() {
  if (isServiced(state.addressCity)) go("services");
  else go("not-serviced");
}

/* ---- The email check (step 4) ---------------------------------------- */

let sentCode = null;

function showVerifySent(email) {
  sentCode = String(Math.floor(100000 + Math.random() * 900000));
  const box = el("sw-verify");
  if (!box) return;
  box.innerHTML = `
    <div class="sw-verify__sent">
      <p class="sw-verify__hint">
        telMAX would email a 6-digit code to <strong>${esc(email)}</strong>.
        <span class="sw-verify__demo">This prototype sends no email. Your code is ${sentCode}</span>
      </p>
      <div class="sw-verify__row">
        <label class="sr-only" for="sw-verify-code">The 6-digit code</label>
        <input type="text" inputmode="numeric" maxlength="6" class="sw-verify__code"
          id="sw-verify-code" autocomplete="one-time-code" />
        <button type="button" class="btn btn--sm btn--line" data-act="verify-confirm">Confirm</button>
        <button type="button" class="sw-linkbtn" data-act="verify-resend">New code</button>
      </div>
      <p class="sw-error" id="sw-verify-err" role="alert" hidden></p>
    </div>`;
  focusQuietly(el("sw-verify-code"));
}

function confirmVerify() {
  const code = el("sw-verify-code");
  if (!code) return;
  if (sentCode && code.value.trim() === sentCode) {
    state.account.emailVerified = true;
    sentCode = null;
    const box = el("sw-verify");
    if (box) box.innerHTML = verifyHTML(state.account);
  } else {
    const err = el("sw-verify-err");
    if (err) {
      err.textContent = "That code does not match. Check it and try again.";
      err.hidden = false;
    }
    focusQuietly(code);
  }
}

function startVerify() {
  const form = el("sw-account-form");
  if (!form) return;
  const emailInput = form.querySelector('input[name="email"]');
  const email = String((emailInput && emailInput.value) || "").trim();
  if (!EMAIL.test(email)) {
    showProblem(form, el("sw-account-err"), {
      field: "email",
      message: "Enter your email address first, like name@example.com.",
    });
    return;
  }
  state.account.email = email;
  showVerifySent(email);
}

/* ---- Every click in the flow ---------------------------------------- */

function navCalendar(which, dir) {
  const cal = which === "1" ? state.schedule.cal1 : state.schedule.cal2;
  if (!cal) return;
  let m = cal.m + dir;
  let y = cal.y;
  if (m < 0) {
    m = 11;
    y -= 1;
  }
  if (m > 11) {
    m = 0;
    y += 1;
  }
  const today = startOfToday();
  if (y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth())) return;
  cal.m = m;
  cal.y = y;
}

function onClick(e) {
  const btn = e.target.closest("[data-act]");
  if (!btn || btn.disabled) return;
  const sc = state.schedule;
  const d = btn.dataset;

  switch (d.act) {
    /* step 1 and the "not in your area" screen */
    case "restart":
      state.addressLabel = "";
      state.addressCity = "";
      state.selected = false;
      go("address");
      break;

    /* step 2 */
    case "svc":
      if (d.svc === "tv" || d.svc === "phone") {
        state.services[d.svc] = !state.services[d.svc];
        redraw();
      }
      break;
    case "choose": {
      const plan = PLANS[planKey()].find((p) => p.id === d.plan);
      if (plan) {
        state.plan = plan;
        state.upgrade = false;
        state.extraEero = 0;
        go("customize");
      }
      break;
    }

    /* step 3 */
    case "upgrade":
      state.upgrade = !state.upgrade;
      redraw();
      break;
    case "eero-":
      state.extraEero = Math.max(0, state.extraEero - 1);
      redraw();
      break;
    case "eero+":
      state.extraEero = Math.min(MAX_EXTENDERS, state.extraEero + 1);
      redraw();
      break;
    case "see-bill": {
      const bill = el("sw-bill-col");
      if (bill) {
        if (bill.scrollIntoView) bill.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
        focusQuietly(bill);
      }
      break;
    }
    case "back-services":
      go("services");
      break;
    case "to-account":
      go("account");
      break;

    /* step 4 */
    case "verify-email":
    case "verify-resend":
      startVerify();
      break;
    case "verify-confirm":
      confirmVerify();
      break;
    case "back-customize":
      go("customize");
      break;

    /* step 5 */
    case "mode":
      sc.mode = d.mode === "specific" ? "specific" : "next";
      if (sc.mode === "specific" && !sc.cal1) {
        const t = startOfToday();
        sc.cal1 = { y: t.getFullYear(), m: t.getMonth() };
        sc.cal2 = { y: t.getFullYear(), m: t.getMonth() };
      }
      redraw();
      break;
    case "cal-nav":
      navCalendar(d.cal, Number(d.dir));
      redraw();
      break;
    case "pick-date":
      if (d.cal === "1") {
        sc.date1 = d.date;
        // Moving the first choice later can strand an earlier second choice.
        if (sc.date2 && sc.date2 < sc.date1) {
          sc.date2 = null;
          sc.slot2 = null;
        }
      } else {
        sc.date2 = d.date;
      }
      redraw();
      break;
    case "slot":
      if (!SLOTS.some((s) => s.id === d.slot)) break;
      if (d.cal === "1") sc.slot1 = d.slot;
      else sc.slot2 = d.slot;
      redraw();
      break;
    case "back-account":
      go("account");
      break;
    case "finish":
      if (reachable("done")) go("done");
      break;
  }
}

/* ---- The two forms -------------------------------------------------- */

function formValues(form) {
  const values = {};
  form.querySelectorAll("input, select").forEach((node) => {
    if (node.name) values[node.name] = node.value;
  });
  return values;
}

function submitNotServiced(form) {
  const values = formValues(form);
  let problem = validatePerson(values);
  if (!problem && !values.member)
    problem = { field: "member", message: "Choose the option that fits this address." };
  if (!problem && !form.querySelector('input[name="consent"]').checked)
    problem = { field: "consent", message: "Tick the box to agree to be contacted." };
  showProblem(form, el("sw-ns-err"), problem);
  if (problem) return;

  const body = el("sw-ns-body");
  body.innerHTML = `
    <div class="sw-ns-done">
      <span class="sw-done__badge" aria-hidden="true"></span>
      <h3 tabindex="-1">Thanks, you're on the list.</h3>
      <p>${
        CONCEPT.on
          ? "That is what a visitor would see. On this concept site your details were not sent or kept."
          : "telMAX will be in touch when pure fibre reaches your neighbourhood."
      }</p>
      <a href="/" class="btn btn--primary">Back to the home page</a>
    </div>`;
  focusQuietly(body.querySelector("h3"));
}

function submitAccount(form) {
  const values = formValues(form);
  const problem = validatePerson(values);
  showProblem(form, el("sw-account-err"), problem);
  if (problem) return;
  state.account = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    emailVerified: state.account.emailVerified,
  };
  go("schedule");
}

function onSubmit(e) {
  const form = e.target;
  if (!form || !form.id) return;
  if (form.id === "sw-ns-form") {
    e.preventDefault();
    submitNotServiced(form);
  } else if (form.id === "sw-account-form") {
    e.preventDefault();
    submitAccount(form);
  }
}

function onInput(e) {
  const node = e.target;
  const form = node && node.closest ? node.closest("form") : null;
  if (!form) return;
  // Typing clears the message about the last attempt.
  const err = form.querySelector(".sw-error[id$='-err']:not(#sw-verify-err)");
  if (err) err.hidden = true;
  if (node.hasAttribute && node.hasAttribute("aria-invalid")) node.removeAttribute("aria-invalid");
  // A changed email is no longer the one that was checked.
  if (form.id === "sw-account-form" && node.name === "email" && (state.account.emailVerified || sentCode)) {
    state.account.emailVerified = false;
    sentCode = null;
    const box = el("sw-verify");
    if (box) box.innerHTML = verifyHTML(state.account);
  }
}

function onKeydown(e) {
  // Enter in the code box confirms the code instead of sending the whole form.
  if (e.key === "Enter" && e.target && e.target.id === "sw-verify-code") {
    e.preventDefault();
    confirmVerify();
  }
}

/* ---- Init ----------------------------------------------------------- */

export function initSignup() {
  const wrap = el("signup-wizard");
  const body = el("sw-body");
  if (!wrap || !body) return;

  body.addEventListener("click", onClick);
  body.addEventListener("submit", onSubmit);
  body.addEventListener("input", onInput);
  body.addEventListener("keydown", onKeydown);

  // A finished step in the row at the top is a way back to it.
  const steps = el("sw-steps");
  if (steps) {
    steps.addEventListener("click", (e) => {
      const li = e.target.closest(".sw-step");
      if (!li || !li.classList.contains("is-done")) return;
      const step = STEPS[Number(li.dataset.step) - 1];
      if (step && reachable(step.screen)) go(step.screen);
    });
  }

  // Close the address suggestions when clicking elsewhere.
  document.addEventListener("click", (e) => {
    if (state.screen !== "address") return;
    if (!e.target.closest(".sw-ac") && addressBox) addressBox.close();
  });

  // The browser's Back and Forward buttons move between steps.
  window.addEventListener("popstate", (e) => {
    const wanted = e.state && e.state.swScreen;
    if (!wanted || !SCREENS[wanted]) return;
    show(reachable(wanted) ? wanted : "address");
  });

  // An address checked on another page, and a plan chosen there, arrive with the visitor.
  state.pick = takePlan();
  const waiting = takeAddress();
  if (waiting) {
    state.addressLabel = waiting.label;
    state.addressCity = waiting.city;
    state.selected = true;
    state.screen = isServiced(waiting.city) ? "services" : "not-serviced";
  }

  try {
    window.history.replaceState({ swScreen: state.screen }, "");
  } catch (e) {
    /* see go() */
  }
  render();
}
