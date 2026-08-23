import { useState, useCallback, useRef } from 'react';
import { Plus, Wand2, Loader2, Trash2, RotateCcw, Users, Download, Upload, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CharacterConfig, GenerationSettings, GeneratedImage, createDefaultCharacter } from '@/types/studio';
import { CharacterPanel } from '@/components/studio/CharacterPanel';
import { GenerationSettingsPanel } from '@/components/studio/GenerationSettings';
import { GeneratedGallery } from '@/components/studio/GeneratedGallery';
import { SavedSettingsPanel } from '@/components/studio/SavedSettingsPanel';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { exportAllData, downloadJson, importAllData } from '@/lib/exportImport';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const defaultSettings: GenerationSettings = {
  model: 'google/gemini-3-pro-image',
  aspectRatio: 'auto',
  customAspectRatio: '',
  cameraAngle: 'auto',
  customCameraAngle: '',
  ultraPhotorealistic8k: false,
  backgroundImage: null,
  backgroundText: '',
  lighting: 'auto',
  skinDetail: 'auto',
  eyeDetail: 'auto',
  confineToBackground: false,
  recreateBackground: false,
  imageCount: 1,
  cameraQuality: 'none',
  scenePrompt: '',
  copyPoseAngle: false,
  poseOnlyMode: false,
};

export default function Index() {
  const [characters, setCharacters] = useState<CharacterConfig[]>([
    createDefaultCharacter(crypto.randomUUID(), 0),
  ]);
  const [settings, setSettings] = useState<GenerationSettings>(defaultSettings);
  const { isGenerating, generatingCount, generatedImages, generate, clearHistory } = useImageGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const tables = ['character_presets', 'pose_presets', 'clothing_presets', 'background_presets', 'face_presets', 'settings_presets'] as const;
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }
      localStorage.removeItem('studio_seed_applied');
      toast.success('All presets and characters cleared.');
    } catch (e: any) {
      toast.error(`Clear failed: ${e.message}`);
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  const addCharacter = useCallback(() => {
    if (characters.length >= 5) return;
    setCharacters((prev) => [...prev, createDefaultCharacter(crypto.randomUUID(), prev.length)]);
  }, [characters.length]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await exportAllData((msg) => toast.info(msg));
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(json, `studio-backup-${date}.json`);
      toast.success('Export complete! File downloaded.');
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const json = await file.text();
      const counts = await importAllData(json, (msg) => toast.info(msg));
      toast.success(
        `Imported ${counts.characters} characters, ${counts.poses} poses, ${counts.clothing} clothing, ${counts.backgrounds} backgrounds, ${counts.settingsPresets} settings`
      );
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCharacter = useCallback((id: string, updated: CharacterConfig) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const handleReprompt = useCallback((image: GeneratedImage) => {
    setCharacters(image.characters);
    setSettings(image.settings);
  }, []);

  const handleLoadSettings = useCallback((chars: CharacterConfig[], s: GenerationSettings) => {
    setCharacters(chars);
    setSettings(s);
  }, []);

  const handleGenerate = () => {
    const count = settings.imageCount || 1;
    for (let i = 0; i < count; i++) {
      generate(characters, settings);
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Sidebar - Controls */}
      <aside className="w-[340px] min-w-[340px] border-r border-border flex flex-col bg-card">
        {/* Logo */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">AI Photo Studio</h1>
              <p className="text-[10px] text-muted-foreground">Ultra-realistic image generation</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isExporting ? 'Exporting…' : 'Export'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExporting || isImporting}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isImporting ? 'Importing…' : 'Import'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
          {/* Generation Settings */}
          <div className="border border-border rounded-lg bg-card p-3">
            <GenerationSettingsPanel settings={settings} onChange={setSettings} />
          </div>

          {/* Characters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Characters</h2>
              {characters.length < 5 && (
                <button
                  onClick={addCharacter}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {characters.map((char) => (
              <CharacterPanel
                key={char.id}
                character={char}
                onChange={(updated) => updateCharacter(char.id, updated)}
                onRemove={() => removeCharacter(char.id)}
                canRemove={characters.length > 1}
                poseOnlyMode={settings.poseOnlyMode}
                onPoseOnlyModeChange={(v) => setSettings(s => ({ ...s, poseOnlyMode: v }))}
              />
            ))}
          </div>

          {/* Saved Settings */}
          <SavedSettingsPanel
            characters={characters}
            settings={settings}
            onLoad={handleLoadSettings}
          />

          {/* Scene Prompt - only shown with multiple characters */}
          {characters.length > 1 && (
            <div className="border border-border rounded-lg bg-card p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Scene Direction</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Describe how the characters interact or are positioned together.</p>
              <textarea
                value={settings.scenePrompt}
                onChange={(e) => setSettings({ ...settings, scenePrompt: e.target.value })}
                placeholder='e.g. "All characters squatting together" or "Person 1 standing behind Person 2"'
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={handleGenerate}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity glow-primary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin-slow" />
                Generating ({generatingCount})... Generate More
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Image
              </>
            )}
          </button>
          <button
            onClick={() => {
              setSettings(defaultSettings);
              setCharacters([createDefaultCharacter(crypto.randomUUID(), 0)]);
            }}
            className="w-full py-1.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset All Settings
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing}
            className="w-full py-1.5 rounded-lg bg-destructive/10 text-destructive font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-destructive/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" /> {isClearing ? 'Clearing…' : 'Clear All Presets & Characters'}
          </button>
        </div>

        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all saved characters, poses, clothing, faces, backgrounds, and settings presets. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, clear everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>

      {/* Main Area - Gallery */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Gallery</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono">{generatedImages.length} images</span>
            {generatedImages.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-semibold text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
        <GeneratedGallery images={generatedImages} onReprompt={handleReprompt} />
      </main>
    </div>
  );
}
