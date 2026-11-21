# Saravanan Electricals & Engineering Pvt Ltd - Non-Conformance Report (NCR) System

A production-ready, mobile-friendly Non-Conformance Report (NCR) web application engineered for shop-floor quality inspection. Built with **React + Vite + Tailwind CSS** on the frontend, and backed by **Vercel Serverless Functions** integrated with **Google Sheets** and **Google Drive**.

---

## 🌟 Key Features

1. **Dual Export: Word (`.docx`) & PDF (`.pdf`)**
   - Generates exact **strictly 2-page A4** documents matching company quality standard `SEEPL/QC/02/NCR/R2/26-27`.
   - **Page 1:** Header, NC Details Table, Defect Description, Highlighted Defect Photo, Quality Sign, and Responsible Sign.
   - **Page 2:** Printable shop-floor Root Cause Analysis (RCA), 5-Why Analysis, Corrective & Preventive Action (CAPA), and 3-column Sign-Off table.
   - Uniform file naming: `<NC_NUMBER>. <PROBLEM_TITLE>.docx` and `<NC_NUMBER>. <PROBLEM_TITLE>.pdf`.

2. **Mobile Camera & Gallery Defect Photo Capture**
   - **Take Photo:** Directly opens on-spot device camera (`capture="environment"`).
   - **From Gallery:** Allows selecting existing photos from mobile gallery or PC storage.
   - **Client-Side Compression:** Automatically scales images to max 700px width with 0.8 JPEG quality before uploading, keeping file sizes lightweight (<120 KB) while maintaining crisp detail.
   - **Interactive Canvas Annotation:** Draw red/green circles and freehand markers directly on the defect image to highlight discrepancies.

3. **Installable Progressive Web App (PWA)**
   - **Android / Chrome:** Click the in-app **"Install App on Phone"** button or browser menu to install directly onto the device home screen as a standalone application.
   - **iOS / Safari:** Includes built-in iOS install guide (*Share → Add to Home Screen*), running in borderless full-screen standalone mode with native splash themes.
   - **Auto-Updating Service Worker:** Powered by `vite-plugin-pwa` with automatic cache revalidation for high performance on shop-floor Wi-Fi or mobile data.

4. **Digital Touch & Stylus Signatures**
   - Responsive HTML5 signature pads for **QUALITY SIGN** and **RESPONSIBLE SIGN**.
   - Supports touch gestures, styluses, and mouse input with `touch-action: none` to prevent page scrolling on mobile devices.
   - Embedded seamlessly as transparent PNGs into both the Word table cells and the PDF document.

4. **Cascading Dropdowns with Forward-Fill (`ffill`)**
   - Searchable **Job No (`WO:NO`)** dropdown populated from `WORK ORDER NO FORMAT (2).xlsx` or Google Sheets.
   - **Client / Project** auto-fills automatically based on the selected Job No.
   - **Panel Name** filters dynamically to show only panels belonging to that specific Job No, with custom panel fallback.

5. **Centralized Anti-Duplication & Audit Logging**
   - Every generated NCR is verified server-side against Google Sheets (`NCR_Logs` tab) or `ncr_history.json`.
   - Duplicate NC numbers are blocked at both client and server layers.
   - Auto-fetches next available sequential number (`max(NC_NUMBER) + 1`).
   - Manual override toggle available for specific legacy entries.
   - Defect photos are automatically uploaded to Google Drive with shareable links stored in the Google Sheet.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js v18+ (tested on Node v20/v22/v26)
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Locally
```bash
# Start local development server on port 5000
npm run dev -- --host --port 5000
```
Open [http://localhost:5000](http://localhost:5000) in your browser or on mobile via your local Wi-Fi IP (e.g. `http://192.168.1.X:5000`).

> **Offline / Local Mode:** If Google credentials are not set up, the app seamlessly runs in local offline mode using bundled master work orders and logs generated records to `ncr_history.json`.

---

## ☁️ Google Sheets & Drive Webhook Setup (Zero GCP / No Credentials Required!)

The system uses a lightweight **Google Apps Script Web App webhook** (`google-apps-script.gs`) embedded directly inside your Google Sheet. **No Google Cloud Platform (GCP) project, OAuth consent screen, or service account credentials are required!**

### 1. Copy `google-apps-script.gs` into Your Google Sheet
1. Open your Master Google Sheet containing the `Work_Orders` tab.
2. In the top menu, go to: **Extensions > Apps Script**.
3. Delete any default code in `Code.gs` and copy-paste the entire contents of [`google-apps-script.gs`](google-apps-script.gs).
4. Update the two Google Drive Folder IDs at the top of the script:
   - `IMAGES_FOLDER_ID`: Your Google Drive folder ID for storing defect photos.
   - `REPORTS_FOLDER_ID`: Your Google Drive folder ID for storing generated `.docx` and `.pdf` files.
   *(Folder IDs are found in the Google Drive URL: `drive.google.com/drive/folders/<FOLDER_ID>`)*

### 2. Deploy as a Web App
1. In the Apps Script editor, click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon next to *Select type* and choose **Web app**.
3. Configure the deployment settings:
   - **Description:** `NCR Web App Webhook`
   - **Execute as:** `Me (your email address)`
   - **Who has access:** `Anyone`
4. Click **Deploy**.
5. Grant permissions when prompted by Google (*Advanced > Go to NCR Web App (unsafe) > Allow*).
6. Copy the generated **Web App URL** (starts with `https://script.google.com/macros/s/.../exec`).

### 3. Add URL to Environment Variables
In your local `.env` (or Vercel Environment Variables):
```env
VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/your-apps-script-deployment-id/exec"
```

---

## 🌐 Deploying to Vercel

The application deploys to Vercel with zero extra server configuration:

1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New > Project** and import the repository.
3. In **Settings > Environment Variables**, add only one variable:

| Variable Name | Description | Example Value |
|---|---|---|
| `VITE_APPS_SCRIPT_URL` | Google Apps Script Web App URL | `https://script.google.com/macros/s/.../exec` |

4. Click **Deploy**. Vercel will build the frontend via `vite build` and host the application.

---

## 📁 Repository Structure

```
├── google-apps-script.gs       # Complete Google Apps Script Webhook (Copy into Google Sheets)
├── api/                        # Local fallback serverless endpoints
│   ├── work-orders.js          # Cascading order data
│   ├── next-nc.js              # Next NC number calculation
│   └── ncr.js                  # Register report, upload files & append log
├── src/
│   ├── components/
│   │   ├── JobSearchSelect.jsx # Searchable Job No dropdown
│   │   ├── ImageAnnotator.jsx  # HTML5 canvas circle defect annotator (max 650px, quality 0.75)
│   │   ├── SignaturePad.jsx    # Touch / stylus signature pad
│   │   ├── ReportPreview.jsx   # Live 2-page A4 document previewer
│   │   └── NcrHistoryLog.jsx   # Collapsible audit log table with Drive file links
│   ├── utils/
│   │   ├── docxGenerator.js    # Strict 2-page Word (.docx) generation engine
│   │   ├── pdfGenerator.js     # Strict 2-page A4 PDF (.pdf) generation engine
│   │   └── excelParser.js      # Forward-fill Excel parser for Work Orders
│   ├── data/
│   │   └── defaultOrders.json  # Bundled master work orders fallback
│   ├── App.jsx                 # Main application component
│   └── main.jsx
├── .env.example                # Environment variables template (VITE_APPS_SCRIPT_URL)
├── vercel.json                 # Vercel routing config
└── README.md
```

---

## 🔒 Security & Data Integrity
- **No Test / Dummy Data:** The system starts clean at NC #1 with blank form fields and an empty history table.
- **Strict 2-Page Boundary:** Both Word and PDF generators enforce exact dimensions and spacing so defect photos and signatures never push the report into Page 3.
- **Audit Traceability:** Each report record stores `NC_NUMBER`, `DATE`, `JOB_NO`, `CLIENT_PROJECT`, `PANEL_NAME`, `QUANTITY`, `DEPARTMENT`, `OPERATOR_NAME`, `PROBLEM`, `IMAGE_LINK`, and `CREATED_AT`.
