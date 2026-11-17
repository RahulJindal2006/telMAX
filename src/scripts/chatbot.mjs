/* =====================================================================
   The telMAX help assistant ("Max"): framework-free widget logic.

   It answers from the help articles on this site (src/data/support.js),
   using the same search as the support centre, and points to the right
   page or phone number for everything else. It asks for no personal
   details and sends nothing anywhere.

   `initChatbot(root)` wires the static markup in Chatbot.astro. The
   screen builders are pure string functions, so every flow can be
   tested without a browser.
   ===================================================================== */

import { searchSupport, articleHref, allArticles } from "./support-search.js";
import { SITE, CONTACT } from "../data/site.js";

/* ---- Static content ------------------------------------------------- */

export const WELCOME = [
  "Hi, I'm Max, the telMAX help assistant.",
  "Ask me a question, or pick a place to start.",
];

/* The home screen's choices. One with `href` is a plain link. */
export const MENU = [
  { key: "address", label: "Check my address", href: "/get-started" },
  { key: "troubleshooting", label: "Something is not working" },
  { key: "account", label: "My bill or account" },
  { key: "contact", label: "Talk to telMAX" },
];

/* Products with a troubleshooting section in the support centre. */
export const TROUBLE_PRODUCTS = [
  { id: "internet", label: "Internet" },
  { id: "wifi", label: "WiFi & eero" },
  { id: "tv", label: "TV & Streaming" },
  { id: "home-phone", label: "Home Phone" },
];

/* How many answers one question gets. */
export const ANSWER_LIMIT = 3;

/* Straight to a product's troubleshooting articles. */
export const supportTroubleHref = (productId) => `/support#p/${productId}/troubleshooting`;

/* The support centre's own results for a question. */
export const supportSearchHref = (q) => `/support#q/${encodeURIComponent(q)}`;

/* ---- Helpers -------------------------------------------------------- */

/* Escape dynamic or typed text before it goes into innerHTML. */
export function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
}

/* Tidy a typed question: trimmed, single spaces, at most 200 characters. */
export function cleanQuestion(q) {
  return String(q || "").replace(/\s+/g, " ").trim().slice(0, 200);
}

/* ---- Screen builders (pure) ---------------------------------------- */

function turn(messages) {
  const bubbles = messages.map((m) => `<p class="cb-bubble">${m}</p>`).join("");
  return `<div class="cb-turn"><span class="cb-turn__av" aria-hidden="true"></span><div class="cb-turn__msgs">${bubbles}</div></div>`;
}

function asked(question) {
  return `<p class="cb-asked"><span class="sr-only">You asked: </span>${esc(question)}</p>`;
}

function choices(items) {
  const inner = (it) =>
    `<span>${esc(it.label)}</span><span class="cb-choice__arrow${it.out ? " cb-choice__arrow--out" : ""}" aria-hidden="true"></span>`;
  return `<div class="cb-choices">${items
    .map((it) =>
      it.href
        ? `<a class="cb-choice" href="${esc(it.href)}"${it.out ? ' rel="noopener"' : ""}>${inner(it)}</a>`
        : `<button type="button" class="cb-choice" data-action="${it.action}" data-value="${esc(it.value)}">${inner(it)}</button>`,
    )
    .join("")}</div>`;
}

/* The question box. It appears on the home screen and under every answer. */
function askBox(placeholder) {
  return `
    <form class="cb-ask" novalidate>
      <label class="sr-only" for="cb-q">Your question</label>
      <input class="cb-input" id="cb-q" name="q" type="text" autocomplete="off"
        maxlength="200" placeholder="${esc(placeholder)}" />
      <button type="submit" class="cb-send" aria-label="Ask">
        <span class="cb-send__icon" aria-hidden="true"></span>
      </button>
    </form>`;
}

function renderMenu() {
  return (
    turn(WELCOME) +
    askBox("For example: my internet is slow") +
    choices(
      MENU.map((o) =>
        o.href
          ? { href: o.href, label: o.label }
          : { action: "select", value: o.key, label: o.label },
      ),
    )
  );
}

function renderAnswers(question) {
  const q = cleanQuestion(question);
  if (!q) return renderMenu();
  const { results } = searchSupport(q, ANSWER_LIMIT);

  if (!results.length) {
    return (
      asked(q) +
      turn([
        "I could not find that in the help centre.",
        "Try other words, or reach telMAX's team directly.",
      ]) +
      askBox("Ask it another way") +
      choices([
        { action: "select", value: "contact", label: "Talk to telMAX" },
        { action: "goto", value: "menu", label: "Back to the start" },
      ])
    );
  }

  const answers = results
    .map(
      (a, i) => `
      <details class="cb-answer"${i === 0 ? " open" : ""}>
        <summary>${esc(a.q)}</summary>
        <p>${esc(a.a)}</p>
        <a class="cb-answer__more" href="${esc(articleHref(a))}">Open in the support centre</a>
      </details>`,
    )
    .join("");

  return (
    asked(q) +
    turn([results.length === 1 ? "Here is what the help centre says." : "Here are the closest answers."]) +
    `<div class="cb-answers">${answers}</div>` +
    askBox("Ask something else") +
    choices([
      { href: supportSearchHref(q), label: "See every result" },
      { action: "select", value: "contact", label: "Talk to telMAX" },
    ])
  );
}

function renderTroubleshoot() {
  return (
    turn(["Which service is giving you trouble?"]) +
    choices(
      TROUBLE_PRODUCTS.map((p) => ({ action: "trouble", value: p.id, label: p.label })),
    )
  );
}

function renderTroubleResult(productId) {
  const product = TROUBLE_PRODUCTS.find((p) => p.id === productId);
  if (!product) return renderTroubleshoot();
  return (
    turn([
      `The ${esc(product.label)} troubleshooting guide walks through the usual fixes.`,
      "If neighbours are affected too, check the status board for an outage.",
    ]) +
    choices([
      { href: supportTroubleHref(product.id), label: `Open ${product.label} troubleshooting` },
      { href: "/status", label: "Check network status" },
      { href: "/report-outage", label: "Report an outage" },
      { action: "goto", value: "troubleshoot", label: "Another service" },
    ])
  );
}

function renderAccount() {
  const picks = allArticles
    .filter((a) => a.productId === "account" && a.popular)
    .slice(0, 2)
    .map((a) => ({ href: articleHref(a), label: a.q }));
  return (
    turn([
      "Your bill and account details live on My telMAX, telMAX's secure portal.",
      "I can't see your account, and I will never ask for your password.",
    ]) +
    choices([
      { href: SITE.portal, label: "Go to My telMAX", out: true },
      ...picks,
      { action: "goto", value: "menu", label: "Back to the start" },
    ])
  );
}

function renderContact() {
  const row = (href, k, v) =>
    `<a class="cb-contact__row" href="${href}"><span class="cb-contact__k">${k}</span><span class="cb-contact__v">${v}</span></a>`;
  return (
    turn(["Here is how to reach telMAX's own team."]) +
    `<div class="cb-contact">
        ${row(CONTACT.support.tel, "Residential support", CONTACT.support.phone)}
        ${row(CONTACT.business.tel, "Business", CONTACT.business.phone)}
        ${row(`mailto:${CONTACT.support.email}`, "Email", CONTACT.support.email)}
      </div>` +
    choices([
      { href: "/contact", label: "All the ways to reach telMAX" },
      { action: "goto", value: "menu", label: "Back to the start" },
    ])
  );
}

/* Render any screen to an HTML string. Exported for testing. */
export function renderScreen(screen, data) {
  data = data || {};
  switch (screen) {
    case "answers":
      return renderAnswers(data.q);
    case "troubleshoot":
      return renderTroubleshoot();
    case "troubleResult":
      return renderTroubleResult(data.product);
    case "account":
      return renderAccount();
    case "contact":
      return renderContact();
    case "menu":
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

  /* Where the visitor has been: each entry is { screen, data }. */
  let history = [];

  const view = (root.ownerDocument || document).defaultView;
  const touchScreen = () => {
    try {
      return !!(view && view.matchMedia && view.matchMedia("(pointer: coarse)").matches);
    } catch (e) {
      return false;
    }
  };

  const current = () => history[history.length - 1] || { screen: "menu", data: {} };

  function paint() {
    const cur = current();
    body.innerHTML = renderScreen(cur.screen, cur.data);
    backBtn.hidden = history.length <= 1;
    body.scrollTop = 0;
    if (root.classList.contains("cb-open")) {
      // On the home screen the question box is the point; elsewhere, the first thing
      // to read or press. A touch screen gets the panel itself, so that opening the
      // assistant does not throw the keyboard up over the choices.
      const target =
        cur.screen !== "menu"
          ? body.querySelector(".cb-answer summary, .cb-choice, .cb-contact__row")
          : touchScreen()
            ? panel
            : body.querySelector(".cb-input");
      if (target) {
        try {
          target.focus({ preventScroll: true });
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

  function ask(question) {
    const q = cleanQuestion(question);
    if (q) go("answers", { q });
  }

  function openPanel() {
    root.classList.add("cb-open");
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    reset();
  }

  function closePanel() {
    root.classList.remove("cb-open");
    panel.hidden = true;
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

  panel.hidden = true;
  fab.addEventListener("click", toggle);
  closeBtn.addEventListener("click", closePanel);
  backBtn.addEventListener("click", back);

  body.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-action]");
    if (!trigger || !body.contains(trigger)) return;
    const { action, value } = trigger.dataset;
    if (action === "select") {
      if (value === "troubleshooting") go("troubleshoot");
      else if (value === "account") go("account");
      else if (value === "contact") go("contact");
    } else if (action === "trouble") {
      go("troubleResult", { product: value });
    } else if (action === "goto") {
      if (value === "menu") reset();
      else go(value);
    }
  });

  body.addEventListener("submit", (e) => {
    const form = e.target.closest(".cb-ask");
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('input[name="q"]');
    ask(input ? input.value : "");
  });

  /* Escape closes the panel. */
  (root.ownerDocument || document).addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("cb-open")) closePanel();
  });

  /* Returned for the tests and for any page that wants to drive the widget. */
  return {
    open: openPanel,
    close: closePanel,
    back,
    reset,
    ask,
    isOpen: () => root.classList.contains("cb-open"),
    state: () => current(),
    depth: () => history.length,
  };
}
