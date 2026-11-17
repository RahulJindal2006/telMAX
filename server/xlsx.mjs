/* =====================================================================
   Minimal .xlsx (real Excel) writer - zero dependencies, Worker-safe.

   Builds a proper OOXML spreadsheet and packs it into a ZIP by hand (STORED /
   no compression, so it needs no zlib and runs identically in Node and in a
   Cloudflare Worker). Returns a Uint8Array you can write to disk or stream as
   a download. One sheet, a bold frozen header row, sized columns and an
   auto-filter so the reports are easy to sort/triage in Excel.
   ===================================================================== */

const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

// Columns shown in the sheet, in order.
const COLUMNS = [
  { header: "Reference", width: 18, get: (r) => r.id },
  { header: "Received (ET)", width: 22, get: (r) => fmtET(r.receivedAt) },
  { header: "Status", width: 12, get: (r) => r.status || "new" },
  { header: "Name", width: 20, get: (r) => r.name },
  { header: "Email", width: 28, get: (r) => r.email },
  { header: "Phone", width: 16, get: (r) => r.phone || "" },
  { header: "Address", width: 32, get: (r) => r.address },
  { header: "Service", width: 22, get: (r) => r.serviceLabel || r.service },
  { header: "Duration", width: 26, get: (r) => r.durationLabel || r.duration },
  { header: "Issue", width: 70, get: (r) => r.description },
];

function fmtET(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? String(iso || "")
    : d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });
}

// Escape for XML + drop characters that are illegal in XML 1.0 (would corrupt
// the file if they turned up in a free-text description).
const xmlEsc = (v) =>
  String(v == null ? "" : v)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[m]));

// 0-based column index -> A, B, ... Z, AA, ...
function colLetter(n) {
  let s = "";
  n += 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/* ---- Fixed package parts ---- */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Outage reports" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function sheetXml(reports) {
  const lastCol = colLetter(COLUMNS.length - 1);
  const lastRow = reports.length + 1;
  const cols = `<cols>${COLUMNS.map(
    (c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`,
  ).join("")}</cols>`;
  const cell = (col, row, text, header) =>
    `<c r="${col}${row}" t="inlineStr"${header ? ' s="1"' : ""}><is><t xml:space="preserve">${xmlEsc(text)}</t></is></c>`;
  const headerRow = `<row r="1">${COLUMNS.map((c, i) => cell(colLetter(i), 1, c.header, true)).join("")}</row>`;
  const bodyRows = reports
    .map((r, ri) => {
      const row = ri + 2;
      return `<row r="${row}">${COLUMNS.map((c, ci) => cell(colLetter(ci), row, c.get(r))).join("")}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>${cols}<sheetData>${headerRow}${bodyRows}</sheetData><autoFilter ref="A1:${lastCol}${lastRow}"/></worksheet>`;
}

/* ---- CRC32 + STORED ZIP ---- */

let CRC_TABLE;
function crc32(u8) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Pack files ([{ name, data:Uint8Array }]) into a ZIP with no compression.
function zipStore(files) {
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const push = (u8) => { chunks.push(u8); offset += u8.length; };
  const central = [];

  for (const f of files) {
    const name = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const localOffset = offset;

    const lh = new Uint8Array(30 + name.length);
    const ldv = new DataView(lh.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true); // version needed
    ldv.setUint16(6, 0, true); // flags
    ldv.setUint16(8, 0, true); // method: 0 = stored
    ldv.setUint16(10, 0, true); // mod time
    ldv.setUint16(12, 0x21, true); // mod date (1980-01-01, harmless)
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, data.length, true);
    ldv.setUint32(22, data.length, true);
    ldv.setUint16(26, name.length, true);
    ldv.setUint16(28, 0, true);
    lh.set(name, 30);
    push(lh);
    push(data);

    const cd = new Uint8Array(46 + name.length);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true); // version made by
    cdv.setUint16(6, 20, true); // version needed
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0x21, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, name.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, localOffset, true);
    cd.set(name, 46);
    central.push(cd);
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const cd of central) { push(cd); cdSize += cd.length; }

  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, cdStart, true);
  push(eocd);

  const out = new Uint8Array(offset);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

/** Build an .xlsx workbook from an array of report records. */
export function reportsToXlsx(reports = []) {
  const enc = new TextEncoder();
  return zipStore([
    { name: "[Content_Types].xml", data: enc.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: enc.encode(ROOT_RELS) },
    { name: "xl/workbook.xml", data: enc.encode(WORKBOOK) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(WORKBOOK_RELS) },
    { name: "xl/styles.xml", data: enc.encode(STYLES) },
    { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheetXml(reports)) },
  ]);
}

/** Suggested download filename, e.g. telmax-outage-reports-2026-07-14.xlsx */
export function xlsxFilename(now = new Date()) {
  return `telmax-outage-reports-${now.toISOString().slice(0, 10)}.xlsx`;
}
