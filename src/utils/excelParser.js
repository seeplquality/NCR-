import * as XLSX from 'xlsx';

/**
 * Parses a Work Order Excel sheet with forward-fill logic.
 * Handles the specific layout where WO:NO and PROJECT are on the first row of each order,
 * and subsequent rows contain PANEL NAME in Column A or Column E.
 * 
 * @param {ArrayBuffer} buffer - Excel file binary buffer
 * @returns {Array<{ wo: string, project: string, panels: string[] }>}
 */
export function parseWorkOrderExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to 2D array of raw values
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows || rows.length === 0) return [];

  // Identify column indices from header row (Row 0)
  const headerRow = rows[0].map(h => String(h || '').trim().toUpperCase());
  
  let woCol = headerRow.findIndex(h => h.includes('WO') || h.includes('WORK ORDER') || h === 'WO:NO');
  let projCol = headerRow.findIndex(h => h.includes('PROJECT') || h.includes('CLIENT'));
  let panelCol = headerRow.findIndex(h => h.includes('PANEL') || h.includes('PANEL NAME'));

  // Sensible defaults if headers are formatted slightly differently
  if (woCol === -1) woCol = 2; // Column C
  if (projCol === -1) projCol = 3; // Column D
  if (panelCol === -1) panelCol = 4; // Column E

  const ordersMap = new Map();
  let currentWo = null;
  let currentProject = '';

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawWo = String(row[woCol] || '').trim();
    const rawProj = String(row[projCol] || '').trim();
    const col0 = String(row[0] || '').trim();
    const panelVal = String(row[panelCol] || '').trim();

    // Check if this row is completely empty
    const hasAnyContent = row.some(cell => String(cell || '').trim() !== '');
    if (!hasAnyContent) continue;

    if (rawWo) {
      currentWo = rawWo;
      currentProject = rawProj || '';
      
      if (!ordersMap.has(currentWo)) {
        ordersMap.set(currentWo, {
          wo: currentWo,
          project: currentProject,
          panels: []
        });
      } else {
        if (currentProject && !ordersMap.get(currentWo).project) {
          ordersMap.get(currentWo).project = currentProject;
        }
      }

      // Check panel name on this initial row
      const pName = panelVal || (col0 && !/^\d+$/.test(col0) ? col0 : '');
      if (pName && !ordersMap.get(currentWo).panels.includes(pName)) {
        ordersMap.get(currentWo).panels.push(pName);
      }
    } else if (currentWo) {
      // Forward-fill: Subsequent row under current order
      let pName = panelVal;
      if (!pName && col0 && !/^\d+$/.test(col0)) {
        pName = col0;
      }
      
      // Fallback search across row cells for panel name (excluding numeric serials and status text)
      if (!pName) {
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (
            val &&
            !/^\d+$/.test(val) &&
            !['COMPLETE', 'PENDING', 'PKD', 'IN PROGRESS'].includes(val.toUpperCase())
          ) {
            pName = val;
            break;
          }
        }
      }

      if (pName && !ordersMap.get(currentWo).panels.includes(pName)) {
        ordersMap.get(currentWo).panels.push(pName);
      }
    }
  }

  return Array.from(ordersMap.values());
}
