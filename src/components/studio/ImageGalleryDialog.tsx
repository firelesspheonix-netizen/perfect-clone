import { useState, useCallback } from 'react';
import { X, Upload, Trash2, Images, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { uploadImageToStorage } from '@/data/presets';

export interface GalleryItem {
  id: string;
  image: string;
  label?: string;
}

interface ImageGalleryDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: GalleryItem[];
  onSelect: (item: GalleryItem) => void;
  onDelete: (id: string) => void | Promise<void>;
  onBulkUpload: (imageUrls: string[]) => void | Promise<void>;
  hideUpload?: boolean;
}

export function ImageGalleryDialog({ open, onClose, title, items, onSelect, onDelete, onBulkUpload, hideUpload }: ImageGalleryDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f =>
      /image\/(png|jpeg|jpg|gif|webp)/.test(f.type) || /\.(png|jpe?g|gif|webp)$/i.test(f.name)
    );
    if (arr.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: arr.length });

    try {
      const urls: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        const url = await uploadImageToStorage(arr[i]);
        urls.push(url);
        setUploadProgress({ current: i + 1, total: arr.length });
      }
      await onBulkUpload(urls);
    } catch (err) {
      console.error('Bulk upload error:', err);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      setUploadKey(k => k + 1);
    }
  }, [onBulkUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  if (!open) return null;

  const progressPct = uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <span className="text-[10px] text-muted-foreground">({items.length} saved)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Upload area */}
        {!hideUpload && (
          <div className="mx-4 mt-3">
            {uploading ? (
              <div className="border-2 border-primary/30 rounded-lg p-4 flex flex-col items-center gap-3 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs font-medium text-foreground">
                    Uploading {uploadProgress.current} of {uploadProgress.total} images...
                  </span>
                </div>
                <Progress value={progressPct} className="h-2 w-full" />
                <span className="text-[10px] text-muted-foreground">{progressPct}% complete</span>
              </div>
            ) : (
              <label
                className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click or drag to bulk upload images</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG — select multiple files</span>
                <input
                  key={uploadKey}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processFiles(e.target.files);
                    }
                  }}
                />
              </label>
            )}
          </div>
        )}

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Images className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">{hideUpload ? 'No saved items yet.' : 'No saved images yet. Upload some above!'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => onSelect(item)}
                >
                  <img
                    src={item.image}
                    alt={item.label || 'Saved image'}
                    className="w-full h-full object-cover"
                  />
                  <div className="touch-visible absolute inset-0 bg-gradient-to-t from-background/60 to-transparent transition-opacity pointer-events-none" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="touch-visible absolute top-1 right-1 p-1 bg-destructive/90 rounded-md transition-opacity z-10"
                  >
                    <Trash2 className="w-3 h-3 text-destructive-foreground" />
                  </button>
                  {item.label && (
                    <span className="touch-visible absolute bottom-1 left-1 right-1 text-[9px] text-foreground font-medium truncate transition-opacity pointer-events-none">
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
