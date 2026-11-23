import React, { useState } from 'react';
import { Eye } from 'lucide-react';

export default function ReportPreview({ formData, annotatedImage }) {
  const [activePage, setActivePage] = useState(1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">
            Live 2-Page Document Preview
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActivePage(1)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activePage === 1
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page 1 (Report Data)
          </button>
          <button
            type="button"
            onClick={() => setActivePage(2)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activePage === 2
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page 2 (Shop-Floor RCA)
          </button>
        </div>
      </div>

      {/* Simulated Document Sheet (A4 Proportion) */}
      <div className="p-4 sm:p-6 bg-slate-100 flex justify-center overflow-x-auto">
        <div className="w-full max-w-[700px] bg-white border border-slate-300 shadow-lg rounded-sm p-6 sm:p-8 text-slate-900 font-sans text-xs relative select-none">
          {/* Header */}
          <div className="border-b pb-3 mb-4 flex flex-col items-center relative">
            <div className="bg-yellow-300 px-3 py-1 font-bold tracking-wide text-xs sm:text-sm uppercase text-slate-900 text-center rounded-sm">
              SARAVANAN ELECTRICALS &amp; ENGINEERING PVT LTD.,
            </div>
            <div className="w-full text-right text-[10px] text-slate-600 mt-1 font-mono">
              DOC No:SEEPL/QC/02/NCR/R2/26-27
            </div>
          </div>

          {/* PAGE 1 CONTENT */}
          {activePage === 1 && (
            <div className="space-y-3">
              {/* Table 0: Title */}
              <div className="border border-black p-2 text-center font-bold text-sm sm:text-base uppercase tracking-wider bg-slate-50">
                NON-CONFIRMANCE REPORT
              </div>

              {/* Table 1: Primary Form Data */}
              <table className="w-full border-collapse border border-black text-left">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="w-1/3 border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      NC NUMBER
                    </td>
                    <td className="w-2/3 p-1.5 font-semibold text-blue-700">
                      {formData.ncNumber || '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      PANEL NAME
                    </td>
                    <td className="p-1.5 font-medium">
                      {formData.panelName || '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      JOB NO
                    </td>
                    <td className="p-1.5 font-medium">
                      {formData.jobNo || '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      CLIENT/PROJECT
                    </td>
                    <td className="p-1.5 font-medium">
                      {formData.clientProject || '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      DATE
                    </td>
                    <td className="p-1.5 font-medium">{formData.date || '-'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      OPERATOR NAME
                    </td>
                    <td className="p-1.5 font-medium">
                      {formData.operatorName || '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      QUANTITY
                    </td>
                    <td className="p-1.5 font-medium">
                      {formData.quantity ? `${formData.quantity} NOs` : '1 NOs'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1.5 font-bold uppercase bg-slate-50/50">
                      DEPARTMENT
                    </td>
                    <td className="p-1.5 font-medium">
                      {formData.department || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Table 2: Problem */}
              <table className="w-full border-collapse border border-black text-left">
                <tbody>
                  <tr>
                    <td className="w-1/4 border-r border-black p-2 font-bold uppercase bg-slate-50/50 align-top">
                      PROBLEM
                    </td>
                    <td className="w-3/4 p-2 font-semibold text-rose-800">
                      {formData.problem || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Table 3: Defect Image */}
              <table className="w-full border-collapse border border-black text-center">
                <thead>
                  <tr className="border-b border-black bg-slate-50/50">
                    <th className="p-1.5 font-bold uppercase tracking-wider">
                      DEFECT IMAGE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 h-44 sm:h-52 text-center align-middle bg-slate-50/30 overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        {annotatedImage ? (
                          <img
                            src={annotatedImage}
                            alt="Annotated Defect"
                            className="max-h-40 sm:max-h-48 max-w-full w-auto h-auto object-contain rounded border border-slate-200 block mx-auto"
                          />
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            (No defect image uploaded)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Table 4: Quality Sign & Responsible Sign */}
              <table className="w-full table-fixed border-collapse border border-black text-center">
                <thead>
                  <tr className="border-b border-black bg-slate-50/50">
                    <th className="w-1/2 border-r border-black p-1.5 font-bold uppercase text-[11px]">
                      QUALITY SIGN
                    </th>
                    <th className="w-1/2 p-1.5 font-bold uppercase text-[11px]">
                      RESPONSIBLE SIGN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="w-1/2 border-r border-black h-16 sm:h-20 p-1.5 overflow-hidden align-middle">
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        {formData.qualitySign ? (
                          <img
                            src={formData.qualitySign}
                            alt="Quality Sign"
                            className="max-w-full max-h-full w-auto h-auto object-contain block mx-auto"
                          />
                        ) : (
                          <span className="text-slate-300 italic text-[10px]">
                            (Unsigned)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="w-1/2 h-16 sm:h-20 p-1.5 overflow-hidden align-middle">
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        {formData.responsibleSign ? (
                          <img
                            src={formData.responsibleSign}
                            alt="Responsible Sign"
                            className="max-w-full max-h-full w-auto h-auto object-contain block mx-auto"
                          />
                        ) : (
                          <span className="text-slate-300 italic text-[10px]">
                            (Unsigned)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* PAGE 2 CONTENT (Printable Shop-Floor Template) */}
          {activePage === 2 && (
            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <div className="font-bold text-xs">2. IMMEDIATE CONTAINMENT ACTION</div>
                <div className="border-b border-dashed border-slate-400 h-5"></div>
                <div className="border-b border-dashed border-slate-400 h-5"></div>
                <div className="border-b border-dashed border-slate-400 h-5"></div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="font-bold text-xs">3. ROOT CAUSE ANALYSIS</div>
                <div className="text-[11px] font-semibold text-slate-800">Problem:</div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>

                <div className="space-y-1 pt-1">
                  <div className="font-bold text-[11px]">Why 1: ________________________________________________</div>
                  <div className="font-bold text-[11px]">Why 2: ________________________________________________</div>
                  <div className="font-bold text-[11px]">Why 3: ________________________________________________</div>
                  <div className="font-bold text-[11px]">Why 4: ________________________________________________</div>
                  <div className="font-bold text-[11px]">Why 5: ________________________________________________</div>
                </div>

                <div className="pt-1.5">
                  <div className="font-bold text-[11px]">Root Cause Identified:</div>
                  <div className="border-b border-dashed border-slate-400 h-4"></div>
                </div>

                <div className="pt-1.5">
                  <div className="font-bold text-[11px]">Contributing Cause(s):</div>
                  <div className="border-b border-dashed border-slate-400 h-4"></div>
                  <div className="border-b border-dashed border-slate-400 h-4"></div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="font-bold text-xs">4. CORRECTION / RECTIFICATION</div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>
                <div className="flex items-center gap-4 pt-1 font-bold text-[11px]">
                  <span>Disposition:</span>
                  <span className="flex items-center gap-1 font-normal">
                    <span className="w-3.5 h-3.5 border border-black inline-block"></span> Rework
                  </span>
                  <span className="flex items-center gap-1 font-normal">
                    <span className="w-3.5 h-3.5 border border-black inline-block"></span> Use as Is – Approved Deviation
                  </span>
                  <span className="flex items-center gap-1 font-normal">
                    <span className="w-3.5 h-3.5 border border-black inline-block"></span> Scrap
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="font-bold text-xs">5. CORRECTIVE ACTION</div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>
                <div className="flex flex-wrap items-center justify-between text-[11px] font-bold pt-1">
                  <span>Responsible Person: _________________</span>
                  <span>Target Date: _________________</span>
                  <span>Completion Date: _________________</span>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="font-bold text-xs">6. PREVENTIVE ACTION</div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>
                <div className="border-b border-dashed border-slate-400 h-4"></div>
              </div>

              {/* Bottom Signatures Table */}
              <table className="w-full border-collapse border border-black text-center mt-3">
                <thead>
                  <tr className="border-b border-black bg-slate-50/50">
                    <th className="w-1/3 border-r border-black p-1 font-bold text-[11px]">
                      RESPONSIBLE PERSON
                    </th>
                    <th className="w-1/3 border-r border-black p-1 font-bold text-[11px]">
                      QUALITY
                    </th>
                    <th className="w-1/3 p-1 font-bold text-[11px]">
                      PLANT DIRECTOR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-r border-black h-12 p-1"></td>
                    <td className="border-r border-black h-12 p-1"></td>
                    <td className="h-12 p-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Page Number */}
          <div className="mt-4 pt-2 border-t text-right text-[10px] text-slate-500 font-mono">
            PAGE {activePage} OF 2
          </div>
        </div>
      </div>
    </div>
  );
}
