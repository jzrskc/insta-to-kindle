import nodemailer from "nodemailer";
import { basename } from "node:path";
import { readFileSync } from "node:fs";

export async function sendEpubByEmail(epubPath: string): Promise<void> {
  const senderEmail = process.env.SENDER_EMAIL;
  const senderPassword = process.env.SENDER_PASSWORD;
  const recipientEmail = process.env.RECIPIENT_EMAIL;

  if (!senderEmail || !senderPassword || !recipientEmail) {
    console.warn(
      "⚠️  Email not sent — missing SENDER_EMAIL, SENDER_PASSWORD, or RECIPIENT_EMAIL in .env"
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "login" as const,
      user: senderEmail,
      pass: senderPassword,
    },
  });

  const filename = basename(epubPath);

  const mailOptions = {
    from: senderEmail,
    to: recipientEmail,
    subject: `Instapaper EPUB – ${new Date().toISOString().slice(0, 10)}`,
    text: `Your Instapaper articles have been converted to EPUB.\n\nSee the attached file: ${filename}`,
    attachments: [
      {
        filename,
        content: readFileSync(epubPath),
      },
    ],
  };

  console.log(`📧 Sending EPUB to ${recipientEmail}...`);

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent: ${info.response}`);
}
