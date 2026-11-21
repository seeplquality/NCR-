import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const appsScriptUrl = process.env.VITE_APPS_SCRIPT_URL;

  // GET: Return history records
  if (req.method === 'GET') {
    try {
      if (appsScriptUrl) {
        try {
          const response = await fetch(`${appsScriptUrl}?action=logs`, { redirect: 'follow' });
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && Array.isArray(data.logs)) {
              return res.status(200).json(data.logs);
            }
          }
        } catch (scriptErr) {
          console.warn('Apps Script logs fetch failed, using local fallback:', scriptErr.message);
        }
      }

      // Local fallback
      const historyPath = path.resolve(process.cwd(), 'ncr_history.json');
      let records = [];
      if (fs.existsSync(historyPath)) {
        try {
          records = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || [];
        } catch (e) {
          records = [];
        }
      }
      return res.status(200).json([...records].reverse());
    } catch (err) {
      console.error('Error fetching NCR logs:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Register new NCR
  if (req.method === 'POST') {
    try {
      const data = req.body || {};
      const targetNc = String(data.ncNumber || '').trim();

      if (!targetNc) {
        return res.status(400).json({ error: 'NC Number is required' });
      }

      // If Apps Script URL is configured, forward payload
      if (appsScriptUrl) {
        try {
          const scriptRes = await fetch(appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data),
            redirect: 'follow'
          });

          if (scriptRes.ok) {
            const scriptData = await scriptRes.json();
            if (scriptData.status === 'error') {
              return res.status(409).json({
                error: scriptData.error || 'DUPLICATE_NC_NUMBER',
                message: scriptData.message,
                existingRecord: scriptData.existingRecord,
                nextNcNumber: scriptData.nextNcNumber
              });
            }

            return res.status(201).json({
              success: true,
              source: 'apps_script',
              savedRecord: scriptData.savedRecord,
              imageLink: scriptData.imageLink,
              docxLink: scriptData.docxLink,
              pdfLink: scriptData.pdfLink,
              nextNcNumber: scriptData.nextNcNumber
            });
          }
        } catch (scriptErr) {
          console.warn('Apps Script POST failed, falling back to local file:', scriptErr.message);
        }
      }

      // Local fallback to ncr_history.json
      const historyPath = path.resolve(process.cwd(), 'ncr_history.json');
      let records = [];
      if (fs.existsSync(historyPath)) {
        try {
          records = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || [];
        } catch (e) {
          records = [];
        }
      }

      const duplicate = records.find(
        (r) => String(r.ncNumber || '').trim().toLowerCase() === targetNc.toLowerCase()
      );

      if (duplicate) {
        let maxNum = 0;
        for (const r of records) {
          const raw = String(r.ncNumber || '').trim();
          const match = raw.match(/^\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        return res.status(409).json({
          error: 'DUPLICATE_NC_NUMBER',
          message: `NC Number ${targetNc} has already been registered for Job ${duplicate.jobNo} on ${duplicate.date}.`,
          existingRecord: duplicate,
          nextNcNumber: String(maxNum + 1)
        });
      }

      const nowIso = new Date().toISOString();
      const newRecord = {
        ncNumber: targetNc,
        date: data.date || '',
        jobNo: data.jobNo || '',
        clientProject: data.clientProject || '',
        panelName: data.panelName || '',
        quantity: data.quantity || '1 NOs',
        department: data.department || '',
        operatorName: data.operatorName || '',
        problem: data.problem || '',
        fileType: data.fileType || '',
        imageLink: '',
        docxLink: '',
        pdfLink: '',
        createdAt: nowIso
      };

      records.push(newRecord);
      fs.writeFileSync(historyPath, JSON.stringify(records, null, 2), 'utf8');

      let maxNum = 0;
      for (const r of records) {
        const raw = String(r.ncNumber || '').trim();
        const match = raw.match(/^\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }

      return res.status(201).json({
        success: true,
        source: 'local_file',
        savedRecord: newRecord,
        imageLink: '',
        docxLink: '',
        pdfLink: '',
        nextNcNumber: String(maxNum + 1)
      });
    } catch (err) {
      console.error('Error registering NCR:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
