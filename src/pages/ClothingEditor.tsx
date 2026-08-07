import { useState } from 'react';
import { ArrowLeft, Wand2, Loader2, Download, Shirt, Upload } from 'lucide-react';
import { useNavigate } from '@/lib/navigation';
import { ImageUpload } from '@/components/studio/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditResult { id: string; imageUrl: string; timestamp: number; }

export default function ClothingEditor() {
  const navigate = useNavigate();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [clothingImages, setClothingImages] = useState<(string | null)[]>([null]);
  const [clothingDescription, setClothingDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<EditResult[]>([]);

  const addClothingSlot = () => { if (clothingImages.length >= 5) return; setClothingImages(prev => [...prev, null]); };
  const updateClothingImage = (index: number, value: string | null) => { setClothingImages(prev => prev.map((img, i) => i === index ? value : img)); };
  const removeClothingSlot = (index: number) => { setClothingImages(prev => prev.filter((_, i) => i !== index)); };

  const handleGenerate = async () => {
    if (!sourceImage) { toast.error('Upload a source image first'); return; }
    const hasClothingRef = clothingImages.some(img => img !== null);
    if (!hasClothingRef && !clothingDescription) { toast.error('Provide clothing reference images or a description'); return; }
    setIsGenerating(true);
    try {
      const parts: string[] = ['Edit this photo of a person. Change ONLY the clothing they are wearing. Keep the person\'s face, expression, hair, body, pose, and background EXACTLY the same — do NOT alter anything other than the clothes.'];
      if (hasClothingRef) parts.push('Dress the person in the exact clothing shown in the provided clothing reference image(s). Match the style, color, fit, and details precisely.');
      if (clothingDescription) parts.push(`Clothing description: ${clothingDescription}.`);
      parts.push('Output a single photorealistic image. The person must look identical except for the clothing.');
      const referenceImages = [sourceImage];
      clothingImages.forEach(img => { if (img) referenceImages.push(img); });
      const { data, error } = await supabase.functions.invoke('edit-clothing', { body: { prompt: parts.join('\n'), referenceImages } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.imageUrl) { setResults(prev => [{ id: crypto.randomUUID(), imageUrl: data.imageUrl, timestamp: Date.now() }, ...prev]); toast.success('Clothing changed successfully!'); }
      else toast.error('No image returned from AI');
    } catch (err: any) { toast.error(err.message || 'Failed to edit clothing'); }
    finally { setIsGenerating(false); }
  };

  const downloadImage = (url: string) => { const link = document.createElement('a'); link.href = url; link.download = `clothing-edit-${Date.now()}.png`; link.click(); };
  const hasChanges = clothingImages.some(img => img !== null) || !!clothingDescription;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <aside className="w-[360px] min-w-[360px] border-r border-border flex flex-col bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></button>
          <div><h1 className="text-sm font-bold text-foreground tracking-tight">Clothing Editor</h1><p className="text-[10px] text-muted-foreground">Change outfits with AI</p></div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
          <div className="border border-border rounded-lg bg-card p-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source Image</label>
            <ImageUpload label="" value={sourceImage} onChange={setSourceImage} />
          </div>
          <div className="border border-border rounded-lg bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Shirt className="w-3.5 h-3.5 text-primary" /><h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Clothing Reference</h3></div>
              {clothingImages.length < 5 && <button onClick={addClothingSlot} className="text-[10px] uppercase font-semibold text-primary hover:bg-primary/10 px-2 py-0.5 rounded-md transition-colors">+ Add</button>}
            </div>
            {clothingImages.map((img, i) => (
              <div key={i} className="relative">
                <ImageUpload label={clothingImages.length > 1 ? `Item ${i + 1}` : ''} value={img} onChange={(v) => updateClothingImage(i, v)} />
                {clothingImages.length > 1 && (
                  <button onClick={() => removeClothingSlot(i)} className="absolute top-0 right-0 p-1 hover:bg-destructive/20 rounded text-destructive">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border border-border rounded-lg bg-card p-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clothing Description</label>
            <textarea className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary resize-none" rows={3} placeholder="Describe the outfit... e.g. 'White linen button-up shirt with dark blue jeans and brown boots'" value={clothingDescription} onChange={(e) => setClothingDescription(e.target.value)} />
          </div>
        </div>
        <div className="p-3 border-t border-border">
          <button onClick={handleGenerate} disabled={isGenerating || !sourceImage || !hasChanges} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 glow-primary">
            {isGenerating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Changing Outfit...</>) : (<><Wand2 className="w-4 h-4" /> Change Clothing</>)}
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">Results</h2><span className="text-[10px] text-muted-foreground font-mono">{results.length} edits</span></div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {results.length === 0 ? (
            <div className="h-full flex items-center justify-center"><div className="text-center space-y-2"><Shirt className="w-8 h-8 text-muted-foreground/30 mx-auto" /><p className="text-sm text-muted-foreground">Upload a person and clothing references to get started</p></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((r) => (
                <div key={r.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
                  <img src={r.imageUrl} alt="Clothing edit" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => downloadImage(r.imageUrl)} className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                    <button onClick={() => setSourceImage(r.imageUrl)} className="px-3 py-1.5 text-xs font-semibold bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">Use as Source</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
