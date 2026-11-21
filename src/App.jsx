import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Calendar,
  User,
  Hash,
  Briefcase,
  Layers,
  Building,
  AlertTriangle,
  Camera,
  RefreshCw,
  CheckCircle,
  FileSpreadsheet,
  Plus,
  Eye,
  Sliders,
  Sparkles,
  Lock,
  Unlock,
  AlertOctagon,
  ArrowRight,
  PenLine,
  Image as ImageIcon,
  Cloud,
  HardDrive,
  ExternalLink
} from 'lucide-react';

import defaultOrdersData from './data/defaultOrders.json';
import { parseWorkOrderExcel } from './utils/excelParser';
import { generateNcrDocx } from './utils/docxGenerator';
import { generateNcrPdf } from './utils/pdfGenerator';
import JobSearchSelect from './components/JobSearchSelect';
import ImageAnnotator from './components/ImageAnnotator';
import ReportPreview from './components/ReportPreview';
import NcrHistoryLog from './components/NcrHistoryLog';
import SignaturePad from './components/SignaturePad';

const STANDARD_DEPARTMENTS = [
  'FABRICATION',
  'POWDER COATING',
  'BUSBAR',
  'WIRING',
  'TESTING',
  'STORE',
  'PACKING'
];

const COMMON_PROBLEMS = [
  'TOP TRAY DOOR LOCKING CLAMPS WELDED IN REVERSE DIRECTION',
  'BUSBAR PHASE-TO-PHASE CLEARANCE LESS THAN 25MM',
  'POWDER COATING PEELING AND SCRATCHES ON FRONT DOOR',
  'DOOR GASKET DAMAGED & IMPROPERLY ALIGNED',
  'EARTHING CONDUCTOR DISCONNECTED FROM ENCLOSURE DOOR',
  'CUTOUT DIMENSIONS MISMATCHED WITH DRAWING REVISION'
];

export default function App() {
  // Master Work Orders State
  const [orders, setOrders] = useState(defaultOrdersData);
  const [excelFileName, setExcelFileName] = useState('WORK ORDER NO FORMAT (2).xlsx');
  const [isExcelUploading, setIsExcelUploading] = useState(false);
  const excelInputRef = useRef(null);

  // Centralized NCR History & NC Number State
  const [historyRecords, setHistoryRecords] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [nextSuggestedNc, setNextSuggestedNc] = useState('1');
  const [ncNumber, setNcNumber] = useState('1');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Form Field State (Clean Production Defaults)
  const [jobNo, setJobNo] = useState('');
  const [clientProject, setClientProject] = useState('');
  const [panelName, setPanelName] = useState('');
  const [isCustomPanel, setIsCustomPanel] = useState(false);
  const [customPanelName, setCustomPanelName] = useState('');

  // Today's date in YYYY-MM-DD for input
  const [rawDate, setRawDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [operatorName, setOperatorName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [department, setDepartment] = useState('FABRICATION');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDept, setCustomDept] = useState('');

  const [problem, setProblem] = useState('');

  // Image state (starts completely blank)
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [exportedImage, setExportedImage] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Digital Signatures state (Quality Sign & Responsible Sign)
  const [qualitySign, setQualitySign] = useState(null);
  const [responsibleSign, setResponsibleSign] = useState(null);

  // App UI & Cloud state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState(null); // 'docx' or 'pdf'
  const [successToast, setSuccessToast] = useState(null);
  const [lastIssuedRecord, setLastIssuedRecord] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split' or 'form' or 'preview'
  const [cloudStatus, setCloudStatus] = useState({ isConnected: false, source: 'local' });

  // Format date as DD.MM.YYYY for display and document
  const formattedDate = (() => {
    if (!rawDate) return '';
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return rawDate;
  })();

  const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

  // 1. Fetch Master Work Orders, Next NC Number & History Records
  const fetchInitialData = async () => {
    setIsHistoryLoading(true);

    // A. Direct Google Apps Script Web App Webhook (No GCP credentials needed)
    if (APPS_SCRIPT_URL) {
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=init`, {
          method: 'GET',
          redirect: 'follow'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            if (Array.isArray(data.orders) && data.orders.length > 0) {
              setOrders(data.orders);
            }
            if (data.nextNcNumber) {
              setNextSuggestedNc(data.nextNcNumber);
              if (!isManualOverride) {
                setNcNumber(data.nextNcNumber);
              }
            }
            if (Array.isArray(data.logs)) {
              setHistoryRecords(data.logs);
            }
            setCloudStatus({ isConnected: true, source: 'apps_script' });
            setIsHistoryLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Google Apps Script fetch error, falling back to local API:', err);
      }
    }

    // B. Local API / Bundled dataset Fallback
    try {
      const [ordersRes, nextRes, listRes] = await Promise.all([
        fetch('/api/work-orders'),
        fetch('/api/next-nc'),
        fetch('/api/ncr')
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        const loadedOrders = oData.orders || (Array.isArray(oData) ? oData : null);
        if (loadedOrders && loadedOrders.length > 0) {
          setOrders(loadedOrders);
          if (oData.source === 'apps_script') {
            setCloudStatus({ isConnected: true, source: 'apps_script' });
          }
        }
      }

      if (nextRes.ok) {
        const nextData = await nextRes.json();
        setNextSuggestedNc(nextData.nextNcNumber || '1');
        if (!isManualOverride) {
          setNcNumber(nextData.nextNcNumber || '1');
        }
        if (nextData.source === 'apps_script') {
          setCloudStatus({ isConnected: true, source: 'apps_script' });
        }
      }

      if (listRes.ok) {
        const listData = await listRes.json();
        setHistoryRecords(Array.isArray(listData) ? listData : []);
      }
    } catch (err) {
      console.warn('API fallback error:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // 3. Real-time duplicate check whenever ncNumber changes
  useEffect(() => {
    const target = String(ncNumber || '').trim().toLowerCase();
    if (!target) {
      setDuplicateWarning(null);
      return;
    }

    const existing = historyRecords.find(
      (r) => String(r.ncNumber || '').trim().toLowerCase() === target
    );

    if (existing) {
      setDuplicateWarning({
        ncNumber: target,
        jobNo: existing.jobNo,
        date: existing.date,
        panelName: existing.panelName,
        problem: existing.problem
      });
    } else {
      setDuplicateWarning(null);
    }
  }, [ncNumber, historyRecords]);

  // Cascading Logic: When Job No changes
  const handleSelectJobNo = (selectedWo) => {
    setJobNo(selectedWo);
    const order = orders.find((o) => o.wo === selectedWo);
    if (order) {
      setClientProject(order.project || '');
      if (order.panels && order.panels.length > 0) {
        setPanelName(order.panels[0]);
        setIsCustomPanel(false);
        setCustomPanelName('');
      } else {
        setPanelName('');
        setIsCustomPanel(true);
      }
    } else {
      setClientProject('');
      setPanelName('');
    }
  };

  // Get available panels for current Job No
  const currentOrder = orders.find((o) => o.wo === jobNo);
  const availablePanels = currentOrder ? currentOrder.panels || [] : [];

  // Handle Excel Upload
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExcelUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkOrderExcel(buffer);
      if (parsed.length > 0) {
        setOrders(parsed);
        setExcelFileName(file.name);
        setSuccessToast(`Successfully loaded ${parsed.length} Work Orders from ${file.name}`);
        if (!parsed.some((o) => o.wo === jobNo)) {
          handleSelectJobNo(parsed[0].wo);
        }
      } else {
        alert('Could not parse any work orders from the uploaded file.');
      }
    } catch (err) {
      console.error(err);
      alert('Error reading Excel file: ' + err.message);
    } finally {
      setIsExcelUploading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Reset to Bundled Excel
  const handleResetExcel = () => {
    setOrders(defaultOrdersData);
    setExcelFileName('WORK ORDER NO FORMAT (2).xlsx');
    setSuccessToast('Reset to default master work orders (142 orders loaded).');
  };

  // Image Upload / Camera Capture Handler with Client-Side Compression (Max 650px, Quality 0.75)
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress / resize to max 650px maintaining aspect ratio
        const MAX_DIM = 650;
        let w = img.width;
        let h = img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setRawImageSrc(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // Clear file inputs so same file can be re-selected if desired
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // Switch to next available NC number button
  const handleUseNextAvailable = () => {
    setNcNumber(nextSuggestedNc);
    setIsManualOverride(false);
    setDuplicateWarning(null);
  };

  // Single-Format Export Handler: Word (.docx) or PDF (.pdf) with Automatic Google Drive & Sheets Archiving
  const handleGenerateReport = async (format = 'pdf') => {
    if (!ncNumber.trim()) {
      alert('Please specify an NC Number.');
      return;
    }
    if (!jobNo.trim()) {
      alert('Please select a Job No (WO:NO).');
      return;
    }
    const finalPanelName = isCustomPanel ? customPanelName.trim() : panelName;
    if (!finalPanelName) {
      alert('Please select or enter a Panel Name.');
      return;
    }
    if (!operatorName.trim()) {
      alert('Please enter Operator Name.');
      return;
    }
    if (!problem.trim()) {
      alert('Please describe the Problem/Defect.');
      return;
    }

    if (duplicateWarning) {
      alert(
        `Cannot generate report: NC Number ${ncNumber} has already been used for Job ${duplicateWarning.jobNo} on ${duplicateWarning.date}. Please use the next available number.`
      );
      return;
    }

    setIsGenerating(true);
    setGeneratingFormat(format);

    try {
      const finalDepartment = isCustomDept ? customDept.trim().toUpperCase() : department;

      const cleanProblem = problem
        .trim()
        .toUpperCase()
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .substring(0, 45)
        .trim();

      const docxFileName = `${ncNumber.trim()}. ${cleanProblem || 'NCR ISSUE'}.docx`;
      const pdfFileName = `${ncNumber.trim()}. ${cleanProblem || 'NCR ISSUE'}.pdf`;

      const finalImageBase64 = exportedImage ? exportedImage.dataUrl : rawImageSrc;

      // 1. PREPARE REPORT DATA
      const docData = {
        ncNumber: ncNumber.trim(),
        panelName: finalPanelName || 'PANEL',
        jobNo: jobNo.trim() || 'SEEPL',
        clientProject: clientProject.trim() || 'CLIENT',
        date: formattedDate || '20.11.2026',
        operatorName: operatorName.trim().toUpperCase() || 'OPERATOR',
        quantity: `${quantity || 1} NOs`,
        department: finalDepartment || 'FABRICATION',
        problem: problem.trim().toUpperCase(),
        imageBuffer: finalImageBase64,
        imageWidth: exportedImage ? exportedImage.width : 600,
        imageHeight: exportedImage ? exportedImage.height : 318,
        qualitySign: qualitySign || null,
        responsibleSign: responsibleSign || null
      };

      // Helper to convert blob to base64
      const blobToBase64 = (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

      // 2. GENERATE ONLY THE REQUESTED FILE FORMAT IN BROWSER
      let docxBlob = null;
      let pdfDoc = null;
      let docxBase64 = null;
      let pdfBase64 = null;

      if (format === 'docx') {
        docxBlob = await generateNcrDocx(docData);
        docxBase64 = await blobToBase64(docxBlob);
      } else {
        pdfDoc = generateNcrPdf(docData);
        const pdfBlob = pdfDoc.output('blob');
        pdfBase64 = await blobToBase64(pdfBlob);
      }

      // 3. SEND TO SERVER: VERIFY DUPLICATE, UPLOAD CHOSEN FILE TO DRIVE & LOG TO GOOGLE SHEETS
      const payload = {
        ncNumber: ncNumber.trim(),
        jobNo: jobNo.trim() || 'SEEPL',
        panelName: finalPanelName || 'PANEL',
        clientProject: clientProject.trim() || 'CLIENT',
        date: formattedDate || '20.11.2026',
        operatorName: operatorName.trim().toUpperCase() || 'OPERATOR',
        quantity: `${quantity || 1} NOs`,
        department: finalDepartment || 'FABRICATION',
        problem: problem.trim().toUpperCase(),
        imageBase64: finalImageBase64 || null,
        fileType: format,
        docxBase64: format === 'docx' ? docxBase64 : null,
        pdfBase64: format === 'pdf' ? pdfBase64 : null,
        docxFileName: format === 'docx' ? docxFileName : null,
        pdfFileName: format === 'pdf' ? pdfFileName : null
      };

      let registerData = null;

      if (APPS_SCRIPT_URL) {
        // Direct Google Apps Script Web App Webhook POST
        // Note: Using 'text/plain;charset=utf-8' prevents CORS preflight OPTIONS blocking
        const scriptRes = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });

        if (!scriptRes.ok) {
          throw new Error(`Google Apps Script returned HTTP status ${scriptRes.status}`);
        }

        const scriptData = await scriptRes.json();

        if (scriptData.status === 'error') {
          if (
            scriptData.error === 'DUPLICATE_NC_NUMBER' ||
            (scriptData.message && scriptData.message.includes('already exists'))
          ) {
            setDuplicateWarning({
              ncNumber: ncNumber.trim(),
              jobNo: scriptData.existingRecord?.jobNo || 'Unknown',
              date: scriptData.existingRecord?.date || 'Unknown'
            });
            if (scriptData.nextNcNumber) {
              setNextSuggestedNc(scriptData.nextNcNumber);
            }
            alert(
              `Generation Blocked: NC Number ${ncNumber.trim()} has already been used!\n\n${scriptData.message}\n\nPlease click "Use Next Available Number" to continue.`
            );
            setIsGenerating(false);
            setGeneratingFormat(null);
            return;
          }
          throw new Error(scriptData.message || 'Apps Script registration failed');
        }

        registerData = {
          success: true,
          source: 'apps_script',
          imageLink: scriptData.imageLink,
          docxLink: scriptData.docxLink,
          pdfLink: scriptData.pdfLink,
          nextNcNumber: scriptData.nextNcNumber
        };
      } else {
        // Local API fallback
        const registerRes = await fetch('/api/ncr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!registerRes.ok) {
          const errorData = await registerRes.json();
          if (registerRes.status === 409 || errorData.error === 'DUPLICATE_NC_NUMBER') {
            setDuplicateWarning({
              ncNumber: ncNumber.trim(),
              jobNo: errorData.existingRecord?.jobNo || 'Unknown',
              date: errorData.existingRecord?.date || 'Unknown'
            });
            if (errorData.nextNcNumber) {
              setNextSuggestedNc(errorData.nextNcNumber);
            }
            alert(
              `Generation Blocked: NC Number ${ncNumber.trim()} has already been used!\n\nDetails: Job ${errorData.existingRecord?.jobNo} on ${errorData.existingRecord?.date}.\n\nPlease click "Use Next Available Number" to continue.`
            );
            setIsGenerating(false);
            setGeneratingFormat(null);
            return;
          }
          throw new Error(errorData.message || errorData.error || 'Registration failed');
        }

        registerData = await registerRes.json();
      }

      // 4. TRIGGER LOCAL DOWNLOAD AS REQUESTED BY USER
      if (format === 'docx' && docxBlob) {
        const docxUrl = URL.createObjectURL(docxBlob);
        const docxLink = document.createElement('a');
        docxLink.href = docxUrl;
        docxLink.download = docxFileName;
        document.body.appendChild(docxLink);
        docxLink.click();
        document.body.removeChild(docxLink);
        URL.revokeObjectURL(docxUrl);
      } else if (format === 'pdf' && pdfDoc) {
        pdfDoc.save(pdfFileName);
      }

      // 5. UPDATE RECORD CONFIRMATION BADGE STATE
      setLastIssuedRecord({
        ncNumber: docData.ncNumber,
        jobNo: docData.jobNo,
        fileType: format,
        fileName: format === 'docx' ? docxFileName : pdfFileName,
        docxFileName: format === 'docx' ? docxFileName : null,
        pdfFileName: format === 'pdf' ? pdfFileName : null,
        imageLink: registerData.imageLink,
        docxLink: registerData.docxLink,
        pdfLink: registerData.pdfLink,
        source: registerData.source
      });

      // 6. ADVANCE TO NEXT NC NUMBER & REFRESH HISTORY
      if (registerData.nextNcNumber) {
        setNextSuggestedNc(registerData.nextNcNumber);
        setNcNumber(registerData.nextNcNumber);
      }
      setIsManualOverride(false);
      setDuplicateWarning(null);

      // Refresh records list
      fetchInitialData();

      const formatLabel = format === 'docx' ? 'Word (.docx)' : 'PDF (.pdf)';
      const driveNote = (registerData.docxLink || registerData.pdfLink)
        ? ` ${formatLabel} archived in Google Drive.`
        : '';
      const sheetsNote = registerData.source === 'google_sheets'
        ? ' Recorded in Google Sheets.'
        : ' Logged locally.';
      setSuccessToast(`Saved to Google Drive & Google Sheets! NC #${docData.ncNumber} (${formatLabel}) issued successfully.${sheetsNote}${driveNote}`);
    } catch (err) {
      console.error(err);
      alert('Error generating document: ' + err.message);
    } finally {
      setIsGenerating(false);
      setGeneratingFormat(null);
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-lg">
              SE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  SARAVANAN ELECTRICALS &amp; ENGINEERING
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 uppercase tracking-wider">
                  NCR 2.2
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Non-Conformance Report System • Digital Mobile Signatures &amp; Audit Traceability
              </p>
            </div>
          </div>

          {/* Master Excel Upload & Status Controls */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={excelInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              disabled={isExcelUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold transition-all shadow-sm"
              title="Upload an updated Work Order Excel sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isExcelUploading ? 'Loading...' : 'Update Excel'}</span>
            </button>

            {excelFileName !== 'WORK ORDER NO FORMAT (2).xlsx' && (
              <button
                type="button"
                onClick={handleResetExcel}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs"
                title="Reset to default Excel"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Cloud & Local Persistence Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                cloudStatus.isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={
                cloudStatus.isConnected
                  ? 'Connected to Google Sheets & Google Drive'
                  : 'Running in Local Offline mode with ncr_history.json'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  cloudStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              ></span>
              <span>{cloudStatus.isConnected ? 'Apps Script Synced' : 'Local Storage Mode'}</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="font-mono font-medium">{orders.length}</span>
              <span className="text-slate-500">orders</span>
            </div>

            {/* View Mode Toggle (Mobile / Desktop) */}
            <div className="flex lg:hidden bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === 'form' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
                }`}
              >
                Form
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === 'preview' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Status Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs sm:text-sm animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-white/80 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Google Drive & Google Sheets Archiving Confirmation Badge */}
        {lastIssuedRecord && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950 text-sm">
                      Saved to Google Drive &amp; Google Sheets
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 rounded font-mono text-[11px] font-bold">
                      NC #{lastIssuedRecord.ncNumber}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Job <strong>{lastIssuedRecord.jobNo}</strong> logged to Google Sheets <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-emerald-900">NCR_Logs</code> with {lastIssuedRecord.fileType === 'pdf' ? 'PDF report' : 'Word report'} archived to Drive.
                  </p>
                </div>
              </div>

              {/* Action buttons to view files in Google Drive */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {lastIssuedRecord.docxLink && (
                  <a
                    href={lastIssuedRecord.docxLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>View DOCX</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
                {lastIssuedRecord.pdfLink && (
                  <a
                    href={lastIssuedRecord.pdfLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-rose-600" />
                    <span>View PDF</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
                {lastIssuedRecord.imageLink && (
                  <a
                    href={lastIssuedRecord.imageLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Defect Photo</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setLastIssuedRecord(null)}
                  className="p-1.5 text-emerald-700 hover:text-emerald-900 text-xs ml-auto sm:ml-0"
                  title="Dismiss confirmation"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Duplicate Warning Banner */}
        {duplicateWarning && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-rose-900 text-sm">
                    Duplicate NC Number Detected: #{duplicateWarning.ncNumber}
                  </div>
                  <p className="text-xs text-rose-700 mt-0.5">
                    NC #{duplicateWarning.ncNumber} has already been registered for Job{' '}
                    <strong className="underline">{duplicateWarning.jobNo}</strong> on{' '}
                    <strong>{duplicateWarning.date}</strong>. Generating this document is blocked to prevent duplicate records.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseNextAvailable}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                <span>Use Next Available (#{nextSuggestedNc})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Data Entry Form (Page 1 Fields) */}
          <div
            className={`lg:col-span-7 space-y-6 ${
              viewMode === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>Page 1: Non-Conformance Details</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Complete the defect details and mobile touch signatures below.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">
                    A4 strictly 2 Pages
                  </span>
                </div>
              </div>

              {/* ROW 1: NC Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* NC NUMBER WITH DUPLICATE PREVENTION & MANUAL OVERRIDE */}
                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      NC Number <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (isManualOverride) {
                          setNcNumber(nextSuggestedNc);
                          setIsManualOverride(false);
                        } else {
                          setIsManualOverride(true);
                        }
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      title={isManualOverride ? 'Revert to Auto Next Number' : 'Enable custom number entry'}
                    >
                      {isManualOverride ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span className="text-amber-700">Revert Auto</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" />
                          <span>Manual Override</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-slate-400 font-mono text-xs font-bold">
                      #
                    </div>
                    <input
                      type="text"
                      value={ncNumber}
                      readOnly={!isManualOverride}
                      onChange={(e) => setNcNumber(e.target.value)}
                      placeholder="e.g. 2"
                      className={`w-full pl-8 pr-10 py-2 rounded-lg text-sm font-bold transition-all ${
                        duplicateWarning
                          ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-100'
                          : isManualOverride
                          ? 'bg-amber-50/60 border-2 border-amber-400 text-amber-900 ring-2 ring-amber-100 focus:bg-white'
                          : 'bg-slate-100 border border-slate-300 text-blue-900 cursor-not-allowed select-none'
                      }`}
                    />
                    <div className="absolute right-3">
                      {isManualOverride ? (
                        <Unlock className="w-4 h-4 text-amber-500" title="Manual override active" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-400" title="Auto-assigned sequentially" />
                      )}
                    </div>
                  </div>

                  {/* Status explanation pill */}
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    {!isManualOverride ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Auto-assigned next number
                      </span>
                    ) : duplicateWarning ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3 text-rose-600" />
                        Number already taken!
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        Manual override active
                      </span>
                    )}

                    <span className="text-slate-400">
                      Next auto: <strong className="text-slate-600 font-mono">#{nextSuggestedNc}</strong>
                    </span>
                  </div>
                </div>

                {/* DATE */}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Date (DD.MM.YYYY) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={rawDate}
                      onChange={(e) => setRawDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Exports formatted as: <span className="font-mono font-bold text-slate-700">{formattedDate}</span>
                  </span>
                </div>
              </div>

              {/* ROW 2: Cascading Job No (WO:NO) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Job No (`WO:NO`) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">
                    Searchable from Master Excel
                  </span>
                </div>
                <JobSearchSelect
                  orders={orders}
                  selectedJobNo={jobNo}
                  onSelectJobNo={handleSelectJobNo}
                />
              </div>

              {/* ROW 3: Client / Project (Auto-filled & Editable) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Client / Project <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={clientProject}
                    onChange={(e) => setClientProject(e.target.value)}
                    placeholder="Auto-fills from selected Job No (e.g. M/s. TSMT GUJARAT)"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Auto-populated from Excel `PROJECT` column (editable if needed)
                </span>
              </div>

              {/* ROW 4: Panel Name (Filtered from Job No with custom fallback) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Panel Name <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPanel(!isCustomPanel);
                      if (!isCustomPanel) setCustomPanelName('');
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    {isCustomPanel ? '← Select from Order Panels' : '+ Custom Panel Fallback'}
                  </button>
                </div>

                {!isCustomPanel ? (
                  <div className="relative">
                    <select
                      value={panelName}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomPanel(true);
                          setCustomPanelName('');
                        } else {
                          setPanelName(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    >
                      {availablePanels.length > 0 ? (
                        <>
                          {availablePanels.map((p, idx) => (
                            <option key={idx} value={p}>
                              {p}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom Panel Name...</option>
                        </>
                      ) : (
                        <option value="">(No panel listed for this Job No - enter custom)</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customPanelName}
                    onChange={(e) => setCustomPanelName(e.target.value)}
                    placeholder="Type custom panel name (e.g. 2MDF-1 PANEL)"
                    className="w-full px-3.5 py-2 bg-white border border-blue-400 ring-2 ring-blue-50 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition-all"
                    autoFocus
                  />
                )}
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {availablePanels.length > 0 && !isCustomPanel
                    ? `${availablePanels.length} panels listed under Job No "${jobNo}"`
                    : 'Custom panel name fallback enabled'}
                </span>
              </div>

              {/* ROW 5: Operator Name, Quantity, Department */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Operator Name */}
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Operator Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value.toUpperCase())}
                      placeholder=""
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all uppercase"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Auto-uppercase
                  </span>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Exports: <span className="font-mono font-bold">{quantity || 1} NOs</span>
                  </span>
                </div>

                {/* Department */}
                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Department
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomDept(!isCustomDept)}
                      className="text-[10px] text-blue-600 font-semibold"
                    >
                      {isCustomDept ? 'List' : '+ Other'}
                    </button>
                  </div>
                  {!isCustomDept ? (
                    <select
                      value={department}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomDept(true);
                          setCustomDept('');
                        } else {
                          setDepartment(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all uppercase"
                    >
                      {STANDARD_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                      <option value="__custom__">+ Other Department...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customDept}
                      onChange={(e) => setCustomDept(e.target.value.toUpperCase())}
                      placeholder="CUSTOM DEPT"
                      className="w-full px-3 py-2 bg-white border border-blue-400 rounded-lg text-xs font-bold text-slate-800 uppercase focus:outline-none"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* ROW 6: Problem Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Problem / Defect Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value.toUpperCase())}
                  placeholder="Describe the defect clearly (e.g. TOP TRAY DOOR LOCKING CLAMPS WELDED IN REVERSE DIRECTION)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-rose-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all uppercase"
                ></textarea>

                {/* Quick Chips for fast selection */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Quick suggestions:</span>
                  {COMMON_PROBLEMS.slice(0, 3).map((prob, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProblem(prob)}
                      className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 transition-colors truncate max-w-[280px]"
                      title={prob}
                    >
                      {prob}
                    </button>
                  ))}
                </div>
              </div>

              {/* ROW 7: Defect Image Upload & Interactive Canvas Annotation */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Defect Image &amp; Circle Highlight Annotator
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Upload or snap photo. Draw red/green circles on the canvas below to highlight the defect before export.
                    </p>
                  </div>

                  {/* Image Source Buttons: Camera & Gallery */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* On-Spot Device Camera */}
                    <input
                      type="file"
                      ref={cameraInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />
                    {/* Choose from Gallery / Storage */}
                    <input
                      type="file"
                      ref={galleryInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
                      title="Take on-spot photo using phone / tablet camera"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>{rawImageSrc ? 'Retake Photo' : 'Take Photo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
                      title="Choose existing photo from device gallery or storage"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>From Gallery</span>
                    </button>

                    {rawImageSrc && (
                      <button
                        type="button"
                        onClick={() => {
                          setRawImageSrc(null);
                          setExportedImage(null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all"
                        title="Remove uploaded photo"
                      >
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Canvas Annotator */}
                <ImageAnnotator
                  imageSrc={rawImageSrc}
                  onImageExport={(exported) => setExportedImage(exported)}
                />
              </div>

              {/* ROW 8: Interactive Mobile Touch Signatures (QUALITY SIGN & RESPONSIBLE SIGN) */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <PenLine className="w-4 h-4 text-blue-600" />
                    <span>Digital Shop-Floor Signatures (Page 1)</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Sign directly using touch-screen, stylus, or mouse. Signatures are automatically embedded into the Word report table and PDF.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SignaturePad
                    label="Quality Sign"
                    signatoryTitle="Quality Inspector"
                    onSignatureChange={(dataUrl) => setQualitySign(dataUrl)}
                  />

                  <SignaturePad
                    label="Responsible Sign"
                    signatoryTitle="Production / Fab Supervisor"
                    onSignatureChange={(dataUrl) => setResponsibleSign(dataUrl)}
                  />
                </div>
              </div>

              {/* ACTION BUTTONS: DOWNLOAD PDF & DOWNLOAD WORD (.docx) */}
              <div className="pt-2 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Download PDF Action Button */}
                  <button
                    type="button"
                    onClick={() => handleGenerateReport('pdf')}
                    disabled={isGenerating || !!duplicateWarning}
                    className={`py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all transform active:scale-[0.99] ${
                      duplicateWarning
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : isGenerating && generatingFormat === 'pdf'
                        ? 'bg-rose-700 text-white shadow-rose-500/20'
                        : 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 hover:from-rose-700 hover:to-red-800 text-white shadow-rose-500/25'
                    }`}
                  >
                    <Download className={`w-5 h-5 ${isGenerating && generatingFormat === 'pdf' ? 'animate-bounce' : ''}`} />
                    <span>
                      {isGenerating && generatingFormat === 'pdf'
                        ? 'Generating & Archiving PDF...'
                        : duplicateWarning
                        ? `Blocked: NC #${ncNumber}`
                        : 'Download PDF'}
                    </span>
                  </button>

                  {/* Download Word (.docx) Action Button */}
                  <button
                    type="button"
                    onClick={() => handleGenerateReport('docx')}
                    disabled={isGenerating || !!duplicateWarning}
                    className={`py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all transform active:scale-[0.99] ${
                      duplicateWarning
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : isGenerating && generatingFormat === 'docx'
                        ? 'bg-blue-700 text-white shadow-blue-500/20'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-500/25'
                    }`}
                  >
                    <FileText className={`w-5 h-5 ${isGenerating && generatingFormat === 'docx' ? 'animate-pulse' : ''}`} />
                    <span>
                      {isGenerating && generatingFormat === 'docx'
                        ? 'Generating & Archiving Word...'
                        : duplicateWarning
                        ? `Blocked: NC #${ncNumber}`
                        : 'Download Word (.docx)'}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 px-1 gap-2">
                  <span>File: <strong className="font-mono text-slate-700">#{ncNumber}. {problem.substring(0, 25) || 'NCR'}...</strong></span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Strict 2-Page A4 Layout Guaranteed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Document Preview (Both Page 1 & Page 2) */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              viewMode === 'form' ? 'hidden lg:block' : 'block'
            }`}
          >
            <ReportPreview
              formData={{
                ncNumber,
                jobNo,
                clientProject,
                panelName: isCustomPanel ? customPanelName : panelName,
                date: formattedDate,
                operatorName,
                quantity,
                department: isCustomDept ? customDept : department,
                problem,
                qualitySign,
                responsibleSign
              }}
              annotatedImage={exportedImage ? exportedImage.dataUrl : rawImageSrc}
            />

            {/* Quality & Traceability Card */}
            <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-200 text-xs text-indigo-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Cloud Traceability &amp; Mobile Ready</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-indigo-900/90 text-[11px]">
                <li>
                  <strong>Mobile Camera &amp; Gallery:</strong> Capture live on-spot defect photos or pick from phone gallery with auto-compression (700px, 0.8 JPEG).
                </li>
                <li>
                  <strong>Dual Export:</strong> Instant Word (<code className="bg-white/80 px-1 py-0.5 rounded font-mono">.docx</code>) and PDF (<code className="bg-white/80 px-1 py-0.5 rounded font-mono">.pdf</code>) adhering strictly to the 2-page A4 shop-floor format.
                </li>
                <li>
                  <strong>Google Sheets &amp; Drive:</strong> Auto-logged to Google Sheet tab <code className="bg-white/80 px-1 py-0.5 rounded font-mono">NCR_Logs</code> with photos archived directly to Google Drive.
                </li>
                <li>
                  <strong>Touch Signatures:</strong> Digital touch/stylus sign with smooth dark strokes for Quality &amp; Responsible sign-off.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* BOTTOM: Centralized NCR History Log Table */}
        <div className="pt-2">
          <NcrHistoryLog
            records={historyRecords}
            isLoading={isHistoryLoading}
            onRefresh={fetchInitialData}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          Saravanan Electricals &amp; Engineering Pvt Ltd • Non-Conformance Report (NCR) System • Built with React, Vite &amp; Tailwind CSS
        </p>
      </footer>
    </div>
  );
}
