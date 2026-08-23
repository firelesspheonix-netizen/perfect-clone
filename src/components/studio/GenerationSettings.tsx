import { useState, useEffect, useCallback } from 'react';
import { Camera, Ratio, Sparkles, Sun, Eye, Scan, Loader2, Smartphone, Save, Images } from 'lucide-react';
import { AIModel, AspectRatio, CameraAngle, CameraQuality, LightingOption, DetailLevel, GenerationSettings as Settings } from '@/types/studio';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getBackgroundPresets, saveBackgroundPreset, deleteBackgroundPreset, BackgroundPreset, uploadDataUrlToStorage } from '@/data/presets';
import { ImageGalleryDialog } from './ImageGalleryDialog';

interface GenerationSettingsProps {
  settings: Settings;
  onChange: (s: Settings) => void;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '21:9', label: '21:9' },
  { value: '4:5', label: '4:5' },
  { value: '5:4', label: '5:4' },
  { value: '7:5', label: '7:5' },
  { value: '5:7', label: '5:7' },
  { value: 'custom', label: 'Custom' },
];

const CAMERA_ANGLES: { value: CameraAngle; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
  { value: 'over-shoulder', label: 'Over Shoulder' },
  { value: 'behind-close', label: 'Behind Close' },
  { value: 'low-angle', label: 'Low' },
  { value: 'high-angle', label: 'High' },
  { value: 'top-down', label: 'Top Down' },
  { value: 'dutch-angle', label: 'Dutch' },
  { value: 'custom', label: 'Custom' },
];

const LIGHTING_OPTIONS: { value: LightingOption; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'natural', label: 'Natural' },
  { value: 'studio', label: 'Studio' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'neon', label: 'Neon' },
  { value: 'soft', label: 'Soft' },
  { value: 'backlit', label: 'Backlit' },
  { value: 'candlelight', label: 'Candle' },
  { value: 'moody', label: 'Moody' },
];

const DETAIL_LEVELS: { value: DetailLevel; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'ultra', label: 'Ultra' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Med' },
  { value: 'low', label: 'Low' },
];

const MODELS: { value: AIModel; label: string; desc: string }[] = [
  { value: 'google/gemini-3-pro-image', label: 'Nano Banana Pro', desc: 'Highest quality' },
  { value: 'google/gemini-2.5-flash-image', label: 'Nano Banana', desc: 'Fast generation' },
  { value: 'google/gemini-3.1-flash-image', label: 'Nano Banana 2', desc: 'Fast + pro quality' },
];

function ChipSelector<T extends string>({ icon, label, options, value, onChange }: {
  icon: React.ReactNode;
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${
              value === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GenerationSettingsPanel({ settings, onChange }: GenerationSettingsProps) {
  const [isEnhancingBg, setIsEnhancingBg] = useState(false);
  const [showBgGallery, setShowBgGallery] = useState(false);
  const [bgPresets, setBgPresets] = useState<BackgroundPreset[]>([]);

  const refreshBgPresets = useCallback(() => { getBackgroundPresets().then(setBgPresets); }, []);
  useEffect(() => { refreshBgPresets(); }, [refreshBgPresets]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const enhanceBackground = async () => {
    if (!settings.backgroundImage) return;
    setIsEnhancingBg(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-face', {
        body: { imageData: settings.backgroundImage },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.imageUrl) {
        update('backgroundImage', data.imageUrl);
        toast.success('Background enhanced!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to enhance background');
    } finally {
      setIsEnhancingBg(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Model</label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {MODELS.map((m) => (
            <button
              key={m.value}
              onClick={() => update('model', m.value)}
              className={`p-2 rounded-lg text-left transition-all ${
                settings.model === m.value
                  ? 'bg-primary/15 border border-primary/40 glow-primary'
                  : 'bg-secondary border border-border hover:border-primary/30'
              }`}
            >
              <div className={`text-xs font-semibold ${settings.model === m.value ? 'text-primary' : 'text-foreground'}`}>{m.label}</div>
              <div className="text-[10px] text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <ChipSelector
        icon={<Ratio className="w-3.5 h-3.5 text-primary" />}
        label="Aspect Ratio"
        options={ASPECT_RATIOS}
        value={settings.aspectRatio}
        onChange={(v) => update('aspectRatio', v)}
      />
      {settings.aspectRatio === 'custom' && (
        <input
          className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
          placeholder="Type ratio e.g. 5:3, 8:5..."
          value={settings.customAspectRatio}
          onChange={(e) => update('customAspectRatio', e.target.value)}
        />
      )}

      <ChipSelector
        icon={<Camera className="w-3.5 h-3.5 text-primary" />}
        label="Camera Angle"
        options={CAMERA_ANGLES}
        value={settings.cameraAngle}
        onChange={(v) => update('cameraAngle', v)}
      />
      {settings.cameraAngle === 'custom' && (
        <input
          className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
          placeholder="Describe camera angle..."
          value={settings.customCameraAngle}
          onChange={(e) => update('customCameraAngle', e.target.value)}
        />
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.copyPoseAngle || false}
          onChange={(e) => update('copyPoseAngle', e.target.checked)}
          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
        />
        <span className="text-xs font-medium text-foreground">Copy camera angle from pose reference image</span>
      </label>

      {/* Photo Style */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photo Style</label>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.ultraPhotorealistic8k || false}
            onChange={(e) => update('ultraPhotorealistic8k', e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
          />
          <span className="text-xs font-medium text-foreground">8k ultra photorealistic</span>
        </label>
      </div>

      <ChipSelector
        icon={<Sun className="w-3.5 h-3.5 text-primary" />}
        label="Lighting"
        options={LIGHTING_OPTIONS}
        value={settings.lighting}
        onChange={(v) => update('lighting', v)}
      />

      {/* Low Camera Quality */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={settings.cameraQuality !== 'none'}
            onChange={(e) => update('cameraQuality', e.target.checked ? 'standard-phone' : 'none')}
            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
          />
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Camera Quality</label>
        </div>
        {settings.cameraQuality !== 'none' && (
          <div className="flex flex-wrap gap-1">
            {([
              { value: 'standard-phone' as CameraQuality, label: 'Standard Phone' },
              { value: 'old-phone' as CameraQuality, label: 'Old Phone' },
              { value: 'webcam' as CameraQuality, label: 'Webcam' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => update('cameraQuality', opt.value)}
                className={`px-2 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${
                  settings.cameraQuality === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ChipSelector
        icon={<Scan className="w-3.5 h-3.5 text-primary" />}
        label="Skin Detail"
        options={DETAIL_LEVELS}
        value={settings.skinDetail}
        onChange={(v) => update('skinDetail', v)}
      />

      <ChipSelector
        icon={<Eye className="w-3.5 h-3.5 text-primary" />}
        label="Eye Detail"
        options={DETAIL_LEVELS}
        value={settings.eyeDetail}
        onChange={(v) => update('eyeDetail', v)}
      />

      <ImageUpload label="Background Image" value={settings.backgroundImage} onChange={(v) => update('backgroundImage', v)} />
      {settings.backgroundImage && (
        <div className="space-y-2">
          <button
            onClick={enhanceBackground}
            disabled={isEnhancingBg}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isEnhancingBg ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Enhancing...</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Enhance Background (HD)</>
            )}
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.confineToBackground}
              onChange={(e) => update('confineToBackground', e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span className="text-xs font-medium text-foreground">Confine character to background (no extending/zooming out)</span>
          </label>
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Background Description</label>
        <input
          className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
          placeholder="Describe background... e.g. 'Tropical beach at sunset'"
          value={settings.backgroundText}
          onChange={(e) => update('backgroundText', e.target.value)}
        />
      </div>

      <div className="flex gap-1">
        <button onClick={async () => {
          if (!settings.backgroundImage) { toast.error('Upload a background image first'); return; }
          let url = settings.backgroundImage;
          if (url.startsWith('data:')) url = await uploadDataUrlToStorage(url);
          await saveBackgroundPreset(url, settings.backgroundText);
          refreshBgPresets();
          toast.success('Background saved!');
        }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Save className="w-3 h-3" /> Save Current BG
        </button>
        <button onClick={() => { refreshBgPresets(); setShowBgGallery(true); }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Images className="w-3 h-3" /> Browse BGs ({bgPresets.length})
        </button>
      </div>
      <ImageGalleryDialog
        open={showBgGallery}
        onClose={() => setShowBgGallery(false)}
        title="Saved Backgrounds"
        items={bgPresets.filter(p => p.image_url).map(p => ({ id: p.id, image: p.image_url!, label: p.description }))}
        onSelect={(item) => {
          const preset = bgPresets.find(p => p.id === item.id);
          if (preset) {
            onChange({ ...settings, backgroundImage: preset.image_url, backgroundText: preset.description });
            toast.success('Background loaded!');
          }
          setShowBgGallery(false);
        }}
        onDelete={async (id) => { await deleteBackgroundPreset(id); refreshBgPresets(); }}
        onBulkUpload={async (imageUrls) => {
          for (const url of imageUrls) {
            await saveBackgroundPreset(url, '');
          }
          refreshBgPresets();
          toast.success(`${imageUrls.length} background(s) uploaded!`);
        }}
      />

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Images to Generate</label>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => update('imageCount', n)}
              className={`flex-1 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${
                (settings.imageCount || 1) === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
