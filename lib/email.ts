let resend: any = null;

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "RESEND_API_KEY is not set. Email sending will be disabled.",
      );
      return null;
    }
    const { Resend } = require("resend");
    resend = new Resend(apiKey);
  }
  return resend;
}

export async function sendViolationEmail({
  to,
  violationId,
  address,
  description,
  status,
}: {
  to: string;
  violationId: number;
  address: string;
  description: string;
  status: string;
}) {
  const client = getResend();
  if (!client) {
    console.log("Email not sent (no API key):", { to, violationId });
    return;
  }

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to,
      subject: `Violation Notice - ${address}`,
      html: `
        <h2>Violation Notice</h2>
        <p><strong>Property:</strong> ${address}</p>
        <p><strong>Violation ID:</strong> ${violationId}</p>
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Status:</strong> ${status}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export async function sendAppealEmail({
  to,
  violationId,
  address,
  appealText,
}: {
  to: string;
  violationId: number;
  address: string;
  appealText: string;
}) {
  const client = getResend();
  if (!client) {
    console.log("Email not sent (no API key):", { to, violationId });
    return;
  }

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to,
      subject: `Appeal Submitted - Violation #${violationId}`,
      html: `
        <h2>Appeal Submitted</h2>
        <p><strong>Property:</strong> ${address}</p>
        <p><strong>Violation ID:</strong> ${violationId}</p>
        <p><strong>Appeal:</strong> ${appealText}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send appeal email:", error);
  }
}
