import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, User, Sparkles, Download, Loader2, Palette, Ruler, Shirt, Footprints, Hand, Save, FolderOpen, Images } from 'lucide-react';
import { CharacterConfig, BodySize, ExpressionPreset, HairstyleOption, PosePreset, Prop, SkinTone, DistinguishingMark, FootType, FootLength, HandConfig, FingerLength, NailLength } from '@/types/studio';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  getCharacterPresets, saveCharacterPreset, deleteCharacterPreset, characterToPreset, applyCharacterPreset,
  getPosePresets, savePosePreset, deletePosePreset, PosePresetSaved,
  getClothingPresets, saveClothingPreset, deleteClothingPreset, ClothingPreset,
  getFacePresets, saveFacePreset, deleteFacePreset, FacePreset,
  CharacterPreset, uploadDataUrlToStorage,
} from '@/data/presets';
import { ImageGalleryDialog, GalleryItem } from './ImageGalleryDialog';

interface CharacterPanelProps {
  character: CharacterConfig;
  onChange: (updated: CharacterConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
  poseOnlyMode?: boolean;
  onPoseOnlyModeChange?: (v: boolean) => void;
}

const BODY_SIZES: BodySize[] = ['extra-small', 'small', 'medium', 'large', 'extra-large', 'extra-extra-large'];
const EXPRESSIONS: { value: ExpressionPreset; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'smiling', label: 'Smiling' },
  { value: 'angry', label: 'Angry' },
  { value: 'horny', label: 'Seductive' },
  { value: 'custom', label: 'Custom' },
];

const POSE_PRESETS: { value: PosePreset; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'standing', label: 'Standing' },
  { value: 'sitting', label: 'Sitting' },
  { value: 'lying-down', label: 'Lying Down' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'crawling', label: 'Crawling' },
  { value: 'squatting', label: 'Squatting' },
  { value: 'leaning', label: 'Leaning' },
  { value: 'arched-back', label: 'Arched Back' },
  { value: 'on-all-fours', label: 'All Fours' },
  { value: 'side-lying', label: 'Side Lying' },
  { value: 'bent-over', label: 'Bent Over' },
  { value: 'looking-back', label: 'Looking Back' },
  { value: 'hands-and-knees', label: 'Hands & Knees' },
  { value: 'custom', label: 'Custom' },
];

const SKIN_TONE_COLORS = [
  '#FDEBD0', '#FCD5A8', '#F5C49C', '#E8B48A', '#D4A574',
  '#C4956A', '#A67B5B', '#8D6748', '#6F4E37', '#5C3D2E', '#3B2417',
];

const SKIN_TONE_LABELS: Record<number, string> = {
  0: 'very fair/porcelain white', 1: 'fair/light', 2: 'light peach', 3: 'light tan',
  4: 'medium light', 5: 'medium/olive', 6: 'medium tan', 7: 'tan/brown',
  8: 'medium dark brown', 9: 'dark brown', 10: 'very dark/deep brown',
};

const FOOT_TYPES: { value: FootType; label: string; description: string; svg: React.ReactNode }[] = [
  {
    value: 'egyptian', label: 'Egyptian', description: 'Big toe is longest, toes descend in order',
    svg: (<><ellipse cx="8" cy="14" rx="3.5" ry="6" /><ellipse cx="15" cy="16" rx="3" ry="5" /><ellipse cx="21" cy="18" rx="2.8" ry="4.5" /><ellipse cx="27" cy="20" rx="2.5" ry="4" /><ellipse cx="32" cy="22" rx="2.2" ry="3.5" /><path d="M4 20 Q4 50 20 55 Q36 50 36 24" /></>),
  },
  {
    value: 'roman', label: 'Roman', description: 'First three toes are roughly the same length',
    svg: (<><ellipse cx="8" cy="15" rx="3.5" ry="5.5" /><ellipse cx="15" cy="15" rx="3" ry="5.5" /><ellipse cx="21" cy="15" rx="2.8" ry="5.5" /><ellipse cx="27" cy="20" rx="2.5" ry="4" /><ellipse cx="32" cy="22" rx="2.2" ry="3.5" /><path d="M4 20 Q4 50 20 55 Q36 50 36 24" /></>),
  },
  {
    value: 'greek', label: 'Greek', description: 'Second toe extends beyond the big toe',
    svg: (<><ellipse cx="8" cy="16" rx="3.5" ry="5" /><ellipse cx="15" cy="12" rx="3" ry="6.5" /><ellipse cx="21" cy="17" rx="2.8" ry="4.5" /><ellipse cx="27" cy="20" rx="2.5" ry="4" /><ellipse cx="32" cy="22" rx="2.2" ry="3.5" /><path d="M4 20 Q4 50 20 55 Q36 50 36 24" /></>),
  },
  {
    value: 'germanic', label: 'Germanic', description: 'Big toe is prominent, other toes are equal',
    svg: (<><ellipse cx="8" cy="13" rx="4" ry="6.5" /><ellipse cx="15" cy="18" rx="3" ry="4.5" /><ellipse cx="21" cy="18" rx="2.8" ry="4.5" /><ellipse cx="27" cy="18" rx="2.5" ry="4.5" /><ellipse cx="32" cy="18" rx="2.2" ry="4.5" /><path d="M4 20 Q4 50 20 55 Q36 50 36 22" /></>),
  },
  {
    value: 'celtic', label: 'Celtic', description: 'Second toe longest, others vary in length',
    svg: (<><ellipse cx="8" cy="17" rx="3.5" ry="4.5" /><ellipse cx="15" cy="12" rx="3" ry="6.5" /><ellipse cx="21" cy="16" rx="2.8" ry="5" /><ellipse cx="27" cy="19" rx="2.5" ry="4" /><ellipse cx="32" cy="17" rx="2.2" ry="5" /><path d="M4 21 Q4 50 20 55 Q36 50 36 22" /></>),
  },
];

function SizeSelector({ label, value, onChange }: { label: string; value: BodySize; onChange: (v: BodySize) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex gap-1">
        {BODY_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex-1 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${
              value === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {s === 'extra-extra-large' ? 'XXL' : s === 'extra-large' ? 'XL' : s === 'extra-small' ? 'XS' : s[0].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

export function CharacterPanel({ character, onChange, onRemove, canRemove, poseOnlyMode, onPoseOnlyModeChange }: CharacterPanelProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [propsExpanded, setPropsExpanded] = useState(false);
  const [marksExpanded, setMarksExpanded] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedFace, setEnhancedFace] = useState<string | null>(null);
  const [showSaveChar, setShowSaveChar] = useState(false);
  const [saveCharName, setSaveCharName] = useState('');
  const [showCharGallery, setShowCharGallery] = useState(false);
  const [charPresets, setCharPresets] = useState<CharacterPreset[]>([]);
  const [showPoseGallery, setShowPoseGallery] = useState(false);
  const [posePresets, setPosePresets] = useState<PosePresetSaved[]>([]);
  const [showClothingGallery, setShowClothingGallery] = useState(false);
  const [clothingPresets, setClothingPresets] = useState<ClothingPreset[]>([]);
  const [showFaceGallery, setShowFaceGallery] = useState(false);
  const [facePresets, setFacePresets] = useState<FacePreset[]>([]);

  const refreshCharPresets = useCallback(() => { getCharacterPresets().then(setCharPresets); }, []);
  const refreshPosePresets = useCallback(() => { getPosePresets().then(setPosePresets); }, []);
  const refreshClothingPresets = useCallback(() => { getClothingPresets().then(setClothingPresets); }, []);
  const refreshFacePresets = useCallback(() => { getFacePresets().then(setFacePresets); }, []);

  useEffect(() => {
    refreshCharPresets();
    refreshPosePresets();
    refreshClothingPresets();
    refreshFacePresets();
  }, [refreshCharPresets, refreshPosePresets, refreshClothingPresets, refreshFacePresets]);

  const enhanceFace = async () => {
    if (!character.faceImage) return;
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-face', {
        body: { imageData: character.faceImage },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.imageUrl) {
        setEnhancedFace(data.imageUrl);
        toast.success('Face enhanced! You can download or use it as reference.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to enhance face');
    } finally {
      setIsEnhancing(false);
    }
  };

  const downloadEnhancedFace = () => {
    if (!enhancedFace) return;
    const link = document.createElement('a');
    link.href = enhancedFace;
    link.download = `enhanced-face-${Date.now()}.png`;
    link.click();
  };

  const useEnhancedAsFace = () => {
    if (!enhancedFace) return;
    update('faceImage', enhancedFace);
    setEnhancedFace(null);
    toast.success('Enhanced face set as reference!');
  };

  const update = <K extends keyof CharacterConfig>(key: K, value: CharacterConfig[K]) => {
    onChange({ ...character, [key]: value });
  };

  const addProp = () => {
    const prop: Prop = { id: crypto.randomUUID(), name: '', imageData: null, placement: '' };
    update('props', [...character.props, prop]);
    setPropsExpanded(true);
  };

  const updateProp = (id: string, changes: Partial<Prop>) => {
    update('props', character.props.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  };

  const removeProp = (id: string) => {
    update('props', character.props.filter((p) => p.id !== id));
  };

  const addMark = () => {
    const mark: DistinguishingMark = { id: crypto.randomUUID(), type: 'tattoo', description: '', imageData: null };
    update('distinguishingMarks', [...character.distinguishingMarks, mark]);
    setMarksExpanded(true);
  };

  const updateMark = (id: string, changes: Partial<DistinguishingMark>) => {
    update('distinguishingMarks', character.distinguishingMarks.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  };

  const removeMark = (id: string) => {
    update('distinguishingMarks', character.distinguishingMarks.filter((m) => m.id !== id));
  };

  const formatHeight = (inches: number) => {
    const ft = Math.floor(inches / 12);
    const inc = inches % 12;
    return `${ft}'${inc}"`;
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden animate-fade-in">
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        <User className="w-3.5 h-3.5 text-primary" />
        <input
          className="bg-transparent text-sm font-semibold text-foreground flex-1 outline-none"
          value={character.label}
          onChange={(e) => update('label', e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        {character.faceImage && (
          <img src={character.faceImage} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
        )}
        {canRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 hover:bg-destructive/20 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Save / Load Character Preset */}
          <div className="flex gap-1">
            <button onClick={() => { setShowSaveChar(!showSaveChar); }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Save className="w-3 h-3" /> Save Character
            </button>
            <button onClick={() => { refreshCharPresets(); setShowCharGallery(true); }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <FolderOpen className="w-3 h-3" /> Load Character ({charPresets.length})
            </button>
          </div>
          {showSaveChar && (
            <div className="flex gap-1">
              <input
                autoFocus
                className="flex-1 bg-secondary border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter preset name..."
                value={saveCharName}
                onChange={(e) => setSaveCharName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && saveCharName.trim()) {
                    const p = characterToPreset(saveCharName.trim(), character);
                    // Upload face image to storage if it's a data URL
                    if (p.face_url && p.face_url.startsWith('data:')) {
                      p.face_url = await uploadDataUrlToStorage(p.face_url);
                    }
                    await saveCharacterPreset(p);
                    refreshCharPresets();
                    toast.success(`Character "${saveCharName}" saved!`);
                    setSaveCharName('');
                    setShowSaveChar(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={async () => {
                  if (!saveCharName.trim()) { toast.error('Enter a name for the preset'); return; }
                  await saveCharacterPreset(characterToPreset(saveCharName.trim(), character));
                  refreshCharPresets();
                  toast.success(`Character "${saveCharName}" saved!`);
                  setSaveCharName('');
                  setShowSaveChar(false);
                }}
                className="px-3 py-1 text-[10px] font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          )}
          {/* Character Gallery Dialog */}
          <ImageGalleryDialog
            open={showCharGallery}
            onClose={() => setShowCharGallery(false)}
            title="Saved Characters"
            items={charPresets.map(p => ({ id: p.id, image: p.character.faceImage || '', label: p.name }))}
            onSelect={(item) => {
              const preset = charPresets.find(p => p.id === item.id);
              if (preset) {
                onChange(applyCharacterPreset(preset, character));
                toast.success(`Loaded "${preset.name}"`);
              }
              setShowCharGallery(false);
            }}
            onDelete={async (id) => { await deleteCharacterPreset(id); refreshCharPresets(); }}
            onBulkUpload={() => {}}
            hideUpload
          />

          <div className="grid grid-cols-2 gap-2">
            <ImageUpload label="Face (Front)" value={character.faceImage} onChange={(v) => { update('faceImage', v); setEnhancedFace(null); }} />
            <ImageUpload label="Face (Side)" value={character.sideProfileImage} onChange={(v) => update('sideProfileImage', v)} />
          </div>
          <div className="flex gap-1">
            <button onClick={async () => {
              if (!character.faceImage) { toast.error('Upload a face image first'); return; }
              let url = character.faceImage;
              if (url.startsWith('data:')) url = await uploadDataUrlToStorage(url);
              await saveFacePreset(url);
              refreshFacePresets();
              toast.success('Face saved!');
            }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Save className="w-3 h-3" /> Save Face
            </button>
            <button onClick={() => { refreshFacePresets(); setShowFaceGallery(true); }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Images className="w-3 h-3" /> Browse Faces ({facePresets.length})
            </button>
          </div>
          <ImageGalleryDialog
            open={showFaceGallery}
            onClose={() => setShowFaceGallery(false)}
            title="Saved Faces"
            items={facePresets.map(p => ({ id: p.id, image: p.image_url }))}
            onSelect={(item) => {
              const preset = facePresets.find(p => p.id === item.id);
              if (preset) {
                update('faceImage', preset.image_url);
                toast.success('Face loaded!');
              }
              setShowFaceGallery(false);
            }}
            onDelete={async (id) => { await deleteFacePreset(id); refreshFacePresets(); }}
            onBulkUpload={async (imageUrls) => {
              for (const url of imageUrls) {
                await saveFacePreset(url);
              }
              refreshFacePresets();
              toast.success(`${imageUrls.length} face image(s) uploaded!`);
            }}
          />

          {character.faceImage && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Face Refs</label>
                {(character.additionalFaceImages?.length || 0) < 4 && (
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          update('additionalFaceImages', [...(character.additionalFaceImages || []), result]);
                        };
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              {character.additionalFaceImages && character.additionalFaceImages.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {character.additionalFaceImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} alt={`Face ref ${idx + 2}`} className="w-12 h-12 rounded-md object-cover border border-border" />
                      <button
                        onClick={() => update('additionalFaceImages', character.additionalFaceImages.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[9px] text-muted-foreground">Add more angles for better accuracy (max 4)</p>
            </div>
          )}

          {/* Clothing Section with Gallery */}
          <div className="grid grid-cols-2 gap-2">
            <ImageUpload label="Clothing" value={character.clothingImage} onChange={(v) => update('clothingImage', v)} />
          </div>
          <div className="flex gap-1">
            <button onClick={async () => {
              if (!character.clothingImage) { toast.error('Upload a clothing image first'); return; }
              let url = character.clothingImage;
              if (url.startsWith('data:')) url = await uploadDataUrlToStorage(url);
              await saveClothingPreset(url);
              refreshClothingPresets();
              toast.success('Clothing saved!');
            }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Save className="w-3 h-3" /> Save Clothing
            </button>
            <button onClick={() => { refreshClothingPresets(); setShowClothingGallery(true); }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Images className="w-3 h-3" /> Browse Clothing ({clothingPresets.length})
            </button>
          </div>
          <ImageGalleryDialog
            open={showClothingGallery}
            onClose={() => setShowClothingGallery(false)}
            title="Saved Clothing"
            items={clothingPresets.map(p => ({ id: p.id, image: p.image_url }))}
            onSelect={(item) => {
              const preset = clothingPresets.find(p => p.id === item.id);
              if (preset) {
                update('clothingImage', preset.image_url);
                toast.success('Clothing loaded!');
              }
              setShowClothingGallery(false);
            }}
            onDelete={async (id) => { await deleteClothingPreset(id); refreshClothingPresets(); }}
            onBulkUpload={async (imageUrls) => {
              for (const url of imageUrls) {
                await saveClothingPreset(url);
              }
              refreshClothingPresets();
              toast.success(`${imageUrls.length} clothing image(s) uploaded!`);
            }}
          />

          {character.faceImage && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={character.preserveExactHead}
                onChange={(e) => update('preserveExactHead', e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="text-xs font-medium text-foreground">Preserve exact head & face (full body)</span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={character.lookingAtViewer}
              onChange={(e) => update('lookingAtViewer', e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span className="text-xs font-medium text-foreground">Looking at viewer (eye contact)</span>
          </label>
          {character.faceImage && (
            <div className="space-y-2">
              <button
                onClick={enhanceFace}
                disabled={isEnhancing}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isEnhancing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Enhancing...</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> Enhance Face (HD)</>
                )}
              </button>
              {enhancedFace && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enhanced Result</label>
                    <button onClick={() => setEnhancedFace(null)} className="p-0.5 hover:bg-destructive/20 rounded transition-colors">
                      <XIcon className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={enhancedFace} alt="Enhanced face" className="w-full h-32 object-cover" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={useEnhancedAsFace}
                      className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90"
                    >
                      <Sparkles className="w-3 h-3" /> Use as Face
                    </button>
                    <button
                      onClick={downloadEnhancedFace}
                      className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clothing Description</label>
            <input
              className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
              placeholder="Describe clothing... e.g. 'Red cocktail dress with heels'"
              value={character.clothingText}
              onChange={(e) => update('clothingText', e.target.value)}
            />
          </div>

          {/* Pose Reference Image with Gallery */}
          <ImageUpload label="Pose Reference" value={character.poseReferenceImage} onChange={(v) => update('poseReferenceImage', v)} />
          <div className="flex gap-1">
            <button onClick={async () => {
              if (!character.poseReferenceImage) { toast.error('Upload a pose reference image first'); return; }
              let url = character.poseReferenceImage;
              if (url.startsWith('data:')) url = await uploadDataUrlToStorage(url);
              await savePosePreset(url);
              refreshPosePresets();
              toast.success('Pose image saved!');
            }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Save className="w-3 h-3" /> Save Pose Image
            </button>
            <button onClick={() => { refreshPosePresets(); setShowPoseGallery(true); }} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Images className="w-3 h-3" /> Browse Poses ({posePresets.length})
            </button>
          </div>
          <ImageGalleryDialog
            open={showPoseGallery}
            onClose={() => setShowPoseGallery(false)}
            title="Saved Pose Images"
            items={posePresets.map(p => ({ id: p.id, image: p.image_url }))}
            onSelect={(item) => {
              const preset = posePresets.find(p => p.id === item.id);
              if (preset) {
                update('poseReferenceImage', preset.image_url);
                toast.success('Pose image loaded!');
              }
              setShowPoseGallery(false);
            }}
            onDelete={async (id) => { await deletePosePreset(id); refreshPosePresets(); }}
            onBulkUpload={async (imageUrls) => {
              for (const url of imageUrls) {
                await savePosePreset(url);
              }
              refreshPosePresets();
              toast.success(`${imageUrls.length} pose image(s) uploaded!`);
            }}
          />
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={poseOnlyMode || false}
              onChange={(e) => onPoseOnlyModeChange?.(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span className="text-xs font-medium text-muted-foreground">Pose only (ignore body shape/size from pose image)</span>
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hairstyle</label>
            <div className="flex gap-1">
              {(['default', 'custom-text', 'custom-image'] as HairstyleOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => update('hairstyleOption', opt)}
                  className={`flex-1 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${
                    character.hairstyleOption === opt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {opt === 'default' ? 'Keep' : opt === 'custom-text' ? 'Type' : 'Image'}
                </button>
              ))}
            </div>
            {character.hairstyleOption === 'custom-text' && (
              <input
                className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                placeholder="Describe hairstyle..."
                value={character.hairstyleText}
                onChange={(e) => update('hairstyleText', e.target.value)}
              />
            )}
            {character.hairstyleOption === 'custom-image' && (
              <ImageUpload label="" value={character.hairstyleImage} onChange={(v) => update('hairstyleImage', v)} />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SizeSelector label="Chest" value={character.chestSize} onChange={(v) => update('chestSize', v)} />
            <SizeSelector label="Butt" value={character.buttSize} onChange={(v) => update('buttSize', v)} />
            <SizeSelector label="Stomach" value={character.stomachSize} onChange={(v) => update('stomachSize', v)} />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={character.heightEnabled} onChange={(e) => update('heightEnabled', e.target.checked)} className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Ruler className="w-3 h-3" /> Specify Height</span>
            </label>
            {character.heightEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground w-10">{formatHeight(character.height)}</span>
                  <input type="range" min={48} max={78} step={1} value={character.height} onChange={(e) => update('height', Number(e.target.value))} className="flex-1 h-2 appearance-none rounded-full cursor-pointer bg-secondary" />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground"><span>4'0"</span><span>5'3"</span><span>6'6"</span></div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={character.footSizeEnabled} onChange={(e) => update('footSizeEnabled', e.target.checked)} className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Footprints className="w-3 h-3" /> Specify Foot Size</span>
            </label>
            {character.footSizeEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground w-10">UK {character.footSize}</span>
                  <input type="range" min={1} max={14} step={0.5} value={character.footSize} onChange={(e) => update('footSize', Number(e.target.value))} className="flex-1 h-2 appearance-none rounded-full cursor-pointer bg-secondary" />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground"><span>UK 1</span><span>UK 7</span><span>UK 14</span></div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2 block">Foot Shape</label>
                <div className="grid grid-cols-5 gap-1">
                  {FOOT_TYPES.map((ft) => (
                    <button key={ft.value} onClick={() => update('footType', ft.value)} className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-md transition-colors ${character.footType === ft.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`} title={ft.description}>
                      <svg viewBox="0 0 40 60" className="w-7 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{ft.svg}</svg>
                      <span className="text-[8px] font-semibold uppercase leading-tight">{ft.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground">{FOOT_TYPES.find(f => f.value === character.footType)?.description}</p>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2 block">Foot Length</label>
                <div className="flex gap-1">
                  {(['short', 'average', 'long'] as FootLength[]).map((fl) => (
                    <button key={fl} onClick={() => update('footLength', fl)} className={`flex-1 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${character.footLength === fl ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{fl}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={character.hands.enabled} onChange={(e) => update('hands', { ...character.hands, enabled: e.target.checked })} className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Hand className="w-3 h-3" /> Specify Hands</span>
            </label>
            {character.hands.enabled && (
              <div className="space-y-2 pl-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Finger Length</label>
                  <div className="flex gap-1">
                    {(['short', 'average', 'long'] as FingerLength[]).map((fl) => (
                      <button key={fl} onClick={() => update('hands', { ...character.hands, fingerLength: fl })} className={`flex-1 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${character.hands.fingerLength === fl ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{fl}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nail Length</label>
                  <div className="flex gap-1">
                    {(['short', 'medium', 'long'] as NailLength[]).map((nl) => (
                      <button key={nl} onClick={() => update('hands', { ...character.hands, nailLength: nl })} className={`flex-1 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${character.hands.nailLength === nl ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{nl}</button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={character.hands.nailPolish} onChange={(e) => update('hands', { ...character.hands, nailPolish: e.target.checked })} className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5" />
                  <span className="text-xs font-medium text-foreground">Nail Polish</span>
                </label>
                {character.hands.nailPolish && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Color</label>
                    <input type="color" value={character.hands.nailPolishColor} onChange={(e) => update('hands', { ...character.hands, nailPolishColor: e.target.value })} className="w-6 h-6 rounded border border-border cursor-pointer" />
                    <span className="text-[10px] font-mono text-muted-foreground">{character.hands.nailPolishColor}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skin Tone</label>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: SKIN_TONE_COLORS[character.skinTone] }} />
              <input type="range" min={0} max={10} step={1} value={character.skinTone} onChange={(e) => update('skinTone', Number(e.target.value) as SkinTone)} className="flex-1 h-2 appearance-none rounded-full cursor-pointer" style={{ background: `linear-gradient(to right, ${SKIN_TONE_COLORS.join(', ')})` }} />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground"><span>Fair</span><span>Medium</span><span>Dark</span></div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => navigate('/appearance')} className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Palette className="w-3 h-3" /> Appearance Editor
            </button>
            <button onClick={() => navigate('/clothing')} className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Shirt className="w-3 h-3" /> Clothing Editor
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expression</label>
            <div className="flex flex-wrap gap-1">
              {EXPRESSIONS.map((exp) => (
                <button key={exp.value} onClick={() => update('expressionPreset', exp.value)} className={`px-2 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${character.expressionPreset === exp.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{exp.label}</button>
              ))}
            </div>
            {character.expressionPreset === 'custom' && (
              <input className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" placeholder="Describe expression..." value={character.customExpression} onChange={(e) => update('customExpression', e.target.value)} />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pose Preset</label>
            <div className="flex flex-wrap gap-1">
              {POSE_PRESETS.map((p) => (
                <button key={p.value} onClick={() => update('posePreset', p.value)} className={`px-2 py-1 text-[10px] uppercase rounded-md transition-colors font-medium ${character.posePreset === p.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{p.label}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Action / Pose Description</label>
            <textarea className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary resize-none" rows={2} placeholder="What is this person doing? e.g. 'Standing with arms crossed, looking at Person 2'" value={character.actionPrompt} onChange={(e) => update('actionPrompt', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setPropsExpanded(!propsExpanded)}>
              {propsExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer">Props ({character.props.length})</label>
              <button onClick={(e) => { e.stopPropagation(); addProp(); }} className="ml-auto p-0.5 hover:bg-secondary rounded transition-colors"><Plus className="w-3 h-3 text-primary" /></button>
            </div>
            {propsExpanded && character.props.map((prop) => (
              <div key={prop.id} className="flex gap-2 items-start bg-secondary/50 rounded-md p-2">
                <ImageUpload label="" value={prop.imageData} onChange={(v) => updateProp(prop.id, { imageData: v })} compact />
                <div className="flex-1 space-y-1">
                  <input className="w-full bg-secondary border border-border rounded px-1.5 py-1 text-[11px] text-foreground outline-none" placeholder="Prop name (e.g. Sunglasses)" value={prop.name} onChange={(e) => updateProp(prop.id, { name: e.target.value })} />
                  <input className="w-full bg-secondary border border-border rounded px-1.5 py-1 text-[11px] text-foreground outline-none" placeholder="Placement (e.g. on face, left hand)" value={prop.placement} onChange={(e) => updateProp(prop.id, { placement: e.target.value })} />
                </div>
                <button onClick={() => removeProp(prop.id)} className="p-0.5 hover:bg-destructive/20 rounded"><XIcon className="w-3 h-3 text-destructive" /></button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setMarksExpanded(!marksExpanded)}>
              {marksExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer">Marks / Tattoos ({character.distinguishingMarks.length})</label>
              <button onClick={(e) => { e.stopPropagation(); addMark(); }} className="ml-auto p-0.5 hover:bg-secondary rounded transition-colors"><Plus className="w-3 h-3 text-primary" /></button>
            </div>
            {marksExpanded && character.distinguishingMarks.map((mark) => (
              <div key={mark.id} className="flex gap-2 items-start bg-secondary/50 rounded-md p-2">
                <ImageUpload label="" value={mark.imageData} onChange={(v) => updateMark(mark.id, { imageData: v })} compact />
                <div className="flex-1 space-y-1">
                  <select className="w-full bg-secondary border border-border rounded px-1.5 py-1 text-[11px] text-foreground outline-none" value={mark.type} onChange={(e) => updateMark(mark.id, { type: e.target.value as DistinguishingMark['type'] })}>
                    <option value="tattoo">Tattoo</option>
                    <option value="birthmark">Birthmark</option>
                    <option value="scar">Scar</option>
                    <option value="piercing">Piercing</option>
                    <option value="other">Other</option>
                  </select>
                  <input className="w-full bg-secondary border border-border rounded px-1.5 py-1 text-[11px] text-foreground outline-none" placeholder="Description (e.g. dragon tattoo, heart-shaped birthmark)" value={mark.description} onChange={(e) => updateMark(mark.id, { description: e.target.value })} />
                </div>
                <button onClick={() => removeMark(mark.id)} className="p-0.5 hover:bg-destructive/20 rounded"><XIcon className="w-3 h-3 text-destructive" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
