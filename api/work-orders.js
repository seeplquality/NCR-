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
        const response = await fetch(`${appsScriptUrl}?action=work-orders`, { redirect: 'follow' });
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.orders) {
            return res.status(200).json({
              source: 'apps_script',
              count: data.orders.length,
              orders: data.orders
            });
          }
        }
      } catch (scriptErr) {
        console.warn('Apps Script fetch failed in /api/work-orders, using bundled:', scriptErr.message);
      }
    }

    // Fallback to bundled dataset
    const bundledPath = path.resolve(process.cwd(), 'src', 'data', 'defaultOrders.json');
    if (fs.existsSync(bundledPath)) {
      const content = fs.readFileSync(bundledPath, 'utf8');
      const orders = JSON.parse(content);
      return res.status(200).json({
        source: 'bundled_excel',
        count: orders.length,
        orders
      });
    }

    return res.status(200).json({ source: 'empty', count: 0, orders: [] });
  } catch (err) {
    console.error('Error in /api/work-orders:', err);
    return res.status(500).json({ error: err.message });
  }
}
