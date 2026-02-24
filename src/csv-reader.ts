import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

export interface InstapaperEntry {
  url: string;
  title: string;
  folder: string;
  timestamp: number;
}

const EXCLUDED_FOLDERS = new Set(["Archive", "Financije", "Crypto"]);

export function readCsv(filePath: string): InstapaperEntry[] {
  const raw = readFileSync(filePath, "utf-8");

  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const entries: InstapaperEntry[] = [];

  for (const row of records) {
    const folder = row["Folder"] ?? "";

    if (EXCLUDED_FOLDERS.has(folder)) {
      continue;
    }

    entries.push({
      url: row["URL"] ?? "",
      title: row["Title"] ?? "(no title)",
      folder,
      timestamp: Number(row["Timestamp"] ?? 0),
    });
  }

  console.log(
    `📄 CSV parsed: ${records.length} total rows, ${entries.length} after filtering (excluded folders: ${[...EXCLUDED_FOLDERS].join(", ")})`
  );

  return entries;
}
