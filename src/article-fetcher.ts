import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { InstapaperEntry } from "./csv-reader.js";

export interface Article {
  url: string;
  title: string;
  byline: string;
  content: string; // clean HTML
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TIMEOUT_MS = 30_000;
const CONCURRENCY = 3;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "hr,en;q=0.9",
        },
        maxRedirects: 5,
      });
      return Buffer.from(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(
          `  ⚠️  Attempt ${attempt}/${RETRY_ATTEMPTS} failed for ${url}: ${message}. Retrying in ${RETRY_DELAY_MS / 1000}s...`
        );
        await sleep(RETRY_DELAY_MS);
      } else {
        throw new Error(`Failed after ${RETRY_ATTEMPTS} attempts: ${message}`);
      }
    }
  }
  throw new Error("Unreachable");
}

function extractArticle(htmlBuffer: Buffer, url: string): Article | null {
  const dom = new JSDOM(htmlBuffer, { url });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();

  if (!parsed || !parsed.content) {
    return null;
  }

  return {
    url,
    title: parsed.title || "(no title)",
    byline: parsed.byline || "",
    content: parsed.content,
  };
}

/**
 * Fetch and extract articles with bounded concurrency.
 */
export async function fetchArticles(
  entries: InstapaperEntry[]
): Promise<Article[]> {
  const articles: Article[] = [];
  let completed = 0;

  async function processEntry(entry: InstapaperEntry): Promise<void> {
    const idx = ++completed;
    const label = `[${idx}/${entries.length}]`;

    try {
      console.log(`${label} Fetching: ${entry.title}`);
      const htmlBuffer = await fetchWithRetry(entry.url);
      const article = extractArticle(htmlBuffer, entry.url);

      if (article) {
        // Prefer the CSV title (often cleaner) but fall back to extracted
        article.title = entry.title || article.title;
        articles.push(article);
        console.log(`${label} ✅ Extracted: ${article.title}`);
      } else {
        console.warn(
          `${label} ⚠️  Readability couldn't extract content: ${entry.url}`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${label} ❌ Skipping ${entry.url}: ${message}`);
    }
  }

  // Process with bounded concurrency
  const queue = [...entries];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const entry = queue.shift()!;
          await processEntry(entry);
        }
      })()
    );
  }

  await Promise.all(workers);

  console.log(
    `\n📰 Fetched ${articles.length}/${entries.length} articles successfully.`
  );
  return articles;
}
