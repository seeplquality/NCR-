import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const appsScriptUrl = process.env.VITE_APPS_SCRIPT_URL;

    if (appsScriptUrl) {
      try {
        const response = await fetch(`${appsScriptUrl}?action=next-nc`, { redirect: 'follow' });
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            return res.status(200).json({
              source: 'apps_script',
              nextNcNumber: String(data.nextNcNumber || '1'),
              highestUsed: String(data.highestUsed || '0'),
              totalRecords: data.totalRecords || 0
            });
          }
        }
      } catch (scriptErr) {
        console.warn('Apps Script fetch failed in /api/next-nc, using local fallback:', scriptErr.message);
      }
    }

    // Local fallback using ncr_history.json
    const historyPath = path.resolve(process.cwd(), 'ncr_history.json');
    let records = [];
    if (fs.existsSync(historyPath)) {
      try {
        records = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || [];
      } catch (e) {
        records = [];
      }
    }

    let maxNum = 0;
    for (const r of records) {
      const raw = String(r.ncNumber || '').trim();
      const match = raw.match(/^\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    return res.status(200).json({
      source: 'local_file',
      nextNcNumber: String(nextNum),
      highestUsed: String(maxNum),
      totalRecords: records.length
    });
  } catch (err) {
    console.error('Error in /api/next-nc:', err);
    return res.status(500).json({ error: err.message });
  }
}
