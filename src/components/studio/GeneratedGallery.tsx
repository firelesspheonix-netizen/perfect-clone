import { useState } from 'react';
import { Download, RotateCcw, X, ZoomIn } from 'lucide-react';
import { GeneratedImage } from '@/types/studio';

interface GeneratedGalleryProps {
  images: GeneratedImage[];
  onReprompt: (image: GeneratedImage) => void;
}

export function GeneratedGallery({ images, onReprompt }: GeneratedGalleryProps) {
  const [enlargedId, setEnlargedId] = useState<string | null>(null);
  const enlarged = images.find((i) => i.id === enlargedId);

  const downloadImage = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.imageData;
    link.download = `generation-${img.id}.png`;
    link.click();
  };

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <ZoomIn className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Generated images will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-card animate-fade-in">
              <img
                src={img.imageData}
                alt="Generated"
                className="w-full aspect-square object-cover cursor-pointer"
                onClick={() => setEnlargedId(img.id)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                  <button
                    onClick={() => setEnlargedId(img.id)}
                    className="flex-1 py-1.5 text-[10px] uppercase font-semibold bg-secondary/90 text-foreground rounded-md hover:bg-secondary flex items-center justify-center gap-1"
                  >
                    <ZoomIn className="w-3 h-3" /> View
                  </button>
                  <button
                    onClick={() => downloadImage(img)}
                    className="flex-1 py-1.5 text-[10px] uppercase font-semibold bg-secondary/90 text-foreground rounded-md hover:bg-secondary flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={() => onReprompt(img)}
                    className="flex-1 py-1.5 text-[10px] uppercase font-semibold bg-primary/90 text-primary-foreground rounded-md hover:bg-primary flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reuse
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enlarged view */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4"
          onClick={() => setEnlargedId(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={enlarged.imageData} alt="Enlarged" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => downloadImage(enlarged)}
                className="p-2 bg-secondary/90 rounded-full hover:bg-secondary"
              >
                <Download className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={() => setEnlargedId(null)}
                className="p-2 bg-secondary/90 rounded-full hover:bg-secondary"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
