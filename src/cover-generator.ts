import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 1800;

/**
 * Generate a simple cover image as a PNG Buffer.
 * Solid dark background with title, date and article count in white text.
 */
export async function generateCover(
  title: string,
  date: string,
  articleCount: number
): Promise<Buffer> {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1a1a2e"/>
    <rect x="60" y="60" width="${WIDTH - 120}" height="${HEIGHT - 120}" rx="12"
          fill="none" stroke="#e2e2e2" stroke-width="3" opacity="0.3"/>

    <text x="${WIDTH / 2}" y="620" text-anchor="middle"
          font-family="Georgia, serif" font-size="180" font-weight="bold" fill="#ffffff">
      Instapaper
    </text>

    <line x1="200" y1="720" x2="${WIDTH - 200}" y2="720"
          stroke="#ffffff" stroke-width="3" opacity="0.4"/>

    <text x="${WIDTH / 2}" y="920" text-anchor="middle"
          font-family="Georgia, serif" font-size="120" font-weight="bold" fill="#ffffff">
      ${escapeXml(date)}
    </text>

    <text x="${WIDTH / 2}" y="1100" text-anchor="middle"
          font-family="Georgia, serif" font-size="120" font-weight="bold" fill="#ffffff">
      ${articleCount} article${articleCount !== 1 ? "s" : ""}
    </text>
  </svg>`;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
