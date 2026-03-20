import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const { id } = parsedParams.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const violationResult = await client.query(
        `SELECT 
          v.id,
          v.violation_type,
          v.description,
          v.fine_amount,
          v.status,
          v.created_at,
          v.violation_date,
          p.address as property_address,
          p.city,
          p.state,
          p.zip_code,
          o.name as owner_name,
          o.email as owner_email
        FROM violations v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN owners o ON p.owner_id = o.id
        WHERE v.id = $1`,
        [id],
      );

      if (violationResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const violation = violationResult.rows[0];

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const { width, height } = page.getSize();

      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const darkRed = rgb(0.7, 0.1, 0.1);
      const darkGray = rgb(0.2, 0.2, 0.2);
      const black = rgb(0, 0, 0);
      const lightGray = rgb(0.9, 0.9, 0.9);

      page.drawRectangle({
        x: 0,
        y: height - 80,
        width: width,
        height: 80,
        color: darkRed,
      });

      page.drawText("VIOLATION NOTICE", {
        x: 50,
        y: height - 45,
        size: 28,
        font: boldFont,
        color: rgb(1, 1, 1),
      });

      page.drawText("Official Code Enforcement Notice", {
        x: 50,
        y: height - 65,
        size: 12,
        font: regularFont,
        color: rgb(0.9, 0.9, 0.9),
      });

      const noticeDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      page.drawText(`Notice Date: ${noticeDate}`, {
        x: width - 200,
        y: height - 55,
        size: 10,
        font: regularFont,
        color: rgb(0.9, 0.9, 0.9),
      });

      let yPosition = height - 120;

      page.drawText("NOTICE ID:", {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      });

      page.drawText(`VN-${id.substring(0, 8).toUpperCase()}`, {
        x: 130,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      });

      yPosition -= 30;

      page.drawRectangle({
        x: 40,
        y: yPosition - 80,
        width: width - 80,
        height: 100,
        color: lightGray,
      });

      page.drawText("PROPERTY INFORMATION", {
        x: 50,
        y: yPosition - 10,
        size: 12,
        font: boldFont,
        color: darkRed,
      });

      yPosition -= 30;

      const propertyAddress = violation.property_address
        ? `${violation.property_address}, ${violation.city || ""}, ${violation.state || ""} ${violation.zip_code || ""}`.trim()
        : "Address not available";

      page.drawText("Property Address:", {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      });

      page.drawText(propertyAddress, {
        x: 170,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: black,
      });

      yPosition -= 20;

      if (violation.owner_name) {
        page.drawText("Property Owner:", {
          x: 50,
          y: yPosition,
          size: 10,
          font: boldFont,
          color: darkGray,
        });

        page.drawText(violation.owner_name, {
          x: 170,
          y: yPosition,
          size: 10,
          font: regularFont,
          color: black,
        });

        yPosition -= 20;
      }

      yPosition -= 20;

      page.drawText("VIOLATION DETAILS", {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: darkRed,
      });

      yPosition -= 5;
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 1,
        color: darkRed,
      });

      yPosition -= 20;

      page.drawText("Violation Type:", {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      });

      page.drawText(violation.violation_type || "N/A", {
        x: 170,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: black,
      });

      yPosition -= 20;

      const violationDate = violation.violation_date
        ? new Date(violation.violation_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "N/A";

      page.drawText("Violation Date:", {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      });

      page.drawText(violationDate, {
        x: 170,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: black,
      });

      yPosition -= 20;

      page.drawText("Description:", {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      });

      const description = violation.description || "No description provided";
      const maxCharsPerLine = 60;
      const descriptionLines: string[] = [];

      for (let i = 0; i < description.length; i += maxCharsPerLine) {
        descriptionLines.push(description.substring(i, i + maxCharsPerLine));
      }

      descriptionLines.forEach((line, index) => {
        page.drawText(line, {
          x: 170,
          y: yPosition - index * 15,
          size: 10,
          font: regularFont,
          color: black,
        });
      });

      yPosition -= descriptionLines.length * 15 + 20;

      page.drawRectangle({
        x: 40,
        y: yPosition - 50,
        width: width - 80,
        height: 70,
        color: rgb(0.95, 0.9, 0.9),
        borderColor: darkRed,
        borderWidth: 2,
      });

      page.drawText("FINE AMOUNT DUE", {
        x: 50,
        y: yPosition - 10,
        size: 12,
        font: boldFont,
        color: darkRed,
      });

      const fineAmount = violation.fine_amount
        ? parseFloat(violation.fine_amount).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })
        : "$0.00";

      page.drawText(fineAmount, {
        x: 50,
        y: yPosition - 35,
        size: 24,
        font: boldFont,
        color: darkRed,
      });

      page.drawText("Payment due within 30 days of this notice", {
        x: 200,
        y: yPosition - 35,
        size: 10,
        font: regularFont,
        color: darkGray,
      });

      yPosition -= 80;

      page.drawText("REQUIRED ACTIONS", {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: darkRed,
      });

      yPosition -= 5;
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 1,
        color: darkRed,
      });

      yPosition -= 20;

      const actions = [
        "1. Correct the violation within 30 days of this notice.",
        "2. Pay the fine amount indicated above.",
        "3. Contact our office to schedule an inspection upon completion.",
        "4. Failure to comply may result in additional fines or legal action.",
      ];

      actions.forEach((action) => {
        page.drawText(action, {
          x: 50,
          y: yPosition,
          size: 10,
          font: regularFont,
          color: black,
        });
        yPosition -= 18;
      });

      yPosition -= 20;

      page.drawText("CONTACT INFORMATION", {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: darkRed,
      });

      yPosition -= 5;
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 1,
        color: darkRed,
      });

      yPosition -= 20;

      page.drawText(
        "For questions or to appeal this notice, please contact the Code Enforcement Office:",
        {
          x: 50,
          y: yPosition,
          size: 10,
          font: regularFont,
          color: darkGray,
        },
      );

      yPosition -= 18;

      page.drawText(
        "Phone: (555) 123-4567  |  Email: enforcement@municipality.gov",
        {
          x: 50,
          y: yPosition,
          size: 10,
          font: regularFont,
          color: darkGray,
        },
      );

      yPosition -= 18;

      page.drawText("Office Hours: Monday - Friday, 8:00 AM - 5:00 PM", {
        x: 50,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      });

      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: 40,
        color: darkRed,
      });

      page.drawText(
        "This is an official notice. Please retain for your records.",
        {
          x: 50,
          y: 15,
          size: 10,
          font: regularFont,
          color: rgb(1, 1, 1),
        },
      );

      page.drawText(`Ref: ${id}`, {
        x: width - 200,
        y: 15,
        size: 8,
        font: regularFont,
        color: rgb(0.8, 0.8, 0.8),
      });

      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

      const noticeResult = await client.query(
        `INSERT INTO notices (
          violation_id,
          pdf_data,
          generated_at,
          generated_by,
          notice_type
        ) VALUES ($1, $2, NOW(), $3, 'violation_notice')
        RETURNING id, generated_at`,
        [id, pdfBase64, session.user.email || session.user.name || "system"],
      );

      await client.query(
        `UPDATE violations SET status = 'notice_sent', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      await client.query("COMMIT");

      const notice = noticeResult.rows[0];

      return NextResponse.json(
        {
          success: true,
          notice: {
            id: notice.id,
            violation_id: id,
            generated_at: notice.generated_at,
            pdf_base64: pdfBase64,
          },
          violation_status: "notice_sent",
        },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error generating violation notice:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
