# Instapaper → Kindle

Converts an Instapaper CSV export into a Kindle-readable `.epub` file, complete with a generated cover image and a table of contents.

## Setup

```bash
npm install
```

## Configuration (optional — email delivery)

Create a `.env` file in the project root to enable automatic email delivery to your Kindle:

```env
SENDER_EMAIL=you@gmail.com
SENDER_PASSWORD=your-gmail-app-password
RECIPIENT_EMAIL=your-kindle-address@kindle.com
```

> **Note:** `SENDER_PASSWORD` should be a [Gmail App Password](https://myaccount.google.com/apppasswords), not your regular account password.

If these variables are not set, the EPUB is still generated and saved locally — the email step is simply skipped.

## Usage

1. Export your Instapaper bookmarks as CSV and place the file in `input/`
2. Run:

```bash
npm start
# or pass a specific CSV file
npx tsx src/index.ts path/to/export.csv
```

The newest `.csv` file in `input/` is picked up automatically if no path is given.

3. The EPUB is written to `output/instapaper-YYYY-MM-DD.epub`
4. If email is configured, it is sent automatically; otherwise upload it manually via [Send to Kindle](https://www.amazon.com/sendtokindle)

### Markdown export (optional)

Add the `--md` flag to also export each article as an individual Markdown file:

```bash
npm start --md
# or with a specific CSV file
npx tsx src/index.ts --md path/to/export.csv
```

Markdown files are saved to `output/md/`, one file per article, named after the article title. Markdown files are **not** emailed.

## How it works

1. **CSV parsing** — reads the Instapaper export and filters out the `Archive`, `Financije`, and `Crypto` folders
2. **Article fetching** — downloads each URL and extracts clean article content using Mozilla Readability (the same engine as Firefox Reader View)
3. **Cover generation** — creates a cover image (1200 × 1800 px) showing the date and article count using Sharp
4. **EPUB generation** — packages all articles into a single `.epub` with the generated cover and a table of contents
5. **Markdown export** *(optional, `--md`)* — converts each article's HTML to Markdown via Turndown and writes individual `.md` files to `output/md/`
6. **Email delivery** — if `SENDER_EMAIL`, `SENDER_PASSWORD`, and `RECIPIENT_EMAIL` are set in `.env`, sends the EPUB via Gmail using Nodemailer (Markdown files are not sent)
