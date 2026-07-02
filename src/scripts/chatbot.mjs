/* =====================================================================
   telMAX assistant - framework-free chatbot widget logic.

   `initChatbot(root)` wires up the static markup in Chatbot.astro.
   The screen renderers below are pure string functions (no DOM access)
   so the whole flow can be unit tested. initChatbot() returns a small
   controller object, used both by nothing in production and by the
   test suite to drive the widget.
   ===================================================================== */

/* ---- Static content ------------------------------------------------- */

export const WELCOME = [
  "Hi there! I'm Max, the telMAX virtual assistant.",
  "Whether it's fibre Internet, TV, or home phone, we're proud to power everyday possibilities. How can we help you today? To start, please choose one of the options below.",
];

/* Home-screen menu options */
export const MENU = [
  { key: "new-services", label: "New services" },
  { key: "account-queries", label: "Account queries" },
  { key: "technical-help", label: "Technical help" },
  { key: "account-changes", label: "Account changes" },
  { key: "troubleshooting", label: "Troubleshooting" },
  { key: "contact", label: "Talk to our team" },
];

/* The four options that collect customer details through the form */
export const FORM_TOPICS = {
  "new-services": "set up new telMAX services",
  "account-queries": "help with your account query",
  "technical-help": "get you technical help",
  "account-changes": "make changes to your account",
};

/* Products with a troubleshooting section on the support page */
export const TROUBLE_PRODUCTS = [
  { id: "internet", label: "Internet" },
  { id: "wifi", label: "WiFi & eero" },
  { id: "tv", label: "TV & Streaming" },
  { id: "home-phone", label: "Home Phone" },
];

const AUTOCOMPLETE = {
  firstName: "given-name",
  lastName: "family-name",
  email: "email",
  phone: "tel",
  accountNumber: "off",
};

/* Deep link straight to a product's troubleshooting articles */
export const supportTroubleHref = (productId) =>
  `/support#p/${productId}/troubleshooting`;

/* ---- Helpers -------------------------------------------------------- */

/* Escape dynamic / user-supplied text before it goes into innerHTML */
export function esc(s) {
  return String(s).replace(
    /[&<>"]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
  );
}

/* Validate the contact form. Returns an error string, or null when valid.
   First name, last name, email and phone are required; account number is
   optional. */
export function validateForm(d) {
  const firstName = (d.firstName || "").trim();
  const lastName = (d.lastName || "").trim();
  const email = (d.email || "").trim();
  const phone = (d.phone || "").trim();
  if (!firstName) return "Please enter your first name.";
  if (!lastName) return "Please enter your last name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Please enter a valid email address.";
  if (phone.replace(/\D/g, "").length < 7)
    return "Please enter a valid phone number.";
  return null;
}

/* ---- Screen builders (pure) ---------------------------------------- */

/* Running stagger index - each animated element gets the next number so
   the CSS can fade them in one after another. Reset by renderScreen(). */
let _stag = 0;
function staged(classNames) {
  return ` class="cb-anim ${classNames}" style="--cb-i:${_stag++}"`;
}

function turn(messages) {
  const av = `<span${staged("cb-turn__av")} aria-hidden="true"></span>`;
  const bubbles = messages
    .map((m) => `<p${staged("cb-bubble")}>${m}</p>`)
    .join("");
  return `<div class="cb-turn">${av}<div class="cb-turn__msgs">${bubbles}</div></div>`;
}

function choices(items) {
  const inner = (it) =>
    `<span>${esc(it.label)}</span><span class="cb-choice__arrow" aria-hidden="true"></span>`;
  return `<div class="cb-choices">${items
    .map((it) =>
      it.href
        ? `<a${staged("cb-choice")} href="${it.href}">${inner(it)}</a>`
        : `<button type="button"${staged("cb-choice")} data-action="${it.action}" data-value="${esc(
            it.value,
          )}">${inner(it)}</button>`,
    )
    .join("")}</div>`;
}

function renderMenu() {
  return (
    turn(WELCOME) +
    choices(MENU.map((o) => ({ action: "select", value: o.key, label: o.label })))
  );
}

function renderForm(topicKey) {
  const blurb = FORM_TOPICS[topicKey] || "help you";
  const field = (name, label, type, required) => `
      <label${staged("cb-field")}>
        <span class="cb-field__label">${label} ${
          required
            ? '<em class="cb-req">required</em>'
            : '<em class="cb-opt">optional</em>'
        }</span>
        <input class="cb-input" name="${name}" type="${type}"
          autocomplete="${AUTOCOMPLETE[name] || "off"}"${required ? " required" : ""} />
      </label>`;
  return (
    turn([
      `Great - I'll ${esc(blurb)}.`,
      "Share a few details and our GTA-based team will get back to you shortly.",
    ]) +
    `<form class="cb-form" novalidate data-topic="${esc(topicKey)}">
        ${field("firstName", "First name", "text", true)}
        ${field("lastName", "Last name", "text", true)}
        ${field("email", "Email address", "email", true)}
        ${field("phone", "Phone number", "tel", true)}
        ${field("accountNumber", "Account number", "text", false)}
        <p class="cb-error" role="alert" hidden></p>
        <button type="submit"${staged("cb-submit")}>Send to telMAX</button>
      </form>`
  );
}

function renderThanks(data) {
  const name = esc((data.firstName || "").trim()) || "there";
  return (
    turn([
      `Thanks, ${name}! Your request has been logged.`,
      "A telMAX team member will be in touch soon. Is there anything else I can help you with?",
    ]) +
    choices([{ action: "goto", value: "menu", label: "Back to the main menu" }])
  );
}

function renderTroubleshoot() {
  return (
    turn([
      "I can point you to step-by-step help. Which product are you having trouble with?",
    ]) +
    choices(
      TROUBLE_PRODUCTS.map((p) => ({
        action: "trouble",
        value: p.id,
        label: p.label,
      })),
    )
  );
}

function renderTroubleResult(productId) {
  const product = TROUBLE_PRODUCTS.find((p) => p.id === productId);
  if (!product) return renderTroubleshoot();
  return (
    turn([
      `Here's our ${esc(
        product.label,
      )} troubleshooting guide - it walks through the most common fixes.`,
    ]) +
    `<a${staged("cb-choice cb-choice--link")} href="${supportTroubleHref(product.id)}">
        <span>Open ${esc(product.label)} troubleshooting</span>
        <span class="cb-choice__arrow" aria-hidden="true"></span>
      </a>` +
    choices([
      { action: "goto", value: "troubleshoot", label: "Try another product" },
      { action: "goto", value: "menu", label: "Back to the main menu" },
    ])
  );
}

function renderContact() {
  return (
    turn(["You can reach our local, GTA-based team directly:"]) +
    `<div class="cb-contact">
        <a${staged("cb-contact__row")} href="tel:18444835629">
          <span class="cb-contact__k">Residential support</span>
          <span class="cb-contact__v">1-844-483-5629</span>
        </a>
        <a${staged("cb-contact__row")} href="tel:18444925333">
          <span class="cb-contact__k">Business support</span>
          <span class="cb-contact__v">1-844-492-5333</span>
        </a>
        <a${staged("cb-contact__row")} href="mailto:support@telmax.com">
          <span class="cb-contact__k">Email us</span>
          <span class="cb-contact__v">support@telmax.com</span>
        </a>
      </div>` +
    choices([
      { href: "/contact", label: "Open the contact page" },
      { action: "goto", value: "menu", label: "Back to the main menu" },
    ])
  );
}

/* Render any screen to an HTML string. Exported for testing. */
export function renderScreen(screen, data) {
  data = data || {};
  _stag = 0; // restart the fade-in cascade for every screen
  switch (screen) {
    case "menu":
      return renderMenu();
    case "form":
      return renderForm(data.topic);
    case "thanks":
      return renderThanks(data);
    case "troubleshoot":
      return renderTroubleshoot();
    case "troubleResult":
      return renderTroubleResult(data.product);
    case "contact":
      return renderContact();
    default:
      return renderMenu();
  }
}

/* ---- Widget wiring -------------------------------------------------- */

export function initChatbot(root) {
  if (!root || root.dataset.cbReady) return null;
  root.dataset.cbReady = "true";

  const fab = root.querySelector(".cb-fab");
  const panel = root.querySelector(".cb-panel");
  const body = root.querySelector(".cb-body");
  const backBtn = root.querySelector(".cb-back");
  const closeBtn = root.querySelector(".cb-close");
  if (!fab || !panel || !body || !backBtn || !closeBtn) return null;

  /* Navigation history - each entry is { screen, data } */
  let history = [];

  const current = () => history[history.length - 1] || { screen: "menu", data: {} };

  function paint() {
    const cur = current();
    body.innerHTML = renderScreen(cur.screen, cur.data);
    backBtn.hidden = history.length <= 1;
    body.scrollTop = 0;
    if (root.classList.contains("cb-open")) {
      const focusable = body.querySelector(
        ".cb-choice, .cb-input, .cb-contact__row",
      );
      if (focusable) {
        try {
          focusable.focus({ preventScroll: true });
        } catch (e) {
          /* focus is best-effort */
        }
      }
    }
  }

  function go(screen, data) {
    history.push({ screen, data: data || {} });
    paint();
  }

  function reset() {
    history = [{ screen: "menu", data: {} }];
    paint();
  }

  function back() {
    if (history.length > 1) {
      history.pop();
      paint();
    }
  }

  function openPanel() {
    root.classList.add("cb-open");
    fab.setAttribute("aria-expanded", "true");
    reset();
  }

  function closePanel() {
    root.classList.remove("cb-open");
    fab.setAttribute("aria-expanded", "false");
    try {
      fab.focus({ preventScroll: true });
    } catch (e) {
      /* best-effort */
    }
  }

  function toggle() {
    if (root.classList.contains("cb-open")) closePanel();
    else openPanel();
  }

  fab.addEventListener("click", toggle);
  closeBtn.addEventListener("click", closePanel);
  backBtn.addEventListener("click", back);

  body.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-action]");
    if (!trigger || !body.contains(trigger)) return;
    const { action, value } = trigger.dataset;
    if (action === "select") {
      if (value === "troubleshooting") go("troubleshoot");
      else if (value === "contact") go("contact");
      else go("form", { topic: value });
    } else if (action === "trouble") {
      go("troubleResult", { product: value });
    } else if (action === "goto") {
      if (value === "menu") reset();
      else go(value);
    }
  });

  body.addEventListener("submit", (e) => {
    const form = e.target.closest(".cb-form");
    if (!form) return;
    e.preventDefault();
    const values = {};
    form.querySelectorAll("input").forEach((inp) => {
      if (inp.name) values[inp.name] = inp.value;
    });
    const error = validateForm(values);
    const errEl = form.querySelector(".cb-error");
    if (error) {
      if (errEl) {
        errEl.textContent = error;
        errEl.hidden = false;
      }
      return;
    }
    go("thanks", { topic: form.dataset.topic, firstName: values.firstName });
  });

  /* Escape closes the panel */
  (root.ownerDocument || document).addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("cb-open")) closePanel();
  });

  /* Controller - returned for tests and any future programmatic use */
  return {
    open: openPanel,
    close: closePanel,
    back,
    reset,
    isOpen: () => root.classList.contains("cb-open"),
    state: () => current(),
    depth: () => history.length,
  };
}
