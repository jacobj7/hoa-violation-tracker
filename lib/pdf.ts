import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface ViolationDetails {
  address: string;
  category: string;
  description: string;
  cure_deadline: string;
  fine_amount: number;
}

export async function generateViolationNoticePDF(
  violation: ViolationDetails,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const margin = 72;
  const contentWidth = width - margin * 2;

  // Header background
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.12, 0.24, 0.45),
  });

  // Title
  page.drawText("VIOLATION NOTICE", {
    x: margin,
    y: height - 55,
    size: 28,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Official Code Enforcement Notice", {
    x: margin,
    y: height - 80,
    size: 12,
    font: helvetica,
    color: rgb(0.8, 0.85, 0.95),
  });

  // Date issued
  const issuedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  page.drawText(`Date Issued: ${issuedDate}`, {
    x: width - margin - 200,
    y: height - 55,
    size: 11,
    font: helvetica,
    color: rgb(0.8, 0.85, 0.95),
  });

  let currentY = height - 130;

  // Section: Property Information
  currentY = drawSectionHeader(
    page,
    "PROPERTY INFORMATION",
    margin,
    currentY,
    contentWidth,
    helveticaBold,
  );
  currentY -= 5;

  currentY = drawLabelValue(
    page,
    "Property Address:",
    violation.address,
    margin,
    currentY,
    helveticaBold,
    helvetica,
  );
  currentY -= 20;

  // Section: Violation Details
  currentY = drawSectionHeader(
    page,
    "VIOLATION DETAILS",
    margin,
    currentY,
    contentWidth,
    helveticaBold,
  );
  currentY -= 5;

  currentY = drawLabelValue(
    page,
    "Violation Category:",
    violation.category,
    margin,
    currentY,
    helveticaBold,
    helvetica,
  );
  currentY -= 15;

  // Description label
  page.drawText("Description:", {
    x: margin,
    y: currentY,
    size: 11,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  currentY -= 18;

  // Wrap description text
  const descLines = wrapText(
    violation.description,
    helvetica,
    11,
    contentWidth,
  );
  for (const line of descLines) {
    page.drawText(line, {
      x: margin,
      y: currentY,
      size: 11,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= 16;
  }
  currentY -= 10;

  // Section: Compliance Requirements
  currentY = drawSectionHeader(
    page,
    "COMPLIANCE REQUIREMENTS",
    margin,
    currentY,
    contentWidth,
    helveticaBold,
  );
  currentY -= 5;

  // Cure deadline box
  page.drawRectangle({
    x: margin,
    y: currentY - 40,
    width: contentWidth / 2 - 10,
    height: 55,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.12, 0.24, 0.45),
    borderWidth: 1.5,
  });

  page.drawText("CURE DEADLINE", {
    x: margin + 10,
    y: currentY - 15,
    size: 9,
    font: helveticaBold,
    color: rgb(0.12, 0.24, 0.45),
  });

  const deadlineFormatted = formatDate(violation.cure_deadline);
  page.drawText(deadlineFormatted, {
    x: margin + 10,
    y: currentY - 32,
    size: 14,
    font: helveticaBold,
    color: rgb(0.8, 0.2, 0.1),
  });

  // Fine amount box
  const fineBoxX = margin + contentWidth / 2 + 10;
  page.drawRectangle({
    x: fineBoxX,
    y: currentY - 40,
    width: contentWidth / 2 - 10,
    height: 55,
    color: rgb(1, 0.96, 0.94),
    borderColor: rgb(0.8, 0.2, 0.1),
    borderWidth: 1.5,
  });

  page.drawText("FINE AMOUNT", {
    x: fineBoxX + 10,
    y: currentY - 15,
    size: 9,
    font: helveticaBold,
    color: rgb(0.8, 0.2, 0.1),
  });

  const fineFormatted = formatCurrency(violation.fine_amount);
  page.drawText(fineFormatted, {
    x: fineBoxX + 10,
    y: currentY - 32,
    size: 14,
    font: helveticaBold,
    color: rgb(0.8, 0.2, 0.1),
  });

  currentY -= 60;
  currentY -= 20;

  // Warning text
  page.drawRectangle({
    x: margin,
    y: currentY - 50,
    width: contentWidth,
    height: 65,
    color: rgb(1, 0.97, 0.9),
    borderColor: rgb(0.9, 0.6, 0.1),
    borderWidth: 1,
  });

  page.drawText("⚠  IMPORTANT NOTICE", {
    x: margin + 10,
    y: currentY - 15,
    size: 11,
    font: helveticaBold,
    color: rgb(0.7, 0.4, 0.0),
  });

  const warningText =
    "Failure to cure the violation by the deadline may result in additional fines, legal action, or property liens.";
  const warningLines = wrapText(warningText, helvetica, 10, contentWidth - 20);
  let warningY = currentY - 30;
  for (const line of warningLines) {
    page.drawText(line, {
      x: margin + 10,
      y: warningY,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.3, 0.0),
    });
    warningY -= 14;
  }

  currentY -= 80;
  currentY -= 20;

  // Footer divider
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  currentY -= 20;

  page.drawText(
    "This is an official notice issued by the Code Enforcement Department.",
    {
      x: margin,
      y: currentY,
      size: 9,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  currentY -= 14;
  page.drawText(
    "Please retain this document for your records. Contact us if you have questions regarding this notice.",
    {
      x: margin,
      y: currentY,
      size: 9,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  // Page number
  page.drawText("Page 1 of 1", {
    x: width - margin - 50,
    y: 30,
    size: 9,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function drawSectionHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  title: string,
  x: number,
  y: number,
  width: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): number {
  page.drawRectangle({
    x,
    y: y - 20,
    width,
    height: 22,
    color: rgb(0.9, 0.92, 0.96),
  });

  page.drawText(title, {
    x: x + 8,
    y: y - 14,
    size: 10,
    font,
    color: rgb(0.12, 0.24, 0.45),
  });

  return y - 30;
}

function drawLabelValue(
  page: ReturnType<PDFDocument["addPage"]>,
  label: string,
  value: string,
  x: number,
  y: number,
  boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  regularFont: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): number {
  page.drawText(label, {
    x,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(value, {
    x: x + 160,
    y,
    size: 11,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  return y - 18;
}

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}
