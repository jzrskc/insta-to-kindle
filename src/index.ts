import "dotenv/config";
import { resolve, join } from "node:path";
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { readCsv } from "./csv-reader.js";
import { fetchArticles } from "./article-fetcher.js";
import { buildEpub } from "./epub-builder.js";
import { sendEpubByEmail } from "./email-sender.js";

/**
 * Find the most recent .csv file in the input/ directory.
 */
function findCsvInInputDir(): string | null {
  const inputDir = resolve("input");
  try {
    const files = readdirSync(inputDir)
      .filter((f) => f.toLowerCase().endsWith(".csv"))
      .sort()
      .reverse(); // newest filename first (works for date-named exports)
    return files.length > 0 ? join(inputDir, files[0]) : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  let csvPath: string;

  if (process.argv[2]) {
    csvPath = resolve(process.argv[2]);
  } else {
    const found = findCsvInInputDir();
    if (!found) {
      console.error("No CSV file found. Either pass a path or place a .csv in input/");
      console.error("Usage: npx tsx src/index.ts [path-to-csv]");
      process.exit(1);
    }
    csvPath = found;
    console.log(`Auto-detected CSV: ${csvPath}`);
  }

  console.log(`\n🚀 Instapaper → Kindle converter\n`);

  // 1. Parse CSV & filter
  const entries = readCsv(csvPath);

  if (entries.length === 0) {
    console.error("No entries to process after filtering. Exiting.");
    process.exit(1);
  }

  // 2. Fetch & extract articles
  const articles = await fetchArticles(entries);

  if (articles.length === 0) {
    console.error("No articles could be extracted. Exiting.");
    process.exit(1);
  }

  // 3. Build EPUB
  const epubBuffer = await buildEpub(articles);

  // 4. Write to disk
  const outputDir = resolve("output");
  mkdirSync(outputDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const outputPath = resolve(outputDir, `instapaper-${today}.epub`);

  writeFileSync(outputPath, epubBuffer);

  console.log(`\n🎉 Done! EPUB saved to: ${outputPath}`);

  // 5. Send via email
  await sendEpubByEmail(outputPath);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
