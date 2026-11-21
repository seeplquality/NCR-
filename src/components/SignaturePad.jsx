import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, PenLine } from 'lucide-react';

/**
 * Helper to crop/trim transparent margins around signature strokes so the
 * signature fills the document cell clearly without looking tiny.
 */
function trimSignatureCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 15) {
        hasInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasInk) {
    return null;
  }

  // Add 10px padding around the strokes
  const padding = 10;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width, maxX + padding);
  maxY = Math.min(height, maxY + padding);

  const trimW = maxX - minX;
  const trimH = maxY - minY;

  if (trimW <= 0 || trimH <= 0) {
    return null;
  }

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimW;
  trimmedCanvas.height = trimH;
  const trimCtx = trimmedCanvas.getContext('2d');

  trimCtx.drawImage(
    canvas,
    minX, minY, trimW, trimH,
    0, 0, trimW, trimH
  );

  return trimmedCanvas.toDataURL('image/png');
}

export default function SignaturePad({
  label = 'SIGNATURE',
  signatoryTitle = '',
  onSignatureChange
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Set up canvas with high-DPI scaling and bold pen strokes (lineWidth 3.8)
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
    ctx.strokeStyle = '#000000'; // Crisp bold black ink
    ctx.lineWidth = 3.8; // Bold, legible stroke
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
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.8;

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

    // Export trimmed transparent PNG
    exportPng();
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const trimmedUrl = trimSignatureCanvas(canvas);

    if (trimmedUrl) {
      setHasSignature(true);
      if (onSignatureChange) onSignatureChange(trimmedUrl);
    } else {
      setHasSignature(false);
      if (onSignatureChange) onSignatureChange(null);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

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
