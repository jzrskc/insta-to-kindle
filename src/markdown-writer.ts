import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import TurndownService from "turndown";
import type { Article } from "./article-fetcher.js";

/**
 * Sanities a title for use as a filename.
 * Replaces characters that are illegal on Windows/macOS/Linux, collapses
 * whitespace, trims, and truncates to 200 characters.
 */
function sanitiesFilename(title: string): string {
  return title
    .replace(/[\/\\:?*"<>|#%&{}$!'@+`=]/g, "-") // illegal / problematic chars
    .replace(/\s+/g, " ") // collapse whitespace
    .trim()
    .slice(0, 200)
    .replace(/[-\s]+$/, ""); // trim trailing dashes / spaces after slice
}

/**
 * Write each article as an individual Markdown file inside `outputDir/md/`.
 */
export function writeArticlesAsMarkdown(
  articles: Article[],
  outputDir: string,
): void {
  const mdDir = join(outputDir, "md");
  mkdirSync(mdDir, { recursive: true });

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  let written = 0;

  for (const article of articles) {
    const filename = sanitiesFilename(article.title) || "untitled";
    const markdown = turndown.turndown(article.content);

    const lines: string[] = [
      `# ${article.title}`,
      "",
      `> Source: ${article.url}`,
      "",
      "---",
      "",
      markdown,
      "", // trailing newline
    ];

    const filePath = join(mdDir, `${filename}.md`);
    writeFileSync(filePath, lines.join("\n"), "utf-8");
    written++;
  }

  console.log(`\n📝 ${written} Markdown file(s) saved to: ${mdDir}`);
}
