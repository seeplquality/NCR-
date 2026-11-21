import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import workOrdersHandler from './api/work-orders.js';
import nextNcHandler from './api/next-nc.js';
import ncrHandler from './api/ncr.js';

function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        // Custom helpers for res.status and res.json in Connect middleware
        res.status = function (code) {
          res.statusCode = code;
          return res;
        };
        res.json = function (data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              req.body = JSON.parse(body || '{}');
            } catch (e) {
              req.body = {};
            }

            if (pathname === '/api/ncr' || pathname === '/api/ncrs') {
              return await ncrHandler(req, res);
            }
            next();
          });
          return;
        }

        if (pathname === '/api/work-orders') {
          return await workOrdersHandler(req, res);
        }

        if (pathname === '/api/next-nc' || pathname === '/api/next-nc-number') {
          return await nextNcHandler(req, res);
        }

        if (pathname === '/api/ncr' || pathname === '/api/ncrs') {
          return await ncrHandler(req, res);
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    vercelApiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'default_work_orders.xlsx',
        'template.docx'
      ],
      manifest: {
        name: 'SEEPL NCR Generator',
        short_name: 'SEEPL NCR',
        description: 'Non-Conformance Report Generator',
        theme_color: '#1e3a8a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,xlsx,docx}']
      }
    })
  ],
  server: {
    port: 5000,
    host: true
  }
});
