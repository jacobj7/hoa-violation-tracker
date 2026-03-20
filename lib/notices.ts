const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@yourdomain.com";

export interface ViolationDetails {
  violationId: string;
  propertyAddress: string;
  violationType: string;
  description: string;
  dateReported: string;
  dueDate?: string;
  fineAmount?: number;
  inspectorName?: string;
  caseNumber?: string;
}

export async function sendViolationNotice(
  ownerEmail: string,
  violationDetails: ViolationDetails,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    violationId,
    propertyAddress,
    violationType,
    description,
    dateReported,
    dueDate,
    fineAmount,
    inspectorName,
    caseNumber,
  } = violationDetails;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Violation Notice</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #c0392b;
      color: #ffffff;
      padding: 24px 32px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .header p {
      margin: 4px 0 0;
      font-size: 14px;
      opacity: 0.85;
    }
    .body {
      padding: 32px;
      color: #333333;
    }
    .body p {
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .details-table th,
    .details-table td {
      text-align: left;
      padding: 10px 12px;
      font-size: 14px;
      border-bottom: 1px solid #eeeeee;
    }
    .details-table th {
      background-color: #f9f9f9;
      color: #555555;
      font-weight: 600;
      width: 40%;
    }
    .details-table td {
      color: #333333;
    }
    .fine-row td {
      color: #c0392b;
      font-weight: bold;
    }
    .notice-box {
      background-color: #fff3cd;
      border-left: 4px solid #f0ad4e;
      padding: 16px 20px;
      border-radius: 4px;
      margin: 24px 0;
    }
    .notice-box p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }
    .footer {
      background-color: #f4f4f4;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #888888;
    }
    .footer a {
      color: #c0392b;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠ Violation Notice</h1>
      <p>Official Notice of Property Violation</p>
    </div>
    <div class="body">
      <p>Dear Property Owner,</p>
      <p>
        This notice is to inform you that a violation has been recorded for your property.
        Please review the details below and take the necessary corrective action by the due date.
      </p>

      <table class="details-table">
        <tbody>
          ${
            caseNumber
              ? `
          <tr>
            <th>Case Number</th>
            <td>${escapeHtml(caseNumber)}</td>
          </tr>`
              : ""
          }
          <tr>
            <th>Violation ID</th>
            <td>${escapeHtml(violationId)}</td>
          </tr>
          <tr>
            <th>Property Address</th>
            <td>${escapeHtml(propertyAddress)}</td>
          </tr>
          <tr>
            <th>Violation Type</th>
            <td>${escapeHtml(violationType)}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td>${escapeHtml(description)}</td>
          </tr>
          <tr>
            <th>Date Reported</th>
            <td>${escapeHtml(dateReported)}</td>
          </tr>
          ${
            dueDate
              ? `
          <tr>
            <th>Compliance Due Date</th>
            <td><strong>${escapeHtml(dueDate)}</strong></td>
          </tr>`
              : ""
          }
          ${
            fineAmount !== undefined
              ? `
          <tr class="fine-row">
            <th>Fine Amount</th>
            <td>$${fineAmount.toFixed(2)}</td>
          </tr>`
              : ""
          }
          ${
            inspectorName
              ? `
          <tr>
            <th>Inspector</th>
            <td>${escapeHtml(inspectorName)}</td>
          </tr>`
              : ""
          }
        </tbody>
      </table>

      <div class="notice-box">
        <p>
          <strong>Important:</strong> Failure to address this violation by the due date may result in
          additional fines, penalties, or legal action. If you believe this notice was issued in error,
          please contact our office immediately.
        </p>
      </div>

      <p>
        If you have any questions or need to schedule an inspection, please contact our violations
        department as soon as possible.
      </p>

      <p>
        Sincerely,<br />
        <strong>Violations Enforcement Department</strong>
      </p>
    </div>
    <div class="footer">
      <p>
        This is an automated notice. Please do not reply directly to this email.<br />
        For assistance, contact our office or visit our website.
      </p>
      <p style="margin-top: 8px;">
        &copy; ${new Date().getFullYear()} Violations Enforcement Department. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
VIOLATION NOTICE
================

Dear Property Owner,

This notice is to inform you that a violation has been recorded for your property.

${caseNumber ? `Case Number: ${caseNumber}\n` : ""}Violation ID: ${violationId}
Property Address: ${propertyAddress}
Violation Type: ${violationType}
Description: ${description}
Date Reported: ${dateReported}
${dueDate ? `Compliance Due Date: ${dueDate}\n` : ""}${fineAmount !== undefined ? `Fine Amount: $${fineAmount.toFixed(2)}\n` : ""}${inspectorName ? `Inspector: ${inspectorName}\n` : ""}

IMPORTANT: Failure to address this violation by the due date may result in additional fines, penalties, or legal action.

If you believe this notice was issued in error, please contact our office immediately.

Sincerely,
Violations Enforcement Department
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ownerEmail],
        subject: `Violation Notice - ${violationType} at ${propertyAddress}`,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Resend API error:", response.status, errorBody);
      return {
        success: false,
        error: `Failed to send email: ${response.status} ${errorBody}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending violation notice:", message);
    return {
      success: false,
      error: message,
    };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
