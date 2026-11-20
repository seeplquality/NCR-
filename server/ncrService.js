import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE_PATH = path.resolve(__dirname, '..', 'ncr_history.json');

// Initial seed is completely empty for clean production use
const INITIAL_SEED_RECORDS = [];

/**
 * Reads all NCR records from ncr_history.json.
 * Initializes file with reference seed if missing.
 */
export function getHistoryRecords() {
  try {
    if (!fs.existsSync(HISTORY_FILE_PATH)) {
      fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(INITIAL_SEED_RECORDS, null, 2), 'utf8');
      return [...INITIAL_SEED_RECORDS];
    }
    const content = fs.readFileSync(HISTORY_FILE_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading ncr_history.json:', err);
    return [...INITIAL_SEED_RECORDS];
  }
}

/**
 * Saves records array to ncr_history.json.
 */
export function saveHistoryRecords(records) {
  try {
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving ncr_history.json:', err);
    throw err;
  }
}

/**
 * Computes the next available NC Number.
 * Scans all existing records, parses numeric parts, and returns (highest + 1).
 */
export function getNextNcNumber() {
  const records = getHistoryRecords();
  let maxNum = 0;

  for (const r of records) {
    const raw = String(r.ncNumber || '').trim();
    // Parse leading integer or integer value
    const match = raw.match(/^\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum > 0 ? maxNum + 1 : 1;
  return {
    nextNcNumber: String(nextNum),
    highestUsed: String(maxNum),
    totalRecords: records.length
  };
}

/**
 * Checks if a specific NC Number already exists in history.
 */
export function checkNcNumberExists(ncNum) {
  const target = String(ncNum || '').trim().toLowerCase();
  if (!target) return { exists: false };

  const records = getHistoryRecords();
  const existing = records.find(
    (r) => String(r.ncNumber || '').trim().toLowerCase() === target
  );

  return {
    exists: !!existing,
    record: existing || null
  };
}

/**
 * Registers a new NCR record if unique.
 * Throws or returns error if duplicate.
 */
export function registerNcrRecord(recordData) {
  const target = String(recordData.ncNumber || '').trim();
  if (!target) {
    const err = new Error('NC Number is required');
    err.status = 400;
    throw err;
  }

  const { exists, record: existingRecord } = checkNcNumberExists(target);
  if (exists) {
    const err = new Error(
      `NC Number "${target}" has already been used for Job ${existingRecord.jobNo || 'N/A'} on ${existingRecord.date || 'N/A'}`
    );
    err.status = 409;
    err.code = 'DUPLICATE_NC_NUMBER';
    err.existingRecord = existingRecord;
    const { nextNcNumber } = getNextNcNumber();
    err.nextNcNumber = nextNcNumber;
    throw err;
  }

  const newRecord = {
    ncNumber: target,
    jobNo: String(recordData.jobNo || '').trim(),
    panelName: String(recordData.panelName || '').trim(),
    clientProject: String(recordData.clientProject || '').trim(),
    date: String(recordData.date || '').trim(),
    operatorName: String(recordData.operatorName || '').trim().toUpperCase(),
    quantity: String(recordData.quantity || '1 NOs').trim(),
    department: String(recordData.department || '').trim().toUpperCase(),
    problem: String(recordData.problem || '').trim().toUpperCase(),
    createdAt: new Date().toISOString(),
    fileName: String(recordData.fileName || '').trim()
  };

  const records = getHistoryRecords();
  records.push(newRecord);
  saveHistoryRecords(records);

  const { nextNcNumber } = getNextNcNumber();
  return {
    success: true,
    savedRecord: newRecord,
    nextNcNumber
  };
}
