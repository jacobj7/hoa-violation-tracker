import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return;
  }
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@example.com",
    to,
    subject,
    html,
  });
}
