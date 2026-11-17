/* =====================================================================
   The arithmetic behind the upload tool: how long a file takes to send
   at a given line speed. Used at build time for the first picture and
   in the browser when the visitor changes a number.
   ===================================================================== */

/* 5000 seconds reads as "1 h 23 min"; 50 as "50 s". Two units at most. */
export function waitText(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds < 1) return "under 1 s";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h >= 100) return `${h} h`;
  if (h) return m ? `${h} h ${m} min` : `${h} h`;
  if (m) return r ? `${m} min ${r} s` : `${m} min`;
  return `${r} s`;
}

/* What the visitor typed, as a usable speed in Mbps, or null. */
export function ownSpeed(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10000) : null;
}

/* One row for the visitor's own speed (when given), then one per plan.
   A gigabyte is 8,000 megabits. `share` is each bar's length, 0 to 100,
   against the longest wait. */
export function uploadRows(gb, own, plans) {
  const megabits = gb * 8000;
  const rows = [];
  if (own) {
    rows.push({ who: "Your connection today", sub: `${own} Mbps up`, seconds: megabits / own, mine: true });
  }
  for (const p of plans) {
    rows.push({
      who: p.name,
      sub: `${p.upTo ? "up to " : ""}${p.speed} up`,
      seconds: megabits / p.mbps,
      mine: false,
    });
  }
  const longest = Math.max(...rows.map((r) => r.seconds));
  return rows.map((r) => ({ ...r, share: (r.seconds / longest) * 100, wait: waitText(r.seconds) }));
}

export function rowsHTML(rows) {
  return rows
    .map(
      (r) => `<li class="up__row${r.mine ? " up__row--mine" : ""}">
        <span class="up__who">${r.who}<small>${r.sub}</small></span>
        <span class="up__bar" aria-hidden="true"><span style="width:${r.share.toFixed(2)}%"></span></span>
        <span class="up__time num">${r.wait}</span>
      </li>`,
    )
    .join("");
}
