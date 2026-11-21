/**
 * ==============================================================================
 * SARAVANAN ELECTRICALS & ENGINEERING PVT LTD
 * Non-Conformance Report (NCR) System - Google Apps Script Web App Webhook
 * ==============================================================================
 * 
 * DEPLOYMENT INSTRUCTIONS (NO GCP OR SERVICE ACCOUNTS NEEDED!):
 * 1. Open your master Google Spreadsheet (containing the Work Orders).
 * 2. In Google Sheets menu, click: Extensions -> Apps Script.
 * 3. Delete any default code in Code.gs, and paste the entirety of this file.
 * 4. Set your Google Drive Folder IDs in IMAGES_FOLDER_ID and REPORTS_FOLDER_ID below:
 *    (Get Folder ID from your Google Drive folder URL: drive.google.com/drive/folders/<FOLDER_ID>)
 * 5. Click "Deploy" (top right button) -> "New deployment".
 * 6. Click the gear icon next to "Select type" -> choose "Web app".
 * 7. Configure:
 *    - Description: NCR Web App Webhook
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 8. Click "Deploy" -> Authorize permissions (Advanced -> Go to ... (unsafe) -> Allow).
 * 9. Copy the generated Web App URL (starts with https://script.google.com/macros/s/...).
 * 10. Paste into your .env file:
 *     VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"
 * ==============================================================================
 */

// ==========================================
// CONFIGURATION: DRIVE FOLDER IDS
// ==========================================
// Folder for storing defect photos:
const IMAGES_FOLDER_ID = "YOUR_IMAGES_FOLDER_ID_HERE";

// Separate folder for storing generated .docx and .pdf NCR reports:
const REPORTS_FOLDER_ID = "YOUR_REPORTS_FOLDER_ID_HERE";

// Sheet tab names
const WORK_ORDERS_SHEET_NAME = "Work_Orders";
const NCR_LOGS_SHEET_NAME = "NCR_Logs";

// 13 Column Headers for NCR_Logs
const NCR_LOGS_HEADERS = [
  "NC_NUMBER",
  "DATE",
  "JOB_NO",
  "CLIENT_PROJECT",
  "PANEL_NAME",
  "QUANTITY",
  "DEPARTMENT",
  "OPERATOR_NAME",
  "PROBLEM",
  "IMAGE_LINK",
  "DOCX_LINK",
  "PDF_LINK",
  "CREATED_AT"
];

/**
 * Handles GET requests:
 * - Fetches Work Orders with forward-fill logic (WO:NO -> Client/Project -> Panels)
 * - Fetches next available NC Number and existing NCR logs
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "init";

    // 1. Next NC Number and Logs
    const ncrData = getNcrLogsAndNextNumber(ss);

    if (action === "next-nc") {
      return jsonResponse({
        status: "success",
        nextNcNumber: ncrData.nextNcNumber,
        highestUsed: ncrData.highestUsed,
        totalRecords: ncrData.logs.length
      });
    }

    if (action === "logs") {
      return jsonResponse({
        status: "success",
        logs: ncrData.logs
      });
    }

    // 2. Work Orders
    const orders = getWorkOrders(ss);

    if (action === "work-orders") {
      return jsonResponse({
        status: "success",
        orders: orders,
        count: orders.length
      });
    }

    // Default 'init': return combined payload for single fast network handshake
    return jsonResponse({
      status: "success",
      orders: orders,
      nextNcNumber: ncrData.nextNcNumber,
      highestUsed: ncrData.highestUsed,
      logs: ncrData.logs
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Handles POST requests:
 * - Verifies NC Number is unique
 * - Uploads defect photo to Google Drive
 * - Uploads .docx & .pdf reports to Google Drive
 * - Appends 13-column row to NCR_Logs sheet
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "No payload received" });
    }

    const data = JSON.parse(e.postData.contents);
    const targetNc = String(data.ncNumber || "").trim();

    if (!targetNc) {
      return jsonResponse({ status: "error", message: "NC Number is required" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ncrSheet = ensureNcrLogsSheet(ss);

    // 1. Verify Uniqueness in NCR_Logs
    const existingLogs = getNcrLogsAndNextNumber(ss);
    const duplicate = existingLogs.logs.find(function(item) {
      return String(item.ncNumber || "").trim().toLowerCase() === targetNc.toLowerCase();
    });

    if (duplicate) {
      return jsonResponse({
        status: "error",
        error: "DUPLICATE_NC_NUMBER",
        message: "NC Number " + targetNc + " has already been registered for Job " + duplicate.jobNo + " on " + duplicate.date + ".",
        existingRecord: duplicate,
        nextNcNumber: existingLogs.nextNcNumber
      });
    }

    const cleanJob = String(data.jobNo || "NCR").replace(/[\\/:*?"<>|]+/g, "_");
    const cleanProblem = String(data.problem || "ISSUE").replace(/[\\/:*?"<>|]+/g, "_").substring(0, 35);
    const nowIso = new Date().toISOString();

    // 2. Upload Defect Image to Google Drive
    let imageLink = "";
    if (data.imageBase64 && IMAGES_FOLDER_ID && IMAGES_FOLDER_ID !== "YOUR_IMAGES_FOLDER_ID_HERE") {
      try {
        const imgName = targetNc + "_" + cleanJob + ".jpg";
        imageLink = saveBase64ToDrive(data.imageBase64, IMAGES_FOLDER_ID, imgName, "image/jpeg");
      } catch (imgErr) {
        Logger.log("Image upload error: " + imgErr.toString());
      }
    }

    // 3. Upload DOCX Report to Google Drive (ONLY if Word format was chosen)
    let docxLink = "";
    if (data.fileType === "docx" && data.docxBase64 && String(data.docxBase64).trim() !== "" && REPORTS_FOLDER_ID && REPORTS_FOLDER_ID !== "YOUR_REPORTS_FOLDER_ID_HERE") {
      try {
        const docxName = data.docxFileName || (targetNc + ". " + cleanProblem + ".docx");
        docxLink = saveBase64ToDrive(
          data.docxBase64,
          REPORTS_FOLDER_ID,
          docxName,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      } catch (docxErr) {
        Logger.log("DOCX upload error: " + docxErr.toString());
      }
    }

    // 4. Upload PDF Report to Google Drive (ONLY if PDF format was chosen)
    let pdfLink = "";
    if (data.fileType === "pdf" && data.pdfBase64 && String(data.pdfBase64).trim() !== "" && REPORTS_FOLDER_ID && REPORTS_FOLDER_ID !== "YOUR_REPORTS_FOLDER_ID_HERE") {
      try {
        const pdfName = data.pdfFileName || (targetNc + ". " + cleanProblem + ".pdf");
        pdfLink = saveBase64ToDrive(
          data.pdfBase64,
          REPORTS_FOLDER_ID,
          pdfName,
          "application/pdf"
        );
      } catch (pdfErr) {
        Logger.log("PDF upload error: " + pdfErr.toString());
      }
    }

    // 5. Append 13-column record to NCR_Logs
    const rowValues = [
      targetNc,
      data.date || "",
      data.jobNo || "",
      data.clientProject || "",
      data.panelName || "",
      data.quantity || "1 NOs",
      data.department || "",
      data.operatorName || "",
      data.problem || "",
      imageLink,
      docxLink,
      pdfLink,
      nowIso
    ];

    ncrSheet.appendRow(rowValues);

    // Compute next sequential NC Number
    const updatedState = getNcrLogsAndNextNumber(ss);

    return jsonResponse({
      status: "success",
      message: "NCR registered successfully",
      savedRecord: {
        ncNumber: targetNc,
        date: data.date,
        jobNo: data.jobNo,
        clientProject: data.clientProject,
        panelName: data.panelName,
        quantity: data.quantity,
        department: data.department,
        operatorName: data.operatorName,
        problem: data.problem,
        imageLink: imageLink,
        docxLink: docxLink,
        pdfLink: pdfLink,
        createdAt: nowIso
      },
      imageLink: imageLink,
      docxLink: docxLink,
      pdfLink: pdfLink,
      nextNcNumber: updatedState.nextNcNumber
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Saves a base64 encoded string into Google Drive folder with public view permission.
 */
function saveBase64ToDrive(base64Str, folderId, fileName, mimeType) {
  if (!base64Str || !folderId) return "";

  // Strip data URL scheme prefix if present (e.g. data:image/jpeg;base64,...)
  let cleanBase64 = base64Str;
  if (base64Str.indexOf(",") > -1) {
    cleanBase64 = base64Str.split(",")[1];
  }

  const decodedBytes = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  // Set file viewable to anyone with the link
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("Could not set public sharing on file: " + e.toString());
  }

  return file.getUrl();
}

/**
 * Ensures that NCR_Logs sheet exists and has the required 13 column headers.
 */
function ensureNcrLogsSheet(ss) {
  let sheet = ss.getSheetByName(NCR_LOGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(NCR_LOGS_SHEET_NAME);
    sheet.appendRow(NCR_LOGS_HEADERS);
    sheet.setFrozenRows(1);

    // Format Header Row
    const headerRange = sheet.getRange(1, 1, 1, NCR_LOGS_HEADERS.length);
    headerRange.setBackground("#1E293B");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
  } else {
    // If sheet exists, ensure headers have all 13 columns
    const curHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    if (curHeaders.length < NCR_LOGS_HEADERS.length) {
      sheet.getRange(1, 1, 1, NCR_LOGS_HEADERS.length).setValues([NCR_LOGS_HEADERS]);
    }
  }
  return sheet;
}

/**
 * Reads NCR_Logs tab, computes highest NC number and next sequential number.
 */
function getNcrLogsAndNextNumber(ss) {
  const sheet = ensureNcrLogsSheet(ss);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {
      nextNcNumber: "1",
      highestUsed: "0",
      logs: []
    };
  }

  const numCols = NCR_LOGS_HEADERS.length;
  const data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

  let maxNum = 0;
  const logs = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rawNc = String(row[0] || "").trim();

    if (rawNc) {
      const match = rawNc.match(/^\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }

      logs.push({
        ncNumber: rawNc,
        date: formatDateDisplay(row[1]),
        jobNo: String(row[2] || ""),
        clientProject: String(row[3] || ""),
        panelName: String(row[4] || ""),
        quantity: String(row[5] || ""),
        department: String(row[6] || ""),
        operatorName: String(row[7] || ""),
        problem: String(row[8] || ""),
        imageLink: String(row[9] || ""),
        docxLink: String(row[10] || ""),
        pdfLink: String(row[11] || ""),
        createdAt: row[12] instanceof Date ? row[12].toISOString() : String(row[12] || "")
      });
    }
  }

  const nextNum = maxNum > 0 ? maxNum + 1 : 1;

  return {
    nextNcNumber: String(nextNum),
    highestUsed: String(maxNum),
    logs: logs
  };
}

/**
 * Reads Work_Orders sheet with forward-fill (ffill) across panel rows.
 */
function getWorkOrders(ss) {
  let sheet = ss.getSheetByName(WORK_ORDERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return [];
  }

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headerRow = data[0].map(function(h) {
    return String(h || "").trim().toUpperCase();
  });

  let woCol = -1;
  let projCol = -1;
  let panelCol = -1;

  for (let c = 0; c < headerRow.length; c++) {
    const colName = headerRow[c];
    if (woCol === -1 && (colName.indexOf("WO") > -1 || colName.indexOf("WORK ORDER") > -1)) {
      woCol = c;
    }
    if (projCol === -1 && (colName.indexOf("PROJECT") > -1 || colName.indexOf("CLIENT") > -1)) {
      projCol = c;
    }
    if (panelCol === -1 && (colName.indexOf("PANEL") > -1)) {
      panelCol = c;
    }
  }

  // Fallbacks based on standard WORK ORDER NO FORMAT (2).xlsx layout
  if (woCol === -1) woCol = 2; // Column C
  if (projCol === -1) projCol = 3; // Column D
  if (panelCol === -1) panelCol = 4; // Column E

  const ordersMap = {};
  const ordersList = [];
  let currentWo = null;
  let currentProject = "";

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length === 0) continue;

    const rawWo = String(row[woCol] || "").trim();
    const rawProj = String(row[projCol] || "").trim();
    const col0 = String(row[0] || "").trim();
    const panelVal = String(row[panelCol] || "").trim();

    if (rawWo) {
      currentWo = rawWo;
      currentProject = rawProj || "";

      if (!ordersMap[currentWo]) {
        ordersMap[currentWo] = {
          wo: currentWo,
          project: currentProject,
          panels: []
        };
        ordersList.push(ordersMap[currentWo]);
      } else if (currentProject && !ordersMap[currentWo].project) {
        ordersMap[currentWo].project = currentProject;
      }

      const pName = panelVal || (col0 && !/^\d+$/.test(col0) ? col0 : "");
      if (pName && ordersMap[currentWo].panels.indexOf(pName) === -1) {
        ordersMap[currentWo].panels.push(pName);
      }
    } else if (currentWo) {
      let pName = panelVal;
      if (!pName && col0 && !/^\d+$/.test(col0)) {
        pName = col0;
      }
      if (!pName) {
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || "").trim();
          if (val && !/^\d+$/.test(val) && ["COMPLETE", "PENDING", "PKD", "IN PROGRESS"].indexOf(val.toUpperCase()) === -1) {
            pName = val;
            break;
          }
        }
      }

      if (pName && ordersMap[currentWo].panels.indexOf(pName) === -1) {
        ordersMap[currentWo].panels.push(pName);
      }
    }
  }

  return ordersList;
}

/**
 * Helper to format date cleanly.
 */
function formatDateDisplay(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const dd = String(val.getDate()).padStart(2, "0");
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const yyyy = val.getFullYear();
    return dd + "." + mm + "." + yyyy;
  }
  return String(val);
}

/**
 * Helper to return JSON response with proper CORS headers.
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
