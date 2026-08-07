import { useRef, useState, useCallback, useEffect } from 'react';
import { Minus, Plus, Undo2, Trash2 } from 'lucide-react';

interface RetouchCanvasProps {
  imageUrl: string;
  onMaskReady: (maskDataUrl: string) => void;
  disabled?: boolean;
}

export function RetouchCanvas({ imageUrl, onMaskReady, disabled }: RetouchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  const strokeHistory = useRef<ImageData[]>([]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth;
      const scale = Math.min(maxW / img.width, 600 / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      setImgDimensions({ w, h });

      const canvas = canvasRef.current!;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const mask = maskCanvasRef.current!;
      mask.width = w;
      mask.height = h;
      const mctx = mask.getContext('2d')!;
      mctx.fillStyle = '#000';
      mctx.fillRect(0, 0, w, h);

      setHasStrokes(false);
      strokeHistory.current = [];
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const paintAt = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current!;
    const mask = maskCanvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const mctx = mask.getContext('2d')!;

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    mctx.fillStyle = '#fff';
    mctx.beginPath();
    mctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    mctx.fill();
  }, [brushSize]);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const mask = maskCanvasRef.current!;
    const mctx = mask.getContext('2d')!;
    strokeHistory.current.push(mctx.getImageData(0, 0, mask.width, mask.height));

    setIsDrawing(true);
    const pos = getPos(e);
    paintAt(pos.x, pos.y);
    setHasStrokes(true);
  }, [disabled, getPos, paintAt]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    paintAt(pos.x, pos.y);
  }, [isDrawing, disabled, getPos, paintAt]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const mask = maskCanvasRef.current!;
    onMaskReady(mask.toDataURL('image/png'));
  }, [isDrawing, onMaskReady]);

  const undo = useCallback(() => {
    const prev = strokeHistory.current.pop();
    if (!prev) return;
    const mask = maskCanvasRef.current!;
    const mctx = mask.getContext('2d')!;
    mctx.putImageData(prev, 0, 0);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const maskData = mctx.getImageData(0, 0, mask.width, mask.height);
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i] > 128) {
          const px = (i / 4) % canvas.width;
          const py = Math.floor(i / 4 / canvas.width);
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(px, py, 1, 1);
          ctx.globalAlpha = 1;
        }
      }
      setHasStrokes(strokeHistory.current.length > 0 || maskHasWhite(maskData));
      onMaskReady(mask.toDataURL('image/png'));
    };
    img.src = imageUrl;
  }, [imageUrl, onMaskReady]);

  const clearAll = useCallback(() => {
    const mask = maskCanvasRef.current!;
    const mctx = mask.getContext('2d')!;
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, mask.width, mask.height);
    strokeHistory.current = [];

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
    setHasStrokes(false);
    onMaskReady('');
  }, [imageUrl, onMaskReady]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Brush</span>
        <button onClick={() => setBrushSize(s => Math.max(4, s - 4))} className="p-1 rounded hover:bg-secondary">
          <Minus className="w-3 h-3 text-muted-foreground" />
        </button>
        <span className="text-xs font-mono text-foreground w-6 text-center">{brushSize}</span>
        <button onClick={() => setBrushSize(s => Math.min(80, s + 4))} className="p-1 rounded hover:bg-secondary">
          <Plus className="w-3 h-3 text-muted-foreground" />
        </button>
        <div className="flex-1" />
        <button onClick={undo} disabled={strokeHistory.current.length === 0} className="p-1 rounded hover:bg-secondary disabled:opacity-30">
          <Undo2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={clearAll} disabled={!hasStrokes} className="p-1 rounded hover:bg-secondary disabled:opacity-30">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div ref={containerRef} className="relative rounded-lg overflow-hidden border border-border bg-secondary/30">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ display: 'block' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <canvas ref={maskCanvasRef} className="hidden" />
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Paint over the areas you want to retouch. The AI will clean up only the highlighted regions.
      </p>
    </div>
  );
}

function maskHasWhite(data: ImageData) {
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i] > 128) return true;
  }
  return false;
}
