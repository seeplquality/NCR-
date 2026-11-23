import JSZip from 'jszip';
import { TEMPLATE_DOCX_BASE64 } from '../assets/templateBase64.js';

/**
 * Helper to escape special XML characters.
 */
function xmlEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Helper to convert dataURL to Uint8Array.
 */
function dataUrlToUint8Array(dataUrl) {
  const base64Data = dataUrl.split(',')[1];
  const binaryStr = atob(base64Data);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Reads image dimensions (width, height) directly from PNG header bytes (IHDR chunk).
 */
function getPngDimensions(bytes) {
  if (!bytes || bytes.length < 24) return null;
  // PNG signature: 137, 80, 78, 71, 13, 10, 26, 10
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
    const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }
  return null;
}

/**
 * Creates inline drawing XML for a signature image with proportional aspect ratio.
 */
function createSignatureDrawingXml(relId, docPrId, widthEmu = 1600000, heightEmu = 650000) {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="Sign ${docPrId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="Picture ${docPrId}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

/**
 * Replaces the value cell in a 2-column Word table row where the first cell matches rowHeader.
 */
function replaceTableRowValue(xml, rowHeader, newValue) {
  const trRegex = new RegExp(
    '(<w:tr[\\s\\S]*?<w:t[^>]*>' + rowHeader + '<\\/w:t>[\\s\\S]*?<\\/w:tc>\\s*<w:tc>)([\\s\\S]*?)(<\\/w:tc>\\s*<\\/w:tr>)',
    'g'
  );

  return xml.replace(trRegex, (match, before, cellContent, after) => {
    const tcPrMatch = cellContent.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
    const tcPr = tcPrMatch
      ? tcPrMatch[0]
      : '<w:tcPr><w:tcW w:w="6662" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr>';

    return `${before}${tcPr}<w:p w14:paraId="12345678" w14:textId="77777777"><w:pPr><w:snapToGrid w:val="0"/><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:sz w:val="24"/></w:rPr><w:t>${xmlEscape(newValue || '')}</w:t></w:r></w:p>${after}`;
  });
}

/**
 * Generates an NCR .docx blob based on the exact template.
 * 
 * @param {Object} data
 * @param {string} data.ncNumber
 * @param {string} data.panelName
 * @param {string} data.jobNo
 * @param {string} data.clientProject
 * @param {string} data.date - Formatted as DD.MM.YYYY
 * @param {string} data.operatorName
 * @param {string} data.quantity - Formatted as "<qty> NOs"
 * @param {string} data.department
 * @param {string} data.problem
 * @param {Uint8Array|ArrayBuffer|Blob|string|null} [data.imageBuffer] - User defect image binary or dataURL
 * @param {number} [data.imageWidth]
 * @param {number} [data.imageHeight]
 * @param {string|null} [data.qualitySign] - Optional dataURL PNG
 * @param {string|null} [data.responsibleSign] - Optional dataURL PNG
 * @returns {Promise<Blob>}
 */
export async function generateNcrDocx(data) {
  // Load template from embedded base64
  const zip = await JSZip.loadAsync(TEMPLATE_DOCX_BASE64, { base64: true });

  let docXml = await zip.file('word/document.xml').async('string');

  // Replace Page 1 Table 1 Fields
  docXml = replaceTableRowValue(docXml, 'NC NUMBER', data.ncNumber);
  docXml = replaceTableRowValue(docXml, 'PANEL NAME', data.panelName);
  docXml = replaceTableRowValue(docXml, 'JOB NO', data.jobNo);
  docXml = replaceTableRowValue(docXml, 'CLIENT/PROJECT', data.clientProject);
  docXml = replaceTableRowValue(docXml, 'DATE', data.date);
  docXml = replaceTableRowValue(docXml, 'OPERATOR NAME', data.operatorName);
  docXml = replaceTableRowValue(docXml, 'QUANTITY', data.quantity);
  docXml = replaceTableRowValue(docXml, 'DEPARTMENT', data.department);

  // Replace PROBLEM in Table 2
  const problemRegex = /(<w:tr[\s\S]*?<w:t[^>]*>PROBLEM<\/w:t>[\s\S]*?<\/w:tc>\s*<w:tc>)([\s\S]*?)(<\/w:tc>\s*<\/w:tr>)/;
  docXml = docXml.replace(problemRegex, (match, before, cellContent, after) => {
    const tcPrMatch = cellContent.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
    const tcPr = tcPrMatch
      ? tcPrMatch[0]
      : '<w:tcPr><w:tcW w:w="7279" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders></w:tcPr>';
    return `${before}${tcPr}<w:p w14:paraId="87654321" w14:textId="77777777"><w:pPr><w:snapToGrid w:val="0"/><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:sz w:val="24"/></w:rPr><w:t>${xmlEscape(data.problem || '')}</w:t></w:r></w:p>${after}`;
  });

  // Handle Defect Image (Table 3) - Zero leftover dummy image guarantee
  const defectImgRegex = /(<w:tbl[\s\S]*?DEFECT IMAGE[\s\S]*?<w:tr[^>]*>\s*<w:trPr><w:trHeight w:val="2663"\/><\/w:trPr>\s*)(<w:tc>[\s\S]*?<\/w:tc>)(\s*<\/w:tr>\s*<\/w:tbl>)/;

  if (data.imageBuffer) {
    let imgBinary = data.imageBuffer;
    if (typeof imgBinary === 'string' && imgBinary.startsWith('data:')) {
      imgBinary = dataUrlToUint8Array(imgBinary);
    }

    // Replace the media file in the zip with the user's actual defect photo
    zip.file('word/media/image1.jpeg', imgBinary);

    // Max width: 5731510 EMUs (~6.268 inches), Max height: 3038475 EMUs (~3.32 inches)
    const MAX_CX = 5731510;
    const MAX_CY = 3038475;

    let targetCx = MAX_CX;
    let targetCy = MAX_CY;

    if (data.imageWidth && data.imageHeight) {
      const aspectRatio = data.imageWidth / data.imageHeight;
      const boxRatio = MAX_CX / MAX_CY;

      if (aspectRatio > boxRatio) {
        targetCx = MAX_CX;
        targetCy = Math.round(MAX_CX / aspectRatio);
      } else {
        targetCy = MAX_CY;
        targetCx = Math.round(MAX_CY * aspectRatio);
      }
    }

    docXml = docXml.replace(
      /(<wp:extent\s+cx=")\d+("\s+cy=")\d+(")/,
      `$1${targetCx}$2${targetCy}$3`
    );
    docXml = docXml.replace(
      /(<a:xfrm>[\s\S]*?<a:ext\s+cx=")\d+("\s+cy=")\d+(")/,
      `$1${targetCx}$2${targetCy}$3`
    );
  } else {
    // No user image uploaded: completely clear the sample drawing so the cell is clean and blank
    const emptyDefectCell = '<w:tc><w:tcPr><w:tcW w:w="9246" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="05446EA8" w14:textId="77777777" w:rsidR="00E80284" w:rsidRDefault="00E80284" w:rsidP="00E80284"/></w:tc>';
    docXml = docXml.replace(defectImgRegex, `$1${emptyDefectCell}$3`);
    
    // Replace media with tiny 1x1 transparent dummy to avoid dead reference
    const blankPng = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);
    zip.file('word/media/image1.jpeg', blankPng);
  }

  // Handle Digital Signatures (Quality Sign & Responsible Sign in Table 4)
  const hasQualitySign = Boolean(data.qualitySign && data.qualitySign.startsWith('data:image'));
  const hasRespSign = Boolean(data.responsibleSign && data.responsibleSign.startsWith('data:image'));

  if (hasQualitySign || hasRespSign) {
    // 1. Ensure PNG content type
    let contentTypesXml = await zip.file('[Content_Types].xml').async('string');
    if (!contentTypesXml.includes('Extension="png"')) {
      contentTypesXml = contentTypesXml.replace(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/>'
      );
      zip.file('[Content_Types].xml', contentTypesXml);
    }

    // 2. Add relationships for signatures if needed
    let relsXml = await zip.file('word/_rels/document.xml.rels').async('string');
    let relsToAdd = '';
    let qBytes = null;
    let rBytes = null;

    if (hasQualitySign) {
      qBytes = dataUrlToUint8Array(data.qualitySign);
      if (!relsXml.includes('rIdQualitySign')) {
        relsToAdd += '<Relationship Id="rIdQualitySign" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/quality_sign.png"/>';
      }
      zip.file('word/media/quality_sign.png', qBytes);
    }

    if (hasRespSign) {
      rBytes = dataUrlToUint8Array(data.responsibleSign);
      if (!relsXml.includes('rIdRespSign')) {
        relsToAdd += '<Relationship Id="rIdRespSign" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/responsible_sign.png"/>';
      }
      zip.file('word/media/responsible_sign.png', rBytes);
    }

    if (relsToAdd) {
      relsXml = relsXml.replace('</Relationships>', `${relsToAdd}</Relationships>`);
      zip.file('word/_rels/document.xml.rels', relsXml);
    }

    // 3. Proportional EMU dimension calculation
    const maxEmuWidth = 1600000; // ~1.75 inches (cell width is 3.13 inches)
    const maxEmuHeight = 650000; // ~0.71 inches (cell height is 1.425 inches)

    const calcSignEmu = (bytes) => {
      const dim = getPngDimensions(bytes);
      if (!dim || !dim.width || !dim.height) return { w: maxEmuWidth, h: maxEmuHeight };
      const aspect = dim.width / dim.height;
      let w = maxEmuWidth;
      let h = Math.round(w / aspect);
      if (h > maxEmuHeight) {
        h = maxEmuHeight;
        w = Math.round(h * aspect);
      }
      return { w, h };
    };

    // 4. Embed signatures into Table 4 cells
    const table4Regex = /(<w:tbl[\s\S]*?QUALITY SIGN[\s\S]*?<w:tr[^>]*>\s*<w:trPr><w:trHeight w:val="2052"\/><\/w:trPr>\s*)(<w:tc>[\s\S]*?<\/w:tc>\s*<w:tc>[\s\S]*?<\/w:tc>)(\s*<\/w:tr>\s*<\/w:tbl>)/;

    let cell0Drawing = '';
    if (hasQualitySign && qBytes) {
      const qEmu = calcSignEmu(qBytes);
      cell0Drawing = createSignatureDrawingXml('rIdQualitySign', 301, qEmu.w, qEmu.h);
    }

    let cell1Drawing = '';
    if (hasRespSign && rBytes) {
      const rEmu = calcSignEmu(rBytes);
      cell1Drawing = createSignatureDrawingXml('rIdRespSign', 302, rEmu.w, rEmu.h);
    }

    const cell0Content = hasQualitySign
      ? `<w:tc><w:tcPr><w:tcW w:w="4508" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="3C8BDFD2" w14:textId="77777777"><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${cell0Drawing}</w:r></w:p></w:tc>`
      : `<w:tc><w:tcPr><w:tcW w:w="4508" w:type="dxa"/></w:tcPr><w:p w14:paraId="3C8BDFD2" w14:textId="77777777" w:rsidR="00AD6FEC" w:rsidRDefault="00AD6FEC" w:rsidP="00AD6FEC"/></w:tc>`;

    const cell1Content = hasRespSign
      ? `<w:tc><w:tcPr><w:tcW w:w="4508" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="5D165F9E" w14:textId="77777777"><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${cell1Drawing}</w:r></w:p></w:tc>`
      : `<w:tc><w:tcPr><w:tcW w:w="4508" w:type="dxa"/></w:tcPr><w:p w14:paraId="5D165F9E" w14:textId="77777777" w:rsidR="00AD6FEC" w:rsidRDefault="00AD6FEC" w:rsidP="00AD6FEC"/></w:tc>`;

    docXml = docXml.replace(table4Regex, `$1${cell0Content}${cell1Content}$3`);
  }

  // Save modified document.xml back into zip
  zip.file('word/document.xml', docXml);

  // Generate output .docx as Blob
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  return blob;
}
