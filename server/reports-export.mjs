/* =====================================================================
   Export submitted outage reports to an Excel file.
     npm run reports:excel                 -> server/reports.xlsx
     npm run reports:excel -- --out ~/Desktop/reports.xlsx
   Reads server/reports.jsonl (override with STATUS_REPORTS_FILE).
   ===================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./monitors.config.mjs";
import { reportsToXlsx } from "./xlsx.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const abs = (p) => (p.startsWith("/") ? p : resolve(ROOT, p));

const outArg = process.argv.indexOf("--out");
const outPath = outArg !== -1 && process.argv[outArg + 1] ? process.argv[outArg + 1] : "server/reports.xlsx";

const inFile = abs(config.reportsFile);
let reports = [];
try {
  reports = readFileSync(inFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .reverse(); // newest first
} catch {
  console.log(`No reports yet (${inFile} not found). Writing an empty workbook.`);
}

const target = abs(outPath);
writeFileSync(target, Buffer.from(reportsToXlsx(reports)));
console.log(`Exported ${reports.length} report(s) to ${target}`);
