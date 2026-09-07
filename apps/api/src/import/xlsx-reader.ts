import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/**
 * Minimal .xlsx reader for the M10 one-time import (ADR-0015).
 *
 * An .xlsx IS a zip of XML parts, so this needs no dependency — deliberately, because the
 * importer is throwaway code deleted after go-live and should not add a permanent package.
 * The zip is inflated in-process with `node:zlib`: shelling out to `tar`/`unzip` is not
 * portable (Windows tar treats "D:\..." as a remote host, and GNU tar cannot read zips).
 */
export interface SheetRow {
  /** 1-based row number in the sheet, so error messages point at something a human can fix. */
  rowNum: number;
  /** Column index (0 = A) → trimmed cell text. Empty cells are absent. */
  cells: Record<number, string>;
}

/* --------------------------------- zip reading --------------------------------- */

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

/** Extract the named entries of a zip into memory. Only the parts the import needs. */
function readZipEntries(buf: Buffer, wanted: (name: string) => boolean): Map<string, Buffer> {
  // End-of-central-directory sits at the tail, after an optional comment (max 64 KiB).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a valid .xlsx (no zip end-of-central-directory record)");

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16); // start of central directory
  const out = new Map<string, Buffer>();

  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(ptr) !== CEN_SIG) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);

    if (wanted(name)) {
      // The local header repeats the name/extra; data begins after it. Its length fields can
      // be zero (data descriptor), so sizes come from the central directory above.
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compressedSize);
      out.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    }

    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/* --------------------------------- xml helpers --------------------------------- */

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&"); // last: otherwise "&amp;lt;" would double-decode
}

const colIndex = (letters: string): number =>
  [...letters].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;

/** Excel serial → calendar date. floor() only: the fraction is time-of-day, not another day. */
export function serialToDate(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Excel serial → full instant, keeping the time-of-day the team actually recorded. */
export function serialToInstant(serial: number): Date {
  const days = Math.floor(serial);
  const secs = Math.round((serial - days) * 86_400);
  return new Date(Date.UTC(1899, 11, 30) + days * 86_400_000 + secs * 1000);
}

/* ----------------------------------- reading ----------------------------------- */

export function readSheet(xlsxPath: string, sheetName: string): SheetRow[] {
  const zip = readZipEntries(
    readFileSync(xlsxPath),
    (name) =>
      name === "xl/workbook.xml" ||
      name === "xl/_rels/workbook.xml.rels" ||
      name === "xl/sharedStrings.xml" ||
      name.startsWith("xl/worksheets/"),
  );
  const text = (name: string): string => {
    const entry = zip.get(name);
    if (!entry) throw new Error(`.xlsx is missing ${name}`);
    return entry.toString("utf8");
  };

  // Shared strings: most cell text lives here, referenced by index from the sheet.
  const sharedXml = zip.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...(m[1] ?? "").matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((t) => decodeEntities(t[1] ?? ""))
      .join(""),
  );

  // Resolve the sheet NAME to its part, via the workbook relationships.
  const workbook = text("xl/workbook.xml");
  const rels = new Map(
    [...text("xl/_rels/workbook.xml.rels").matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map(
      (m) => [m[1]!, m[2]!],
    ),
  );
  const sheets = [...workbook.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)].map(
    (m) => ({ name: decodeEntities(m[1] ?? ""), rid: m[2]! }),
  );
  const match = sheets.find((s) => s.name === sheetName);
  if (!match) {
    throw new Error(
      `sheet "${sheetName}" not found. Available: ${sheets.map((s) => s.name).join(", ")}`,
    );
  }
  let part = rels.get(match.rid);
  if (!part) throw new Error(`no relationship for ${match.rid}`);
  if (part.startsWith("/")) part = part.slice(1);
  if (!part.startsWith("xl/")) part = "xl/" + part.replace(/^\.\//, "");

  const rows: SheetRow[] = [];
  for (const rm of text(part).matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: Record<number, string> = {};
    for (const cm of (rm[2] ?? "").matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cm[1] ?? "";
      const body = cm[2] ?? "";
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      let value: string | undefined;
      if (type === "s") {
        value = shared[Number(/<v>(\d+)<\/v>/.exec(body)?.[1])];
      } else if (type === "inlineStr") {
        value = decodeEntities(/<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] ?? "");
      } else {
        value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      }
      const trimmed = (value ?? "").trim();
      if (trimmed !== "") cells[colIndex(ref)] = trimmed;
    }
    rows.push({ rowNum: Number(rm[1]), cells });
  }
  return rows;
}
