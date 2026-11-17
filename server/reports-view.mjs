/* =====================================================================
   Print submitted outage reports for review.  Usage:  npm run reports
   Reads server/reports.jsonl (override with STATUS_REPORTS_FILE) and prints
   the newest first. Add --json to dump raw JSON instead.
   ===================================================================== */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./monitors.config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = config.reportsFile.startsWith("/") ? config.reportsFile : resolve(ROOT, config.reportsFile);

let lines = [];
try {
  lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
} catch {
  console.log(`No reports yet (${file} not found).`);
  process.exit(0);
}

const reports = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(reports, null, 2));
  process.exit(0);
}

console.log(`\n${reports.length} outage report(s) - newest first  (${file})\n`);
for (const r of reports) {
  const when = new Date(r.receivedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });
  console.log(`── ${r.id}  ·  ${when} ET  ·  ${r.status || "new"}`);
  console.log(`   ${r.name} <${r.email}>${r.phone ? `  ·  ${r.phone}` : ""}`);
  console.log(`   Address:  ${r.address}`);
  console.log(`   Service:  ${r.serviceLabel || r.service}   |   Duration: ${r.durationLabel || r.duration}`);
  console.log(`   Issue:    ${String(r.description || "").replace(/\s+/g, " ")}`);
  console.log("");
}
