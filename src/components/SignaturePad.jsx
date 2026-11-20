import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, PenLine } from 'lucide-react';

export default function SignaturePad({
  label = 'SIGNATURE',
  signatoryTitle = '',
  onSignatureChange
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Set up canvas with high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Deep slate ink
    ctx.lineWidth = 2.5;
  }, []);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if pointer capture already released
    }

    // Export transparent PNG
    exportPng();
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas has non-transparent pixels
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasPixels = imgData.data.some((channel, idx) => idx % 4 === 3 && channel > 0);

    if (hasPixels) {
      const dataUrl = canvas.toDataURL('image/png');
      setHasSignature(true);
      if (onSignatureChange) onSignatureChange(dataUrl);
    } else {
      setHasSignature(false);
      if (onSignatureChange) onSignatureChange(null);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setHasSignature(false);
    if (onSignatureChange) onSignatureChange(null);
  };

  return (
    <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3 space-y-2">
      {/* Label & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold uppercase text-slate-800 tracking-wide">
            {label}
          </span>
          {signatoryTitle && (
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              ({signatoryTitle})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasSignature ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              <Check className="w-3 h-3 text-emerald-600" />
              Signed
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Optional</span>
          )}

          {hasSignature && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-0.5 p-1 hover:bg-rose-50 rounded transition-colors"
              title="Clear Signature"
            >
              <Eraser className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Signature Canvas Area */}
      <div className="relative bg-white rounded-lg border border-slate-300 shadow-inner overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="w-full h-24 cursor-crosshair block touch-none"
        />

        {/* Guideline line */}
        <div className="absolute bottom-5 left-4 right-4 border-b border-dashed border-slate-300 pointer-events-none"></div>

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-medium">
            Sign here with touch or stylus
          </div>
        )}
      </div>
    </div>
  );
}
