import { jsPDF } from 'jspdf';

/**
 * Generates an exact 2-page A4 PDF matching the NCR layout.
 * Page 1: Form details, annotated defect image, and touch signatures.
 * Page 2: Static printable CAPA / 5-Why RCA template.
 * 
 * @param {Object} data
 * @returns {jsPDF}
 */
export function generateNcrPdf(data) {
  // A4 dimensions in mm: 210 x 297
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const marginX = 14;
  const contentWidth = 210 - marginX * 2; // 182mm

  // ==========================================
  // PAGE 1: NON-CONFORMANCE REPORT
  // ==========================================
  drawHeader(doc, marginX, contentWidth);

  let currentY = 24;

  // Title Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.setFillColor(248, 250, 252); // light slate
  doc.rect(marginX, currentY, contentWidth, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('NON-CONFIRMANCE REPORT', 105, currentY + 5.5, { align: 'center' });

  currentY += 8;

  // Table 1: Primary Details (8 rows)
  const fields = [
    ['NC NUMBER', data.ncNumber || '-'],
    ['PANEL NAME', data.panelName || '-'],
    ['JOB NO', data.jobNo || '-'],
    ['CLIENT/PROJECT', data.clientProject || '-'],
    ['DATE', data.date || '-'],
    ['OPERATOR NAME', data.operatorName || '-'],
    ['QUANTITY', data.quantity || '1 NOs'],
    ['DEPARTMENT', data.department || '-']
  ];

  const col1Width = 52;
  const col2Width = contentWidth - col1Width; // 130mm
  const rowHeight = 6.2;

  fields.forEach(([label, value]) => {
    // Label cell
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, currentY, col1Width, rowHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(label, marginX + 3, currentY + 4.2);

    // Value cell
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX + col1Width, currentY, col2Width, rowHeight, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(String(value || ''), marginX + col1Width + 3, currentY + 4.2);

    currentY += rowHeight;
  });

  // Table 2: Problem Box
  const probColWidth = 35;
  const probValWidth = contentWidth - probColWidth;
  const probHeight = 12;

  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, currentY, probColWidth, probHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('PROBLEM', marginX + 3, currentY + 7);

  doc.setFillColor(255, 255, 255);
  doc.rect(marginX + probColWidth, currentY, probValWidth, probHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(159, 18, 57); // Rose bold

  const splitProblem = doc.splitTextToSize(String(data.problem || '-'), probValWidth - 6);
  doc.text(splitProblem, marginX + probColWidth + 3, currentY + 4.5);

  currentY += probHeight;

  // Table 3: Defect Image Box
  const imgHeaderHeight = 6.5;
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, currentY, contentWidth, imgHeaderHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DEFECT IMAGE', 105, currentY + 4.5, { align: 'center' });

  currentY += imgHeaderHeight;

  const imgBoxHeight = 82;
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, contentWidth, imgBoxHeight, 'FD');

  if (data.imageBuffer) {
    try {
      const imgProps = doc.getImageProperties(data.imageBuffer);
      const aspect = imgProps.width / imgProps.height;
      const maxW = contentWidth - 8;
      const maxH = imgBoxHeight - 6;

      let drawW = maxW;
      let drawH = drawW / aspect;

      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * aspect;
      }

      const imgX = marginX + (contentWidth - drawW) / 2;
      const imgY = currentY + (imgBoxHeight - drawH) / 2;
      const imgFormat = (typeof data.imageBuffer === 'string' && data.imageBuffer.includes('image/png')) ? 'PNG' : 'JPEG';
      doc.addImage(data.imageBuffer, imgFormat, imgX, imgY, drawW, drawH);
    } catch (e) {
      console.warn('Could not render image in PDF:', e);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('(Image attached)', 105, currentY + imgBoxHeight / 2, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('(No defect photo uploaded)', 105, currentY + imgBoxHeight / 2, { align: 'center' });
  }

  currentY += imgBoxHeight;

  // Table 4: Signatures (Quality Sign & Responsible Sign)
  const signColWidth = contentWidth / 2; // 91mm each
  const signHeaderHeight = 6.5;
  const signBoxHeight = 24;

  // Signature Headers - Clean white background (#FFFFFF) with crisp black bold text and black borders
  doc.setLineWidth(0.35);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, signColWidth, signHeaderHeight, 'FD');
  doc.rect(marginX + signColWidth, currentY, signColWidth, signHeaderHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('QUALITY SIGN', marginX + signColWidth / 2, currentY + 4.5, { align: 'center' });
  doc.text('RESPONSIBLE SIGN', marginX + signColWidth * 1.5, currentY + 4.5, { align: 'center' });

  currentY += signHeaderHeight;

  // Signature Content Cells
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, signColWidth, signBoxHeight, 'FD');
  doc.rect(marginX + signColWidth, currentY, signColWidth, signBoxHeight, 'FD');

  // Helper to render signature proportionally enlarged and centered (up to 52mm x 20mm)
  const renderSignatureInCell = (dataUrl, colX) => {
    try {
      const imgProps = doc.getImageProperties(dataUrl);
      const aspect = imgProps.width / imgProps.height;
      const maxW = 52; // 52mm
      const maxH = 20; // 20mm

      let drawW = maxW;
      let drawH = drawW / aspect;

      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * aspect;
      }

      const imgX = colX + (signColWidth - drawW) / 2;
      const imgY = currentY + (signBoxHeight - drawH) / 2;
      doc.addImage(dataUrl, 'PNG', imgX, imgY, drawW, drawH);
    } catch (err) {
      console.warn('Error adding signature to PDF:', err);
    }
  };

  // Embed Quality Sign if present
  if (data.qualitySign) {
    renderSignatureInCell(data.qualitySign, marginX);
  }

  // Embed Responsible Sign if present
  if (data.responsibleSign) {
    renderSignatureInCell(data.responsibleSign, marginX + signColWidth);
  }

  // Footer Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PAGE 1 OF 2', 210 - marginX, 290, { align: 'right' });

  // ==========================================
  // PAGE 2: STATIC PRINTABLE CAPA / RCA TEMPLATE
  // ==========================================
  doc.addPage();
  drawHeader(doc, marginX, contentWidth);

  let p2Y = 24;

  const drawDottedLine = (y) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginX, y, marginX + contentWidth, y);
    doc.setLineDashPattern([], 0); // reset
    doc.setDrawColor(0, 0, 0);
  };

  // Section 2: Immediate Containment Action
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('2. IMMEDIATE CONTAINMENT ACTION', marginX, p2Y);
  p2Y += 5;
  drawDottedLine(p2Y);
  p2Y += 6;
  drawDottedLine(p2Y);
  p2Y += 6;
  drawDottedLine(p2Y);
  p2Y += 7;

  // Section 3: Root Cause Analysis
  doc.text('3. ROOT CAUSE ANALYSIS', marginX, p2Y);
  p2Y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Problem:', marginX, p2Y);
  p2Y += 4;
  drawDottedLine(p2Y);
  p2Y += 5;
  drawDottedLine(p2Y);
  p2Y += 6;

  // 5 Whys
  const whys = ['Why 1:', 'Why 2:', 'Why 3:', 'Why 4:', 'Why 5:'];
  whys.forEach((why) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(why, marginX, p2Y);
    drawDottedLine(p2Y);
    p2Y += 5.5;
  });

  p2Y += 1;
  doc.text('Root Cause Identified:', marginX, p2Y);
  p2Y += 4.5;
  drawDottedLine(p2Y);
  p2Y += 5.5;

  doc.text('Contributing Cause(s):', marginX, p2Y);
  p2Y += 4.5;
  drawDottedLine(p2Y);
  p2Y += 5.5;
  drawDottedLine(p2Y);
  p2Y += 7;

  // Section 4: Correction / Rectification
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('4. CORRECTION / RECTIFICATION', marginX, p2Y);
  p2Y += 5;
  drawDottedLine(p2Y);
  p2Y += 5.5;
  drawDottedLine(p2Y);
  p2Y += 5.5;

  // Checkboxes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Disposition:', marginX, p2Y);

  const drawCheckbox = (x, y, text) => {
    doc.rect(x, y - 2.8, 3.2, 3.2);
    doc.setFont('helvetica', 'normal');
    doc.text(text, x + 5, y);
  };

  drawCheckbox(marginX + 25, p2Y, 'Rework');
  drawCheckbox(marginX + 55, p2Y, 'Use as Is – Approved Deviation');
  drawCheckbox(marginX + 120, p2Y, 'Scrap');

  p2Y += 8;

  // Section 5: Corrective Action
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('5. CORRECTIVE ACTION', marginX, p2Y);
  p2Y += 5;
  drawDottedLine(p2Y);
  p2Y += 5.5;
  drawDottedLine(p2Y);
  p2Y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Responsible Person: ______________________', marginX, p2Y);
  doc.text('Target Date: _________________', marginX + 70, p2Y);
  doc.text('Completion Date: _________________', marginX + 125, p2Y);

  p2Y += 8;

  // Section 6: Preventive Action
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('6. PREVENTIVE ACTION', marginX, p2Y);
  p2Y += 5;
  drawDottedLine(p2Y);
  p2Y += 5.5;
  drawDottedLine(p2Y);

  p2Y += 8;

  // Bottom 3-column Signatures Table
  const sign3ColWidth = contentWidth / 3; // ~60.6mm each
  const sign3HeaderHeight = 6;
  const sign3BoxHeight = 16;

  doc.setLineWidth(0.35);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);

  // Draw all three header boxes first with clean white background and black borders
  doc.rect(marginX, p2Y, sign3ColWidth, sign3HeaderHeight, 'FD');
  doc.rect(marginX + sign3ColWidth, p2Y, sign3ColWidth, sign3HeaderHeight, 'FD');
  doc.rect(marginX + sign3ColWidth * 2, p2Y, sign3ColWidth, sign3HeaderHeight, 'FD');

  // Draw header labels in crisp black bold text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('RESPONSIBLE PERSON', marginX + sign3ColWidth / 2, p2Y + 4.2, { align: 'center' });
  doc.text('QUALITY', marginX + sign3ColWidth * 1.5, p2Y + 4.2, { align: 'center' });
  doc.text('PLANT DIRECTOR', marginX + sign3ColWidth * 2.5, p2Y + 4.2, { align: 'center' });

  p2Y += sign3HeaderHeight;

  // Blank signature boxes for physical sign-off
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, p2Y, sign3ColWidth, sign3BoxHeight, 'FD');
  doc.rect(marginX + sign3ColWidth, p2Y, sign3ColWidth, sign3BoxHeight, 'FD');
  doc.rect(marginX + sign3ColWidth * 2, p2Y, sign3ColWidth, sign3BoxHeight, 'FD');

  // Footer Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PAGE 2 OF 2', 210 - marginX, 290, { align: 'right' });

  return doc;
}

/**
 * Draws the top company header and doc reference.
 */
function drawHeader(doc, marginX, contentWidth) {
  // Yellow highlighted company banner
  doc.setFillColor(254, 240, 138); // Yellow 200
  doc.setDrawColor(234, 179, 8); // Yellow 500
  doc.setLineWidth(0.2);
  doc.roundedRect(marginX + 20, 8, contentWidth - 40, 7.5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SARAVANAN ELECTRICALS & ENGINEERING PVT LTD.,', 105, 13, { align: 'center' });

  // Document reference number on top right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DOC No:SEEPL/QC/02/NCR/R2/26-27', marginX + contentWidth, 19.5, { align: 'right' });
}
