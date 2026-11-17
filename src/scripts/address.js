/* =====================================================================
   Address lookup, shared by the home page's availability check and the
   sign-up flow.

   Suggestions come from the free OpenStreetMap "Photon" geocoder
   (photon.komoot.io): no key, real Canadian addresses with their city
   and postal code. Swap in Canada Post AddressComplete or Google Places
   for fuller coverage; only `searchAddresses` has to change.
   ===================================================================== */

import { AREAS } from "../data/site.js";

/* Canadian province names to two-letter codes, for tidy labels. */
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
  Yukon: "YT",
};

/* Bounding box of Canada (minLon, minLat, maxLon, maxLat). */
const CANADA_BBOX = "-141.0,41.7,-52.6,83.1";

/* Where a chosen address waits while the visitor moves from the home
   page to the sign-up flow. It stays in this browser tab and is never
   put in a web address. */
const HANDOFF_KEY = "telmax:address";

export function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
}

/* Turn Photon GeoJSON features into clean, de-duplicated suggestions.
   Each is { city, label }: `city` decides whether telMAX serves it and
   `label` is what is shown and kept as the installation address. */
export function parseFeatures(features) {
  if (!Array.isArray(features)) return [];
  const seen = new Set();
  const out = [];
  for (const f of features) {
    const p = (f && f.properties) || {};
    if (p.countrycode && p.countrycode !== "CA") continue;
    const city = p.city || p.town || p.village || p.municipality || p.county || "";
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

/* Ask the geocoder. Resolves with a list of { city, label }.
   Rejects when the service cannot be reached, so the caller can say so. */
export async function searchAddresses(query, signal) {
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

export const isServiced = (city) => AREAS.includes(city);

/* ---- Passing a chosen address from one page to the next ------------- */

export function rememberAddress(address) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(address));
  } catch (e) {
    /* storage is off: the sign-up flow simply asks again */
  }
}

/* Read the waiting address once, then forget it. */
export function takeAddress() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    const a = JSON.parse(raw);
    return a && typeof a.label === "string" && typeof a.city === "string" ? a : null;
  } catch (e) {
    return null;
  }
}

/* A plan picked on another page ("Choose 2.0" on the home page) waits the
   same way, as a plan id from src/data/plans.js. */
const PLAN_KEY = "telmax:plan";

export function rememberPlan(id) {
  try {
    sessionStorage.setItem(PLAN_KEY, String(id));
  } catch (e) {
    /* storage is off: the flow simply shows every plan the same */
  }
}

export function takePlan() {
  try {
    const id = sessionStorage.getItem(PLAN_KEY);
    if (id) sessionStorage.removeItem(PLAN_KEY);
    return id && /^[a-z0-9-]{1,24}$/.test(id) ? id : null;
  } catch (e) {
    return null;
  }
}

/* ---- The suggestion box --------------------------------------------- */

/* Wire a text input and the element under it into an address box.

     input, list   the two elements
     onPick(a)     called with { city, label } when a suggestion is chosen
     onType()      called whenever the text changes (the choice no longer stands)

   The list always says something while a search runs or finds nothing,
   so the box never looks dead. Arrow keys, Enter and Escape work. */
export function attachAddressBox({ input, list, onPick, onType }) {
  let debounce;
  let controller;
  let matches = [];
  let active = -1;

  /* `list` is the panel under the input. The options live in a listbox
     inside it, so the panel can also hold a message or the map credit. */
  const boxId = `${list.id}-box`;
  const items = () => [...list.querySelectorAll(".sw-ac__item")];

  const setActive = (i) => {
    active = i;
    items().forEach((node, n) => {
      const on = n === i;
      node.classList.toggle("is-active", on);
      node.setAttribute("aria-selected", String(on));
      if (on) {
        input.setAttribute("aria-activedescendant", node.id);
        if (node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
      }
    });
    if (i < 0) input.removeAttribute("aria-activedescendant");
  };

  /* The input says it is "expanded" only while there are options to move through. */
  const open = (withOptions) => {
    list.hidden = false;
    input.setAttribute("aria-expanded", String(!!withOptions));
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    setActive(-1);
  };

  const showMessage = (message) => {
    matches = [];
    list._matches = matches;
    list.innerHTML = `<div class="sw-ac__msg" role="status">${esc(message)}</div>`;
    setActive(-1);
    open(false);
  };

  const clear = () => {
    matches = [];
    list._matches = matches;
    list.innerHTML = "";
    close();
  };

  const render = (found) => {
    matches = found;
    list._matches = matches;
    if (!found.length) {
      showMessage("No matching Canadian addresses. Try adding your city or postal code.");
      return;
    }
    const options = found
      .map(
        (a, i) =>
          `<button type="button" class="sw-ac__item" role="option" aria-selected="false"
             id="${list.id}-opt-${i}" data-idx="${i}" tabindex="-1">
             <span class="sw-ac__pin" aria-hidden="true"></span>
             <span>${esc(a.label)}</span>
           </button>`,
      )
      .join("");
    // OpenStreetMap asks that its data is credited wherever it is shown.
    list.innerHTML = `
      <div role="listbox" id="${boxId}" aria-label="Address suggestions">${options}</div>
      <p class="sw-ac__credit">Address data &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors</p>`;
    setActive(-1);
    open(true);
  };

  const run = async (q) => {
    if (controller) controller.abort();
    controller = new AbortController();
    try {
      const found = await searchAddresses(q, controller.signal);
      // The box may have been cleared while the answer was on its way.
      if (input.value.trim().length < 3) return;
      render(found);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      showMessage(
        `The address lookup is not answering. telMAX serves ${AREAS.join(", ")}.`,
      );
    }
  };

  const pick = (i) => {
    const address = matches[i];
    if (!address) return;
    input.value = address.label;
    close();
    onPick(address);
  };

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", boxId);

  input.addEventListener("input", () => {
    if (onType) onType();
    const q = input.value.trim();
    clearTimeout(debounce);
    if (!q) {
      clear();
      return;
    }
    if (q.length < 3) {
      showMessage("Keep typing your street address...");
      return;
    }
    showMessage("Searching addresses...");
    debounce = setTimeout(() => run(q), 250);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 3 && list.innerHTML) open(matches.length > 0);
  });

  input.addEventListener("keydown", (e) => {
    const count = items().length;
    if (e.key === "ArrowDown" && count) {
      e.preventDefault();
      if (list.hidden) open(true);
      setActive((active + 1) % count);
    } else if (e.key === "ArrowUp" && count) {
      e.preventDefault();
      setActive((active - 1 + count) % count);
    } else if (e.key === "Enter" && !list.hidden && active >= 0) {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape" && !list.hidden) {
      e.preventDefault();
      close();
    }
  });

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".sw-ac__item");
    if (item) pick(Number(item.dataset.idx));
  });

  return { close, clear };
}
