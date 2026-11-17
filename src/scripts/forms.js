/* =====================================================================
   Shared, framework-free form validation.
   Any <form data-validate> gets native validation bubbles suppressed and
   styled inline error messages instead. On success it optionally resets
   the form and reveals the element named in data-done.

     data-validate            - opt the form in
     data-done="some-id"      - element to unhide on a successful submit
     data-reset               - reset the form after a successful submit

   This keeps the demo forms (contact, sign-in, refer-a-friend) front-end
   only - wire them to a backend later.
   ===================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clearError(field) {
  field.removeAttribute("aria-invalid");
  const label = field.closest("label") || field.parentElement;
  label?.querySelector(".field-error")?.remove();
}

function setError(field, message) {
  field.setAttribute("aria-invalid", "true");
  const label = field.closest("label") || field.parentElement;
  if (!label) return;
  let note = label.querySelector(".field-error");
  if (!note) {
    note = document.createElement("small");
    note.className = "field-error";
    label.appendChild(note);
  }
  note.textContent = message;
}

function fieldError(field) {
  const value = field.value.trim();
  if (field.type === "email") {
    if (!value) return field.required ? "Please enter your email address." : null;
    if (!EMAIL_RE.test(value)) return "Please enter a valid email address.";
    return null;
  }
  if (field.required && !value) return "Please fill out this field.";
  return null;
}

function setupForm(form) {
  form.noValidate = true;
  const fields = [...form.querySelectorAll("input, select, textarea")].filter(
    (f) => f.type !== "checkbox" && f.type !== "hidden",
  );

  // Clear a field's error as soon as the user starts correcting it.
  fields.forEach((f) =>
    f.addEventListener("input", () => clearError(f), { passive: true }),
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let firstInvalid = null;
    for (const field of fields) {
      const message = fieldError(field);
      if (message) {
        setError(field, message);
        if (!firstInvalid) firstInvalid = field;
      } else {
        clearError(field);
      }
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const doneId = form.dataset.done;
    if (doneId) {
      const done = document.getElementById(doneId);
      if (done) done.hidden = false;
    }
    if (form.hasAttribute("data-reset")) {
      form.reset();
      fields.forEach(clearError);
    }
  });
}

export function enhanceForms() {
  document.querySelectorAll("form[data-validate]").forEach(setupForm);
}
