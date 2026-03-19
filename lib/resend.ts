// Email sending stub - resend package not available
// Replace with actual email implementation as needed

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  // Log email for development purposes
  console.log("Email would be sent:", { to, subject, html });
  return { success: true };
}

export const resend = {
  emails: {
    send: async (params: {
      from: string;
      to: string | string[];
      subject: string;
      html: string;
    }) => {
      console.log("Email would be sent via resend:", params);
      return { data: { id: "stub-id" }, error: null };
    },
  },
};

export default resend;
