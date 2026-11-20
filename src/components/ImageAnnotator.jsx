import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, RotateCcw, Trash2, Circle, PenTool, Check } from 'lucide-react';

export default function ImageAnnotator({ imageSrc, onImageExport }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [loadedImg, setLoadedImg] = useState(null);
  const [history, setHistory] = useState([]); // Array of Canvas ImageData or draw actions
  const [tool, setTool] = useState('circle'); // 'circle' or 'freehand'
  const [color, setColor] = useState('#ef4444'); // Red default or #22c55e (Green)
  const [lineWidth, setLineWidth] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentStroke, setCurrentStroke] = useState([]);

  // Load image whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImg(img);
      setHistory([]);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw canvas whenever loadedImg or history changes
  useEffect(() => {
    if (!loadedImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Scale canvas to max width 650px, JPEG quality 0.75 for payload safeguard
    const MAX_WIDTH = 650;
    const scale = loadedImg.width > MAX_WIDTH ? MAX_WIDTH / loadedImg.width : 1;
    const width = Math.round(loadedImg.width * scale);
    const height = Math.round(loadedImg.height * scale);

    canvas.width = width;
    canvas.height = height;

    // Draw base image
    ctx.drawImage(loadedImg, 0, 0, width, height);

    // Replay history
    history.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (action.type === 'circle') {
        const rx = Math.abs(action.endX - action.startX) / 2;
        const ry = Math.abs(action.endY - action.startY) / 2;
        const cx = Math.min(action.startX, action.endX) + rx;
        const cy = Math.min(action.startY, action.endY) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.type === 'freehand' && action.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
      }
    });

    // Notify parent of updated exported image
    exportCanvas();
  }, [loadedImg, history]);

  // Export canvas as JPEG dataURL
  const exportCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    if (onImageExport) {
      onImageExport({
        dataUrl,
        width: canvas.width,
        height: canvas.height
      });
    }
  };

  // Coordinate helper
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    if (!loadedImg) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);
    if (tool === 'freehand') {
      setCurrentStroke([coords]);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !loadedImg || !canvasRef.current) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Redraw base + history
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

    history.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (action.type === 'circle') {
        const rx = Math.abs(action.endX - action.startX) / 2;
        const ry = Math.abs(action.endY - action.startY) / 2;
        const cx = Math.min(action.startX, action.endX) + rx;
        const cy = Math.min(action.startY, action.endY) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.type === 'freehand' && action.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
      }
    });

    // Preview current active drawing
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'circle') {
      const rx = Math.abs(coords.x - startPos.x) / 2;
      const ry = Math.abs(coords.y - startPos.y) / 2;
      const cx = Math.min(startPos.x, coords.x) + rx;
      const cy = Math.min(startPos.y, coords.y) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === 'freehand') {
      const updated = [...currentStroke, coords];
      setCurrentStroke(updated);
      ctx.beginPath();
      ctx.moveTo(updated[0].x, updated[0].y);
      for (let i = 1; i < updated.length; i++) {
        ctx.lineTo(updated[i].x, updated[i].y);
      }
      ctx.stroke();
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing || !loadedImg) return;
    setIsDrawing(false);
    const coords = getCanvasCoords(e);

    if (tool === 'circle') {
      const rx = Math.abs(coords.x - startPos.x) / 2;
      const ry = Math.abs(coords.y - startPos.y) / 2;
      // Only register if user actually dragged
      if (rx > 5 || ry > 5) {
        setHistory((prev) => [
          ...prev,
          {
            type: 'circle',
            startX: startPos.x,
            startY: startPos.y,
            endX: coords.x,
            endY: coords.y,
            color,
            lineWidth
          }
        ]);
      }
    } else if (tool === 'freehand') {
      if (currentStroke.length > 1) {
        setHistory((prev) => [
          ...prev,
          {
            type: 'freehand',
            points: currentStroke,
            color,
            lineWidth
          }
        ]);
      }
      setCurrentStroke([]);
    }
  };

  const handleUndo = () => {
    setHistory((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClear = () => {
    setHistory([]);
  };

  return (
    <div className="space-y-3">
      {/* Canvas Tool Controls */}
      {loadedImg && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs">
          {/* Tool Mode */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-md shadow-sm border border-slate-200">
            <button
              type="button"
              onClick={() => setTool('circle')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all font-medium ${
                tool === 'circle'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>Circle Tool</span>
            </button>
            <button
              type="button"
              onClick={() => setTool('freehand')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all font-medium ${
                tool === 'freehand'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
          </div>

          {/* Color Chooser */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Color:</span>
            <button
              type="button"
              onClick={() => setColor('#ef4444')}
              className={`w-6 h-6 rounded-full bg-red-500 border-2 transition-all flex items-center justify-center ${
                color === '#ef4444' ? 'border-slate-800 scale-110 shadow-sm' : 'border-white'
              }`}
              title="Red Defect Highlight"
            >
              {color === '#ef4444' && <Check className="w-3 h-3 text-white" />}
            </button>
            <button
              type="button"
              onClick={() => setColor('#22c55e')}
              className={`w-6 h-6 rounded-full bg-emerald-500 border-2 transition-all flex items-center justify-center ${
                color === '#22c55e' ? 'border-slate-800 scale-110 shadow-sm' : 'border-white'
              }`}
              title="Green Verification Highlight"
            >
              {color === '#22c55e' && <Check className="w-3 h-3 text-white" />}
            </button>
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-md shadow-sm border border-slate-200">
            <span className="text-slate-400 pl-1">Size:</span>
            {[3, 5, 8].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setLineWidth(size)}
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  lineWidth === size
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {size === 3 ? 'Fine' : size === 5 ? 'Med' : 'Bold'}
              </button>
            ))}
          </div>

          {/* Undo & Clear */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              title="Undo Last Stroke"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-200 text-rose-600 rounded-md hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              title="Clear All Markings"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative bg-slate-900/5 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center min-h-[220px]"
      >
        {loadedImg ? (
          <div className="relative max-h-[380px] w-full flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="max-h-[360px] max-w-full object-contain cursor-crosshair rounded-lg shadow-md border border-slate-300 touch-none bg-white"
            />
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-mono pointer-events-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Click & drag to draw circle / mark
            </div>
          </div>
        ) : (
          <div className="text-center py-10 px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Defect Photo Selected</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Upload a shop-floor photo or capture with mobile camera to draw highlight markings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
