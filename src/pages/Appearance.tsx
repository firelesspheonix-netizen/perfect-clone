import { useState, useCallback } from 'react';
import { ArrowLeft, X, Palette, Eye, Scissors, Wand2, Loader2, Download, Eraser, Sparkles } from 'lucide-react';
import { useNavigate } from '@/lib/navigation';
import { ImageUpload } from '@/components/studio/ImageUpload';
import { RetouchCanvas } from '@/components/studio/RetouchCanvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SKIN_COLORS = ['#FDEBD0','#FCD5A8','#F5C49C','#E8B48A','#D4A574','#C4956A','#A67B5B','#8D6748','#6F4E37','#5C3D2E','#3B2417'];
const HAIR_COLORS = ['#FAFAD2','#F5DEB3','#DAA520','#D2691E','#CD853F','#A0522D','#8B4513','#654321','#3B2F2F','#1C1C1C','#000000','#B22222','#DC143C','#FF6347','#FF69B4','#DA70D6','#9370DB','#4169E1','#00CED1','#32CD32','#808080'];
const EYE_COLORS = ['#8B4513','#654321','#3B2F2F','#1C1C1C','#006400','#228B22','#6B8E23','#9ACD32','#4169E1','#1E90FF','#87CEEB','#ADD8E6','#708090','#808080','#A9A9A9','#C0C0C0','#DAA520','#B8860B','#FF8C00','#9370DB'];

const HAIR_LABELS: Record<string, string> = {
  '#FAFAD2':'Platinum Blonde','#F5DEB3':'Light Blonde','#DAA520':'Golden','#D2691E':'Auburn',
  '#CD853F':'Light Brown','#A0522D':'Medium Brown','#8B4513':'Dark Brown','#654321':'Espresso',
  '#3B2F2F':'Near Black','#1C1C1C':'Jet Black','#000000':'Black',
  '#B22222':'Deep Red','#DC143C':'Crimson','#FF6347':'Strawberry','#FF69B4':'Pink',
  '#DA70D6':'Lavender','#9370DB':'Purple','#4169E1':'Blue','#00CED1':'Teal',
  '#32CD32':'Green','#808080':'Silver/Gray',
};

const EYE_LABELS: Record<string, string> = {
  '#8B4513':'Dark Brown','#654321':'Brown','#3B2F2F':'Deep Brown','#1C1C1C':'Near Black',
  '#006400':'Dark Green','#228B22':'Green','#6B8E23':'Olive Green','#9ACD32':'Light Green',
  '#4169E1':'Blue','#1E90FF':'Light Blue','#87CEEB':'Sky Blue','#ADD8E6':'Pale Blue',
  '#708090':'Slate Gray','#808080':'Gray','#A9A9A9':'Light Gray','#C0C0C0':'Silver',
  '#DAA520':'Amber','#B8860B':'Dark Amber','#FF8C00':'Hazel','#9370DB':'Violet',
};

function colorName(hex: string, labels: Record<string, string>) { return labels[hex] || hex; }

function ColorGrid({ colors, selected, onSelect, labels }: { colors: string[]; selected: string; onSelect: (c: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button key={c} onClick={() => onSelect(selected === c ? '' : c)} className={`group relative w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${selected === c ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border hover:border-muted-foreground'}`} style={{ backgroundColor: c }} title={labels?.[c] || c}>
          {selected === c && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-primary-foreground/80 border border-primary" /></div>}
        </button>
      ))}
    </div>
  );
}

function CustomColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <input type="color" value={value || '#888888'} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent" />
      <input className="flex-1 bg-secondary border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary font-mono" placeholder="Custom color or description" value={value} onChange={(e) => onChange(e.target.value)} />
      {value && <button onClick={() => onChange('')} className="p-1 hover:bg-destructive/20 rounded"><X className="w-3 h-3 text-destructive" /></button>}
    </div>
  );
}

interface EditResult { id: string; imageUrl: string; timestamp: number; }
type EditorMode = 'appearance' | 'retouch';

export default function Appearance() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<EditorMode>('appearance');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [skinColor, setSkinColor] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [hairRefImage, setHairRefImage] = useState<string | null>(null);
  const [eyeRefImage, setEyeRefImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<EditResult[]>([]);
  const [maskData, setMaskData] = useState<string>('');

  const handleMaskReady = useCallback((mask: string) => { setMaskData(mask); }, []);

  const buildPrompt = () => {
    const parts: string[] = ['Edit this photo of a person. You MUST keep EVERYTHING about the person EXACTLY the same: same face, same facial features, same expression, same body, same pose, same clothing, same background, same lighting, same composition. The ONLY thing you are allowed to change is what is explicitly listed below. Everything else MUST remain pixel-perfect identical.'];
    if (skinColor) parts.push(`- Change ONLY their skin color to: ${skinColor}. Do NOT change their face shape, features, hair, eyes, or anything else.`);
    if (hairColor) parts.push(`- Change ONLY their hair color to: ${colorName(hairColor, HAIR_LABELS)} (${hairColor}). Do NOT change hairstyle, face, eyes, skin, or anything else.`);
    if (hairRefImage) parts.push('- Change ONLY their hair to match the color and style shown in the provided hair reference image. Do NOT change face, eyes, skin, or anything else.');
    if (eyeColor) parts.push(`- Change ONLY their eye color (iris color) to: ${colorName(eyeColor, EYE_LABELS)} (${eyeColor}). Do NOT change the eye shape, eyelashes, eyebrows, face, skin, hair, or ANY other feature. ONLY the iris color should change.`);
    if (eyeRefImage) parts.push('- Change ONLY their eye color (iris color) to match the color shown in the provided eye reference image. Do NOT change the eye shape, eyelashes, eyebrows, face, skin, hair, or anything else. ONLY the iris color.');
    if (!skinColor && !hairColor && !eyeColor && !hairRefImage && !eyeRefImage) parts.push('No changes specified — return the image as-is.');
    parts.push('CRITICAL: Do NOT change anything other than what is explicitly listed above. The person must look identical in every other way. Output a single photorealistic image.');
    return parts.join('\n');
  };

  const handleGenerate = async () => {
    if (!sourceImage) { toast.error('Upload a source image first'); return; }
    if (mode === 'appearance' && !skinColor && !hairColor && !eyeColor && !hairRefImage && !eyeRefImage) { toast.error('Select at least one change'); return; }
    if (mode === 'retouch' && !maskData) { toast.error('Paint over the areas you want to retouch'); return; }
    setIsGenerating(true);
    try {
      if (mode === 'retouch') {
        const { data, error } = await supabase.functions.invoke('retouch-image', { body: { imageData: sourceImage, maskData } });
        if (error) throw error;
        if (data?.error) { toast.error(data.error); return; }
        if (data?.imageUrl) { setResults(prev => [{ id: crypto.randomUUID(), imageUrl: data.imageUrl, timestamp: Date.now() }, ...prev]); toast.success('Image retouched successfully!'); }
        else toast.error('No image returned from AI');
      } else {
        const referenceImages = [sourceImage];
        if (hairRefImage) referenceImages.push(hairRefImage);
        if (eyeRefImage) referenceImages.push(eyeRefImage);
        const { data, error } = await supabase.functions.invoke('generate-image', { body: { prompt: buildPrompt(), model: 'google/gemini-3-pro-image-preview', referenceImages } });
        if (error) throw error;
        if (data?.error) { toast.error(data.error); return; }
        if (data?.imageUrl) { setResults(prev => [{ id: crypto.randomUUID(), imageUrl: data.imageUrl, timestamp: Date.now() }, ...prev]); toast.success('Image edited successfully!'); }
        else toast.error('No image returned from AI');
      }
    } catch (err: any) { toast.error(err.message || 'Failed to process image'); }
    finally { setIsGenerating(false); }
  };

  const downloadImage = (url: string) => { const link = document.createElement('a'); link.href = url; link.download = `edited-${Date.now()}.png`; link.click(); };
  const hasChanges = (mode === 'retouch' && !!maskData) || !!(skinColor || hairColor || eyeColor || hairRefImage || eyeRefImage);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <aside className="w-[360px] min-w-[360px] border-r border-border flex flex-col bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-muted-foreground" /></button>
          <div><h1 className="text-sm font-bold text-foreground tracking-tight">Appearance Editor</h1><p className="text-[10px] text-muted-foreground">Edit appearance & retouch with AI</p></div>
        </div>
        <div className="px-3 pt-3 flex gap-1">
          <button onClick={() => setMode('appearance')} className={`flex-1 py-1.5 text-[11px] uppercase font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${mode === 'appearance' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}><Palette className="w-3 h-3" /> Appearance</button>
          <button onClick={() => setMode('retouch')} className={`flex-1 py-1.5 text-[11px] uppercase font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${mode === 'retouch' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}><Eraser className="w-3 h-3" /> Retouch</button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
          <div className="border border-border rounded-lg bg-card p-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source Image</label>
            <ImageUpload label="" value={sourceImage} onChange={setSourceImage} />
          </div>
          {mode === 'retouch' ? (
            <div className="space-y-3">
              {sourceImage ? <RetouchCanvas imageUrl={sourceImage} onMaskReady={handleMaskReady} disabled={isGenerating} /> : (
                <div className="border border-border rounded-lg bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2"><Eraser className="w-3.5 h-3.5 text-primary" /><h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Retouch</h3></div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Upload a source image above, then paint over the areas you want to retouch.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="border border-border rounded-lg bg-card p-3 space-y-2">
                <div className="flex items-center gap-2"><Palette className="w-3.5 h-3.5 text-primary" /><h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Skin Color</h3>{skinColor && <span className="ml-auto w-4 h-4 rounded-full border border-border" style={{ backgroundColor: skinColor }} />}</div>
                <ColorGrid colors={SKIN_COLORS} selected={skinColor} onSelect={setSkinColor} />
                <CustomColorInput value={skinColor} onChange={setSkinColor} />
              </div>
              <div className="border border-border rounded-lg bg-card p-3 space-y-2">
                <div className="flex items-center gap-2"><Scissors className="w-3.5 h-3.5 text-primary" /><h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Hair Color</h3>{hairColor && <span className="ml-auto w-4 h-4 rounded-full border border-border" style={{ backgroundColor: hairColor }} />}</div>
                <ColorGrid colors={HAIR_COLORS} selected={hairColor} onSelect={setHairColor} labels={HAIR_LABELS} />
                <CustomColorInput value={hairColor} onChange={setHairColor} />
                <div className="pt-1"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Or upload hair reference</label><ImageUpload label="" value={hairRefImage} onChange={setHairRefImage} /></div>
              </div>
              <div className="border border-border rounded-lg bg-card p-3 space-y-2">
                <div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-primary" /><h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Eye Color</h3>{eyeColor && <span className="ml-auto w-4 h-4 rounded-full border border-border" style={{ backgroundColor: eyeColor }} />}</div>
                <ColorGrid colors={EYE_COLORS} selected={eyeColor} onSelect={setEyeColor} labels={EYE_LABELS} />
                <CustomColorInput value={eyeColor} onChange={setEyeColor} />
                <div className="pt-1"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Or upload eye reference</label><ImageUpload label="" value={eyeRefImage} onChange={setEyeRefImage} /></div>
              </div>
            </>
          )}
        </div>
        <div className="p-3 border-t border-border">
          <button onClick={handleGenerate} disabled={isGenerating || !sourceImage || !hasChanges} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 glow-primary">
            {isGenerating ? (<><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'retouch' ? 'Retouching...' : 'Editing...'}</>) : (<><Wand2 className="w-4 h-4" /> {mode === 'retouch' ? 'Retouch Image' : 'Apply Changes'}</>)}
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">Results</h2><span className="text-[10px] text-muted-foreground font-mono">{results.length} edits</span></div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {results.length === 0 ? (
            <div className="h-full flex items-center justify-center"><div className="text-center space-y-2"><Wand2 className="w-8 h-8 text-muted-foreground/30 mx-auto" /><p className="text-sm text-muted-foreground">Upload an image and select changes to get started</p></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((r) => (
                <div key={r.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
                  <img src={r.imageUrl} alt="Edited result" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-background/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
