import { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Loader2 } from 'lucide-react';
import { CharacterConfig, GenerationSettings } from '@/types/studio';
import {
  getSettingsPresets,
  saveSettingsPreset,
  deleteSettingsPreset,
  SettingsPreset,
} from '@/data/presets';
import { toast } from 'sonner';

interface Props {
  characters: CharacterConfig[];
  settings: GenerationSettings;
  onLoad: (characters: CharacterConfig[], settings: GenerationSettings) => void;
}

export function SavedSettingsPanel({ characters, settings, onLoad }: Props) {
  const [presets, setPresets] = useState<SettingsPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await getSettingsPresets();
      setPresets(data);
    } catch (e: any) {
      toast.error('Failed to load settings presets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setSaving(true);
    try {
      await saveSettingsPreset(name.trim(), characters, settings);
      toast.success(`Saved "${name.trim()}"`);
      setName('');
      setShowInput(false);
      loadPresets();
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, presetName: string) => {
    try {
      await deleteSettingsPreset(id);
      toast.success(`Deleted "${presetName}"`);
      setPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  const handleLoad = (preset: SettingsPreset) => {
    onLoad(preset.characters as CharacterConfig[], preset.settings as GenerationSettings);
    toast.success(`Loaded "${preset.name}"`);
  };

  return (
    <div className="border border-border rounded-lg bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Saved Settings</span>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors"
        >
          <Save className="w-3 h-3" /> Save Current
        </button>
      </div>

      {showInput && (
        <div className="flex gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Preset name..."
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : presets.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-1">No saved settings yet</p>
      ) : (
        <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between group px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
            >
              <button
                onClick={() => handleLoad(preset)}
                className="flex-1 text-left text-xs text-foreground truncate"
              >
                {preset.name}
              </button>
              <button
                onClick={() => handleDelete(preset.id, preset.name)}
                className="touch-visible p-0.5 text-destructive hover:bg-destructive/10 rounded transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
