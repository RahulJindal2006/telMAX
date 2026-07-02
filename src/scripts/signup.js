/* =====================================================================
   telMAX "Get started" signup wizard - framework-free.
   initSignup() wires the markup shell in get-started.astro.
   Address autocomplete uses the free OpenStreetMap "Photon" geocoder
   (photon.komoot.io) - no API key, real Canadian addresses with their
   real city + postal code. Swap in a paid provider (Canada Post
   AddressComplete, Google Places) later if you need fuller coverage.
   ===================================================================== */

import { PLANS, SERVICED_CITIES } from "../data/plans.js";

/* ---- Small helpers -------------------------------------------------- */

const el = (id) => document.getElementById(id);
const money = (n) => Number(n).toFixed(2);
function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

/* ---- Address autocomplete (OpenStreetMap / Photon) ------------------ */

// Canadian province names -> two-letter codes for tidy display labels.
const PROVINCES = {
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Northwest Territories": "NT",
  "Nova Scotia": "NS",
  Nunavut: "NU",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Québec: "QC",
  Saskatchewan: "SK",
  "Yukon": "YT",
};

// Bounding box of Canada (minLon, minLat, maxLon, maxLat) to keep results local.
const CANADA_BBOX = "-141.0,41.7,-52.6,83.1";

/* Turn Photon GeoJSON features into clean, de-duplicated suggestions.
   Each becomes { city, label } where `city` drives the service-area check
   and `label` is what we show + store as the installation address. */
function parseFeatures(features) {
  if (!Array.isArray(features)) return [];
  const seen = new Set();
  const out = [];
  for (const f of features) {
    const p = (f && f.properties) || {};
    if (p.countrycode && p.countrycode !== "CA") continue;
    const city =
      p.city || p.town || p.village || p.municipality || p.county || "";
    if (!city) continue;
    const street = p.street || p.name || "";
    const num = p.housenumber ? `${p.housenumber} ` : "";
    const prov = PROVINCES[p.state] || p.state || "";
    const postal = p.postcode ? ` ${p.postcode}` : "";
    const label = `${num}${street ? street + ", " : ""}${city}, ${prov}${postal}`
      .replace(/\s+/g, " ")
      .replace(/\s+,/g, ",")
      .trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ city, label });
    if (out.length >= 6) break;
  }
  return out;
}

/* Query the free Photon geocoder. Returns a list of { city, label }.
   Throws on network failure so the caller can show a friendly message. */
async function searchAddresses(query, signal) {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    "https://photon.komoot.io/api/?" +
    `q=${encodeURIComponent(q)}&lang=en&limit=10&bbox=${CANADA_BBOX}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Address lookup failed (${res.status})`);
  const data = await res.json();
  return parseFeatures(data.features);
}

/* ---- Wizard state --------------------------------------------------- */

const state = {
  screen: "address",
  addressLabel: "",
  addressCity: "",
  selected: false,
  services: { internet: true, tv: false, phone: false },
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

const STEP_OF = { address: 1, services: 2, customize: 3, account: 4, schedule: 5 };
const SCREEN_OF_STEP = {
  1: "address",
  2: "services",
  3: "customize",
  4: "account",
  5: "schedule",
};

const MEMBER_OPTIONS = [
  "Condominium / Rental Townhouse",
  "Condominium / Rental Apartment",
  "Business",
  "N/A",
];

const SLOTS = [
  { id: "morning", label: "8 AM - 12 PM", sub: "Morning" },
  { id: "afternoon", label: "12 PM - 4 PM", sub: "Afternoon" },
  { id: "evening", label: "4 PM - 8 PM", sub: "Evening" },
];

/* ---- Validation ----------------------------------------------------- */

function validatePerson(d) {
  if (!String(d.firstName || "").trim()) return "Please enter your first name.";
  if (!String(d.lastName || "").trim()) return "Please enter your last name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || "").trim()))
    return "Please enter a valid email address.";
  if (String(d.phone || "").replace(/\D/g, "").length < 7)
    return "Please enter a valid phone number.";
  return null;
}

/* ---- Pricing -------------------------------------------------------- */

function planKey() {
  const s = state.services;
  if (s.tv && s.phone) return "internet+tv+phone";
  if (s.tv) return "internet+tv";
  if (s.phone) return "internet+phone";
  return "internet";
}

function computeBill() {
  const price = state.plan ? state.plan.price : 0;
  const up = state.upgrade ? 10 : 0;
  const fee = 4;
  const sub = price + up + fee;
  const tax = sub * 0.13;
  return { price, up, fee, tax, total: sub + tax };
}

function billHTML() {
  const p = state.plan;
  if (!p) return "";
  const b = computeBill();
  const line = (k, v) => `<li><span>${k}</span><span>${v}</span></li>`;
  return `
    <aside class="sw-bill">
      <div class="sw-bill__head">Your plan</div>
      <div class="sw-bill__body">
        <div class="sw-bill__name">${esc(p.name)}</div>
        <div class="sw-bill__total">
          <span>Monthly total</span><strong>$${money(b.total)}</strong>
        </div>
        <div class="sw-bill__sub">Monthly charges</div>
        <ul class="sw-bill__lines">
          ${line(esc(p.name), "$" + money(b.price))}
          ${state.upgrade ? line("Internet speed upgrade (2.0 Gbps)", "$10.00") : ""}
          ${line("eero Wi-Fi Extender", "Included")}
          ${
            state.extraEero
              ? line(`Additional eero Wi-Fi Extender x${state.extraEero}`, "$0.00")
              : ""
          }
          ${line("Email (Paperless Billing)", "Included")}
          ${line("Network Access Fee", "$4.00")}
          ${line("Tax (13%)", "$" + money(b.tax))}
        </ul>
        <div class="sw-bill__sub">One-time charges</div>
        <ul class="sw-bill__lines">
          ${line("Installation", "$200.00")}
          ${line("Installation (waived)", "-$200.00")}
        </ul>
        <p class="sw-bill__fine">
          Prices are subject to change. Upon completion of your initial term you
          can renew for another term. See telMAX's
          <a href="/terms">Terms and Conditions</a>. Autopay required.
        </p>
      </div>
    </aside>`;
}

/* ---- Calendar ------------------------------------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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
  const atStartMonth =
    y === today.getFullYear() && m === today.getMonth();

  let cells = "";
  for (let i = 0; i < firstDow; i++) cells += `<span class="sw-cal__cell"></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const dow = date.getDay();
    const iso = isoOf(y, m, d);
    const blocked = dow === 0 || dow === 6 || date < min;
    if (blocked) {
      cells += `<span class="sw-cal__cell sw-cal__day is-off">${d}</span>`;
    } else {
      cells += `<button type="button" class="sw-cal__cell sw-cal__day${
        selected === iso ? " is-sel" : ""
      }" data-act="pick-date" data-cal="${which}" data-date="${iso}">${d}</button>`;
    }
  }

  return `
    <div class="sw-cal">
      <div class="sw-cal__nav">
        <button type="button" class="sw-cal__arrow" data-act="cal-nav"
          data-cal="${which}" data-dir="-1" ${atStartMonth ? "disabled" : ""}
          aria-label="Previous month">&lsaquo;</button>
        <span class="sw-cal__title">${MONTHS[m]} ${y}</span>
        <button type="button" class="sw-cal__arrow" data-act="cal-nav"
          data-cal="${which}" data-dir="1" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="sw-cal__dow">${DOW.map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="sw-cal__grid">${cells}</div>
      <p class="sw-cal__note">Installations run Monday to Friday.</p>
    </div>`;
}

function slotsHTML(which, chosen) {
  return `<div class="sw-slots">${SLOTS.map(
    (s) => `
      <button type="button" class="sw-slot${chosen === s.id ? " is-sel" : ""}"
        data-act="slot" data-cal="${which}" data-slot="${s.id}">
        <strong>${s.label}</strong><span>${s.sub}</span>
      </button>`,
  ).join("")}</div>`;
}

const slotLabel = (id) => {
  const s = SLOTS.find((x) => x.id === id);
  return s ? `${s.label} (${s.sub})` : "";
};

/* ---- Screen renderers ---------------------------------------------- */

function turnBack(act) {
  return `<button type="button" class="btn btn--outline" data-act="${act}">Back</button>`;
}

function screenAddress() {
  return `
    <div class="sw-screen">
      <div class="sw-panel sw-panel--dark">
        <h2 class="sw-panel__title">
          Enter your address to see <span class="sw-em">telMAX</span> offers
        </h2>
        <p class="sw-panel__sub">
          We'll instantly check pure fibre availability at your home.
          Canadian addresses only.
        </p>
        <div class="sw-ac">
          <span class="sw-ac__icon" aria-hidden="true"></span>
          <input id="sw-addr" class="sw-ac__input" type="text"
            placeholder="Start typing your address..." autocomplete="off"
            aria-label="Your address" />
          <div class="sw-ac__list" id="sw-addr-list" role="listbox" hidden></div>
        </div>
        <p class="sw-error" id="sw-addr-hint" hidden>
          Please choose an address from the suggestions.
        </p>
        <div class="sw-actions">
          <button type="button" class="btn btn--lime" id="sw-addr-next">
            Check availability
          </button>
        </div>
      </div>
    </div>`;
}

function screenNotServiced() {
  return `
    <div class="sw-screen">
      <div class="sw-card">
        <div class="sw-card__head">We're not in your area yet</div>
        <div class="sw-card__body" id="sw-ns-body">
          <p class="sw-ns-lead">
            Sorry, we can't find that address in our service area - please double
            check the details are correct. telMAX is expanding to serve more people
            with Canada's fastest pure fibre internet, and we'll let you know the
            moment we're available in your area.
          </p>
          <form class="sw-form" id="sw-ns-form" novalidate>
            <div class="sw-form__row">
              <label>First name<input name="firstName" required /></label>
              <label>Last name<input name="lastName" required /></label>
            </div>
            <div class="sw-form__row">
              <label>Phone number<input name="phone" type="tel" maxlength="15" required />
                <small class="sw-field-note" id="sw-ns-phone-note" hidden>
                  Phone number can't be longer than 15 characters.
                </small>
              </label>
              <label>Email address<input name="email" type="email" required /></label>
            </div>
            <label>Are you a member of a:
              <select name="member" required>
                <option value="">Please choose...</option>
                ${MEMBER_OPTIONS.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
              </select>
            </label>
            <label class="sw-consent">
              <input type="checkbox" name="consent" required />
              <span>By selecting "Send", I give telMAX permission to contact me via
              email, phone or text message about fibre optic internet in my area and
              agree to telMAX's <a href="/privacy">Privacy Policy</a>. Msg &amp; data
              rates may apply. We respect your privacy and keep messages to a minimum.
              You can opt out at any time.</span>
            </label>
            <p class="sw-error" id="sw-ns-err" hidden></p>
            <div class="sw-actions sw-actions--in">
              <button type="button" class="btn btn--outline" data-act="restart">
                Try another address
              </button>
              <button type="submit" class="btn btn--primary">Send</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
}

function screenServices() {
  const s = state.services;
  const svc = (key, name, sub, locked) => `
    <button type="button" class="sw-svc${s[key] ? " is-on" : ""}${
      locked ? " is-locked" : ""
    }" ${locked ? "disabled" : `data-act="svc" data-svc="${key}"`}>
      <span class="sw-svc__check" aria-hidden="true"></span>
      <span class="sw-svc__name">${name}</span>
      <span class="sw-svc__sub">${sub}</span>
    </button>`;

  const plans = PLANS[planKey()];
  const planCards = plans
    .map(
      (p) => `
      <article class="sw-plan${p.popular ? " is-popular" : ""}">
        ${p.popular ? `<span class="sw-plan__tag">Most Popular</span>` : ""}
        <h3 class="sw-plan__name">${esc(p.name)}</h3>
        <div class="sw-plan__price">
          <span class="sw-plan__amt">$${money(p.price)}</span>
          <span class="sw-plan__per">/month</span>
        </div>
        <div class="sw-plan__term">for 12 months</div>
        <ul class="sw-plan__feats">
          ${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}
        </ul>
        <button type="button" class="btn btn--primary sw-plan__btn"
          data-act="choose" data-plan="${p.id}">Choose plan</button>
      </article>`,
    )
    .join("");

  return `
    <div class="sw-screen">
      <div class="sw-head">
        <h2>Every plan starts with fibre</h2>
        <p>Internet is included on every telMAX plan. Add TV or Home Phone to
        unlock bundle savings.</p>
      </div>
      <div class="sw-services">
        ${svc("internet", "Internet", "Pure fibre - required", true)}
        ${svc("tv", "TV", "MAXview TV - optional", false)}
        ${svc("phone", "Home Phone", "MAXtalk - optional", false)}
      </div>
      <div class="sw-plans">${planCards}</div>
      <div class="sw-actions"><span></span></div>
    </div>`;
}

function screenCustomize() {
  const p = state.plan;
  const canUpgrade = p && p.speed === "500 Mbps";
  return `
    <div class="sw-screen sw-grid2">
      <div class="sw-col">
        <div class="sw-card">
          <div class="sw-card__head">Customize your package</div>
          <div class="sw-card__body">
            <h3 class="sw-sec-title">Upgrade your Internet</h3>
            ${
              canUpgrade
                ? `<div class="sw-upg">
                     <div class="sw-upg__text">
                       <strong>Internet 2.0 Gbps</strong>
                       <span>Step up to our fastest speed for just $10.00 more / month</span>
                     </div>
                     <button type="button" class="sw-upg__btn${
                       state.upgrade ? " is-on" : ""
                     }" data-act="upgrade">${state.upgrade ? "Added" : "Select"}</button>
                   </div>`
                : `<p class="sw-note">You're already on our fastest 2.0 Gbps
                   internet - nothing to upgrade here.</p>`
            }
            <h3 class="sw-sec-title">Internet Equipment</h3>
            <div class="sw-line">
              <span class="sw-line__check">eero Wi-Fi Extender</span>
              <span class="sw-incl">Included</span>
            </div>
            <div class="sw-eero">
              <div class="sw-eero__top">
                <strong>Additional eero Wi-Fi Extender</strong>
                <span>$0.00</span>
              </div>
              <p class="sw-muted">For large homes (above 1,500 sq. ft.) or homes
              with a non-traditional layout, additional eeros can be added - wired
              or wireless - to build a stronger mesh Wi-Fi network.</p>
              <div class="sw-stepper" role="group" aria-label="Additional eeros">
                <button type="button" data-act="eero-" aria-label="Remove one"
                  ${state.extraEero === 0 ? "disabled" : ""}>&minus;</button>
                <span class="sw-stepper__val">${state.extraEero}</span>
                <button type="button" data-act="eero+" aria-label="Add one"
                  ${state.extraEero >= 3 ? "disabled" : ""}>+</button>
              </div>
            </div>
          </div>
        </div>
        <div class="sw-card">
          <div class="sw-card__head">Additional services</div>
          <div class="sw-card__body">
            <h3 class="sw-sec-title">Billing Options</h3>
            <div class="sw-line">
              <span class="sw-line__check">Email (Paperless Billing)</span>
              <span class="sw-incl">Included</span>
            </div>
          </div>
        </div>
        <div class="sw-actions sw-actions--in">
          ${turnBack("back-services")}
          <button type="button" class="btn btn--primary" data-act="to-account">Next</button>
        </div>
      </div>
      <div class="sw-col" id="sw-bill-col">${billHTML()}</div>
    </div>`;
}

/* Email-verification control for the account screen. Front-end only:
   "Verify" reveals a demo code the customer types back to confirm. */
function verifyHTML(a) {
  if (a.emailVerified) {
    return `<span class="sw-verify__ok">Email verified</span>`;
  }
  return `<button type="button" class="sw-verify__btn" data-act="verify-email">
            Verify email address
          </button>`;
}

function screenAccount() {
  const a = state.account;
  return `
    <div class="sw-screen sw-grid2">
      <div class="sw-col">
        <div class="sw-card">
          <div class="sw-card__head">Set up your account</div>
          <div class="sw-card__body">
            <div class="sw-addr-show">
              <span class="sw-addr-show__k">Installation address</span>
              <span class="sw-addr-show__v">${esc(state.addressLabel)}</span>
            </div>
            <form class="sw-form" id="sw-account-form" novalidate>
              <div class="sw-form__row">
                <label>First name
                  <input name="firstName" value="${esc(a.firstName)}" required />
                </label>
                <label>Last name
                  <input name="lastName" value="${esc(a.lastName)}" required />
                </label>
              </div>
              <label>Phone number
                <input name="phone" type="tel" maxlength="15"
                  value="${esc(a.phone)}" required />
                <small class="sw-field-note" id="sw-phone-note" hidden>
                  Phone number can't be longer than 15 characters.
                </small>
              </label>
              <label>Email address
                <input name="email" type="email" value="${esc(a.email)}" required />
              </label>
              <div class="sw-verify" id="sw-verify">${verifyHTML(a)}</div>
              <p class="sw-error" id="sw-account-err" hidden></p>
              <div class="sw-actions sw-actions--in">
                ${turnBack("back-customize")}
                <button type="submit" class="btn btn--primary">
                  Continue to scheduling
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="sw-col">${billHTML()}</div>
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
        <p>We'll book the next open installation slot and confirm the exact date
        and time window by email.</p>
      </div>`;
  } else if (mode === "specific") {
    detail = `
      <div class="sw-sched-pick">
        <h3 class="sw-sec-title">Choose your preferred date</h3>
        ${calendarHTML("1")}
        ${sc.date1 ? `<p class="sw-pick-summary">Preferred: <strong>${esc(fmtIso(sc.date1))}</strong></p>` : ""}
        ${sc.date1 ? `<h3 class="sw-sec-title">Pick a time window</h3>${slotsHTML("1", sc.slot1)}` : ""}
        ${
          sc.date1 && sc.slot1
            ? `<div class="sw-divider"></div>
               <h3 class="sw-sec-title">Choose your second preference</h3>
               ${calendarHTML("2")}
               ${sc.date2 ? `<p class="sw-pick-summary">Second choice: <strong>${esc(fmtIso(sc.date2))}</strong></p>` : ""}
               ${sc.date2 ? `<h3 class="sw-sec-title">Pick a time window</h3>${slotsHTML("2", sc.slot2)}` : ""}`
            : ""
        }
      </div>`;
  }

  const canSubmit =
    mode === "next" ||
    (mode === "specific" && sc.date1 && sc.slot1 && sc.date2 && sc.slot2);

  return `
    <div class="sw-screen">
      <div class="sw-card">
        <div class="sw-card__head">Schedule your installation</div>
        <div class="sw-card__body">
          <p class="sw-note">Choose how you'd like to book your telMAX pure fibre
          installation.</p>
          <div class="sw-modes">
            <button type="button" class="sw-mode${mode === "next" ? " is-on" : ""}"
              data-act="mode" data-mode="next">
              <strong>Next available date &amp; time</strong>
              <span>We'll book the earliest open appointment for you.</span>
            </button>
            <button type="button" class="sw-mode${mode === "specific" ? " is-on" : ""}"
              data-act="mode" data-mode="specific">
              <strong>Request a specific date &amp; time</strong>
              <span>Pick your preferred days and time windows.</span>
            </button>
          </div>
          ${detail}
          <div class="sw-actions sw-actions--in">
            ${turnBack("back-account")}
            <button type="button" class="btn btn--primary" data-act="finish"
              ${canSubmit ? "" : "disabled"}>Confirm installation</button>
          </div>
        </div>
      </div>
    </div>`;
}

function screenDone() {
  const sc = state.schedule;
  let when = "Earliest available appointment - we'll confirm by email.";
  if (sc.mode === "specific") {
    when = `1st choice: ${fmtIso(sc.date1)}, ${slotLabel(sc.slot1)}<br />
            2nd choice: ${fmtIso(sc.date2)}, ${slotLabel(sc.slot2)}`;
  }
  const name = esc(state.account.firstName.trim());
  return `
    <div class="sw-screen">
      <div class="sw-card sw-done">
        <div class="sw-card__body">
          <span class="sw-done__badge" aria-hidden="true"></span>
          <h2>You're all set${name ? `, ${name}` : ""}!</h2>
          <p class="sw-done__lead">Thanks for choosing telMAX pure fibre. Your
          order has been received.</p>
          <dl class="sw-done__summary">
            <div><dt>Address</dt><dd>${esc(state.addressLabel)}</dd></div>
            <div><dt>Plan</dt><dd>${esc(state.plan ? state.plan.name : "")}</dd></div>
            <div><dt>Monthly total</dt><dd>$${money(computeBill().total)}</dd></div>
            <div><dt>Installation</dt><dd>${when}</dd></div>
          </dl>
          <p class="sw-done__confirm">We'll send a confirmation email shortly
          with every detail of your order and your installation appointment.</p>
          <a href="/my-telmax" class="btn btn--primary sw-done__cta">Go to your dashboard</a>
        </div>
      </div>
    </div>`;
}

const SCREENS = {
  address: screenAddress,
  "not-serviced": screenNotServiced,
  services: screenServices,
  customize: screenCustomize,
  account: screenAccount,
  schedule: screenSchedule,
  done: screenDone,
};

/* ---- Controller ----------------------------------------------------- */

function updateStepper() {
  const current =
    STEP_OF[state.screen] || (state.screen === "done" ? 6 : 1);
  document.querySelectorAll(".sw-step").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("is-done", n < current);
    li.classList.toggle("is-active", n === current);
    li.classList.toggle("is-todo", n > current);
  });
}

function render() {
  const body = el("sw-body");
  if (!body) return;
  body.innerHTML = (SCREENS[state.screen] || screenAddress)();
  updateStepper();
  wireScreen();
}

function go(screen) {
  state.screen = screen;
  render();
  const wrap = el("signup-wizard");
  if (wrap) {
    const y = wrap.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: "smooth" });
  }
}

/* ---- Per-screen wiring --------------------------------------------- */

function wireScreen() {
  if (state.screen === "address") wireAddress();
  else if (state.screen === "not-serviced") wireNotServiced();
  else if (state.screen === "services") wireServices();
  else if (state.screen === "customize") wireCustomize();
  else if (state.screen === "account") wireAccount();
  else if (state.screen === "schedule") wireSchedule();
}

function wireAddress() {
  const input = el("sw-addr");
  const list = el("sw-addr-list");
  if (!input || !list) return;
  if (state.addressLabel) input.value = state.addressLabel;

  let debounce;
  let controller;

  const setHint = (message) => {
    const hint = el("sw-addr-hint");
    if (!hint) return;
    if (message == null) {
      hint.hidden = true;
    } else {
      hint.textContent = message;
      hint.hidden = false;
    }
  };

  // Show a non-clickable status row (searching / empty / hint) so the box
  // always gives feedback instead of looking dead.
  const showMessage = (message) => {
    list._matches = [];
    list.innerHTML = `<div class="sw-ac__msg">${esc(message)}</div>`;
    list.hidden = false;
  };

  const hideList = () => {
    list._matches = [];
    list.innerHTML = "";
    list.hidden = true;
  };

  const renderList = (matches) => {
    list._matches = matches;
    if (!matches.length) {
      showMessage(
        "No matching Canadian addresses - try adding your city or postal code.",
      );
      return;
    }
    list.innerHTML = matches
      .map(
        (a, i) =>
          `<button type="button" class="sw-ac__item" data-idx="${i}">
             <span class="sw-ac__pin" aria-hidden="true"></span>
             <span>${esc(a.label)}</span>
           </button>`,
      )
      .join("");
    list.hidden = false;
  };

  const runSearch = async (q) => {
    if (controller) controller.abort();
    controller = new AbortController();
    try {
      const matches = await searchAddresses(q, controller.signal);
      // Ignore stale responses if the box was cleared while we waited.
      if (input.value.trim().length < 3) return;
      renderList(matches);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      showMessage(
        "We couldn't reach the address service - please check your connection and try again.",
      );
    }
  };

  input.addEventListener("input", () => {
    state.selected = false;
    setHint(null);
    const q = input.value.trim();
    clearTimeout(debounce);
    if (!q) {
      hideList();
      return;
    }
    if (q.length < 3) {
      showMessage("Keep typing your street address...");
      return;
    }
    // Immediate feedback, then debounce the actual geocoder call.
    showMessage("Searching addresses...");
    debounce = setTimeout(() => runSearch(q), 250);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 3 && list.innerHTML) list.hidden = false;
  });

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".sw-ac__item");
    if (!item || !list._matches) return;
    const address = list._matches[Number(item.dataset.idx)];
    if (!address) return;
    state.addressLabel = address.label;
    state.addressCity = address.city;
    state.selected = true;
    input.value = address.label;
    list.hidden = true;
    advanceFromAddress();
  });

  el("sw-addr-next").addEventListener("click", () => {
    if (!state.selected) {
      setHint("Please choose an address from the suggestions.");
      input.focus();
      return;
    }
    advanceFromAddress();
  });
}

function advanceFromAddress() {
  if (SERVICED_CITIES.includes(state.addressCity)) go("services");
  else go("not-serviced");
}

function wireNotServiced() {
  const form = el("sw-ns-form");
  if (!form) return;
  wirePhoneLimit(form.querySelector('input[name="phone"]'), el("sw-ns-phone-note"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const values = {};
    form.querySelectorAll("input, select").forEach((node) => {
      if (node.name) values[node.name] = node.value;
    });
    const err = el("sw-ns-err");
    let message = validatePerson(values);
    if (!message && !values.member) message = "Please tell us a bit about your home.";
    if (!message && !form.querySelector('input[name="consent"]').checked)
      message = "Please accept the contact consent to continue.";
    if (message) {
      err.textContent = message;
      err.hidden = false;
      return;
    }
    el("sw-ns-body").innerHTML = `
      <div class="sw-ns-done">
        <span class="sw-done__badge" aria-hidden="true"></span>
        <h3>Thanks - you're on the list!</h3>
        <p>We've noted your details and we'll be in touch the moment telMAX pure
        fibre reaches your neighbourhood.</p>
        <a href="/" class="btn btn--primary">Back to home</a>
      </div>`;
  });
  form.addEventListener(
    "input",
    () => {
      const err = el("sw-ns-err");
      if (err) err.hidden = true;
    },
    { once: false },
  );
}

function wireServices() {
  // Attach to the freshly rendered screen element so listeners never stack.
  const body = el("sw-body").firstElementChild;
  if (!body) return;
  body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "svc") {
      state.services[btn.dataset.svc] = !state.services[btn.dataset.svc];
      render();
    } else if (act === "choose") {
      const set = PLANS[planKey()];
      const plan = set.find((p) => p.id === btn.dataset.plan);
      if (plan) {
        state.plan = plan;
        state.upgrade = false;
        state.extraEero = 0;
        go("customize");
      }
    }
  });
}

function wireCustomize() {
  const body = el("sw-body").firstElementChild;
  if (!body) return;
  const refreshBill = () => {
    const col = el("sw-bill-col");
    if (col) col.innerHTML = billHTML();
  };
  body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    switch (btn.dataset.act) {
      case "upgrade":
        state.upgrade = !state.upgrade;
        render();
        break;
      case "eero-":
        state.extraEero = Math.max(0, state.extraEero - 1);
        render();
        break;
      case "eero+":
        state.extraEero = Math.min(3, state.extraEero + 1);
        render();
        break;
      case "back-services":
        go("services");
        break;
      case "to-account":
        go("account");
        break;
    }
  });
  refreshBill();
}

/* Cap a phone field at 15 characters and flash a note when the limit is hit. */
function wirePhoneLimit(phone, note) {
  if (!phone) return;
  phone.addEventListener("input", () => {
    if (phone.value.length > 15) {
      phone.value = phone.value.slice(0, 15);
      if (note) note.hidden = false;
    } else if (note) {
      note.hidden = true;
    }
  });
}

function wireAccount() {
  const form = el("sw-account-form");
  if (!form) return;

  const emailInput = form.querySelector('input[name="email"]');
  wirePhoneLimit(form.querySelector('input[name="phone"]'), el("sw-phone-note"));

  // ---- Email verification (front-end demo) ----
  let sentCode = null;
  const verifyBox = () => el("sw-verify");

  const showVerifySent = (email) => {
    sentCode = String(Math.floor(100000 + Math.random() * 900000));
    const box = verifyBox();
    if (!box) return;
    box.innerHTML = `
      <div class="sw-verify__sent">
        <p class="sw-verify__hint">
          Enter the 6-digit code we emailed to <strong>${esc(email)}</strong>.
          <span class="sw-verify__demo">Demo code: ${sentCode}</span>
        </p>
        <div class="sw-verify__row">
          <input type="text" inputmode="numeric" maxlength="6"
            class="sw-verify__code" id="sw-verify-code"
            aria-label="Email verification code" autocomplete="off" />
          <button type="button" class="sw-verify__btn" data-act="verify-confirm">
            Confirm
          </button>
          <button type="button" class="sw-verify__resend" data-act="verify-resend">
            Resend
          </button>
        </div>
        <p class="sw-verify__err" id="sw-verify-err" hidden>
          That code isn't right - please try again.
        </p>
      </div>`;
    const code = el("sw-verify-code");
    code?.focus();
    code?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmVerify();
      }
    });
  };

  const confirmVerify = () => {
    const code = el("sw-verify-code");
    if (!code) return;
    if (code.value.trim() === sentCode) {
      state.account.emailVerified = true;
      const box = verifyBox();
      if (box) box.innerHTML = verifyHTML(state.account);
    } else {
      const err = el("sw-verify-err");
      if (err) err.hidden = false;
    }
  };

  form.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "verify-email" || btn.dataset.act === "verify-resend") {
      const email = String(emailInput?.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const err = el("sw-account-err");
        if (err) {
          err.textContent = "Please enter a valid email address first.";
          err.hidden = false;
        }
        emailInput?.focus();
        return;
      }
      state.account.email = email;
      showVerifySent(email);
    } else if (btn.dataset.act === "verify-confirm") {
      confirmVerify();
    }
  });

  // Changing the email after sending/verifying resets the verification.
  emailInput?.addEventListener("input", () => {
    if (state.account.emailVerified || sentCode) {
      state.account.emailVerified = false;
      sentCode = null;
      const box = verifyBox();
      if (box) box.innerHTML = verifyHTML(state.account);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const values = {};
    form.querySelectorAll("input").forEach((i) => {
      if (i.name) values[i.name] = i.value;
    });
    const err = el("sw-account-err");
    const message = validatePerson(values);
    if (message) {
      err.textContent = message;
      err.hidden = false;
      return;
    }
    state.account = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      emailVerified: state.account.emailVerified,
    };
    go("schedule");
  });
  form.addEventListener("input", () => {
    const err = el("sw-account-err");
    if (err) err.hidden = true;
  });
  const root = el("sw-body").firstElementChild;
  if (root) {
    root.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-act="back-customize"]');
      if (btn) go("customize");
    });
  }
}

function navCalendar(which, dir) {
  const cal = which === "1" ? state.schedule.cal1 : state.schedule.cal2;
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
  if (y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth()))
    return;
  cal.m = m;
  cal.y = y;
}

function wireSchedule() {
  const body = el("sw-body").firstElementChild;
  if (!body) return;
  body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const sc = state.schedule;
    switch (btn.dataset.act) {
      case "mode": {
        sc.mode = btn.dataset.mode;
        if (sc.mode === "specific" && !sc.cal1) {
          const t = startOfToday();
          sc.cal1 = { y: t.getFullYear(), m: t.getMonth() };
          sc.cal2 = { y: t.getFullYear(), m: t.getMonth() };
        }
        render();
        break;
      }
      case "cal-nav":
        navCalendar(btn.dataset.cal, Number(btn.dataset.dir));
        render();
        break;
      case "pick-date":
        if (btn.dataset.cal === "1") {
          sc.date1 = btn.dataset.date;
          // Moving the first choice later can strand an earlier second choice.
          if (sc.date2 && sc.date2 < sc.date1) {
            sc.date2 = null;
            sc.slot2 = null;
          }
        } else {
          sc.date2 = btn.dataset.date;
        }
        render();
        break;
      case "slot":
        if (btn.dataset.cal === "1") sc.slot1 = btn.dataset.slot;
        else sc.slot2 = btn.dataset.slot;
        render();
        break;
      case "back-account":
        go("account");
        break;
      case "finish":
        go("done");
        break;
    }
  });
}

/* ---- Init ----------------------------------------------------------- */

export function initSignup() {
  const wrap = el("signup-wizard");
  if (!wrap) return;

  const steps = el("sw-steps");
  if (steps) {
    steps.addEventListener("click", (e) => {
      const li = e.target.closest(".sw-step");
      if (!li || !li.classList.contains("is-done")) return;
      const screen = SCREEN_OF_STEP[Number(li.dataset.step)];
      if (screen) go(screen);
    });
  }

  // Close the address autocomplete when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (state.screen !== "address") return;
    if (!e.target.closest(".sw-ac")) {
      const list = el("sw-addr-list");
      if (list) list.hidden = true;
    }
  });

  render();
}
