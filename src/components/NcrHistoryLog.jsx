import React, { useState } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  FileCheck,
  Calendar,
  AlertCircle,
  Building,
  User,
  Hash
} from 'lucide-react';

export default function NcrHistoryLog({ records = [], isLoading, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.ncNumber && String(r.ncNumber).toLowerCase().includes(q)) ||
      (r.jobNo && r.jobNo.toLowerCase().includes(q)) ||
      (r.panelName && r.panelName.toLowerCase().includes(q)) ||
      (r.clientProject && r.clientProject.toLowerCase().includes(q)) ||
      (r.operatorName && r.operatorName.toLowerCase().includes(q)) ||
      (r.problem && r.problem.toLowerCase().includes(q)) ||
      (r.date && r.date.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer select-none transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Generated NCR History Log
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                {records.length} {records.length === 1 ? 'Report' : 'Reports'} Issued
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Persistent tracking ensures NC numbers are globally unique and never duplicated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onRefresh) onRefresh();
            }}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1 transition-all"
            title="Refresh History"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <span className="text-slate-400 p-1">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Search Box */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by NC #, Job No, Panel, Client, Problem..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="text-[11px] text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {records.length} records
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">NC #</th>
                  <th className="py-2.5 px-3">Job No (`WO:NO`)</th>
                  <th className="py-2.5 px-3">Panel Name</th>
                  <th className="py-2.5 px-3">Client / Project</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Defect Problem</th>
                  <th className="py-2.5 px-3">Drive Files</th>
                  <th className="py-2.5 px-3">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((item, idx) => (
                    <tr
                      key={item.ncNumber + '-' + idx}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
                          <Hash className="w-3 h-3 text-blue-500" />
                          {item.ncNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {item.jobNo || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {item.panelName || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate" title={item.clientProject}>
                        {item.clientProject || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono whitespace-nowrap">
                        {item.date || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap uppercase">
                        {item.operatorName || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[240px] truncate" title={item.problem}>
                        {item.problem || '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.docxLink ? (
                            <a
                              href={item.docxLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                              title="Open DOCX in Google Drive"
                            >
                              DOCX
                            </a>
                          ) : null}
                          {item.pdfLink ? (
                            <a
                              href={item.pdfLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                              title="Open PDF in Google Drive"
                            >
                              PDF
                            </a>
                          ) : null}
                          {item.imageLink ? (
                            <a
                              href={item.imageLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                              title="Open Photo in Google Drive"
                            >
                              IMG
                            </a>
                          ) : null}
                          {!item.docxLink && !item.pdfLink && !item.imageLink ? (
                            <span className="text-slate-400 text-[10px]">Local</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      {records.length === 0
                        ? 'No NCRs generated yet. The first issued report will be recorded here automatically.'
                        : `No matching NCR records found for "${searchQuery}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
