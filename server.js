import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import workOrdersHandler from './api/work-orders.js';
import nextNcHandler from './api/next-nc.js';
import ncrHandler from './api/ncr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Vercel Serverless Compatible Endpoints
app.get('/api/work-orders', (req, res) => workOrdersHandler(req, res));
app.get('/api/next-nc', (req, res) => nextNcHandler(req, res));
app.get('/api/next-nc-number', (req, res) => nextNcHandler(req, res)); // Alias
app.all('/api/ncr', (req, res) => ncrHandler(req, res));
app.all('/api/ncrs', (req, res) => ncrHandler(req, res)); // Alias

// Serve static frontend assets if built
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NCR Server running on http://localhost:${PORT}`);
});
