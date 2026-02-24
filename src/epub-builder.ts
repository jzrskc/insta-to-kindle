import epub, { type Chapter, type Options } from "epub-gen-memory";
import type { Article } from "./article-fetcher.js";
import { generateCover } from "./cover-generator.js";

/**
 * Remove <img> tags with non-HTTP(S) src (data: URIs, relative paths, etc.)
 * that cause epub-gen-memory's internal fetch to crash.
 */
function sanitizeImages(html: string): string {
  return html.replace(/<img\s[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return ""; // no src → remove
    const src = srcMatch[1];
    if (/^https?:\/\//i.test(src)) return tag; // valid HTTP(S) → keep
    return ""; // data:, //, relative, etc. → remove
  });
}

/**
 * Build an EPUB buffer from extracted articles.
 * The EPUB will have a table of contents listing every article.
 */
export async function buildEpub(
  articles: Article[],
  bookTitle?: string
): Promise<Buffer> {
  const today = new Date().toISOString().slice(0, 10);
  const title = bookTitle ?? `Instapaper – ${today}`;

  // Build a manual TOC page as the first chapter
  const tocHtml = buildTocHtml(articles);

  const chapters: Chapter[] = [
    {
      title: "Table of Contents",
      content: tocHtml,
    },
    ...articles.map((article, index) => ({
      title: article.title,
      content: wrapArticleHtml(article, index + 1),
      beforeToc: false,
    })),
  ];

  const options: Options = {
    title,
    author: "Instapaper Export",
    lang: "hr",
    tocTitle: "Navigation",
    date: today,
    description: `Instapaper articles exported on ${today}. Contains ${articles.length} articles.`,
    version: 3,
  };

  // Generate cover image
  console.log(`🎨 Generating cover image...`);
  const coverPng = await generateCover(title, today, articles.length);
  const coverArray = new Uint8Array(coverPng);
  options.cover = new File([coverArray], "cover.png", { type: "image/png" });

  console.log(`📚 Building EPUB: "${title}" with ${articles.length} articles...`);

  const buffer = await epub(options, chapters);

  console.log(
    `✅ EPUB built successfully (${(buffer.length / 1024).toFixed(0)} KB)`
  );
  return buffer;
}

function buildTocHtml(articles: Article[]): string {
  const items = articles
    .map((a, i) => {
      const byline = a.byline ? ` <small>— ${escapeHtml(a.byline)}</small>` : "";
      return `<li><b>${i + 1}.</b> ${escapeHtml(a.title)}${byline}</li>`;
    })
    .join("\n      ");

  return `
    <h1>Table of Contents</h1>
    <p>${articles.length} articles in this collection.</p>
    <ol>
      ${items}
    </ol>
  `;
}

function wrapArticleHtml(article: Article, num: number): string {
  const byline = article.byline
    ? `<p><em>${escapeHtml(article.byline)}</em></p>`
    : "";
  const source = `<p style="font-size:0.8em;color:#666;margin-top:2em;">Source: <a href="${escapeHtml(article.url)}">${escapeHtml(article.url)}</a></p>`;

  return `
    <h1>${escapeHtml(article.title)}</h1>
    ${byline}
    <hr/>
    ${sanitizeImages(article.content)}
    ${source}
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
