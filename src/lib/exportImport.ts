import {
  getCharacterPresets,
  getPosePresets,
  getClothingPresets,
  getBackgroundPresets,
  getSettingsPresets,
  saveCharacterPreset,
  savePosePreset,
  saveClothingPreset,
  saveBackgroundPreset,
  saveSettingsPreset,
  uploadDataUrlToStorage,
  CharacterPreset,
  PosePresetSaved,
  ClothingPreset,
  BackgroundPreset,
  SettingsPreset,
} from '@/data/presets';

interface ExportBundle {
  version: 2;
  exportedAt: string;
  characters: (CharacterPreset & { faceDataUrl?: string; characterImages?: Record<string, string> })[];
  poses: (PosePresetSaved & { imageDataUrl?: string })[];
  clothing: (ClothingPreset & { imageDataUrl?: string })[];
  backgrounds: (BackgroundPreset & { imageDataUrl?: string })[];
  settingsPresets: SettingsPreset[];
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportAllData(onProgress?: (msg: string) => void): Promise<string> {
  onProgress?.('Loading presets from database...');

  const [characters, poses, clothing, backgrounds, settingsPresets] = await Promise.all([
    getCharacterPresets(),
    getPosePresets(),
    getClothingPresets(),
    getBackgroundPresets(),
    getSettingsPresets(),
  ]);

  onProgress?.(`Embedding images for ${characters.length} characters...`);
  const charsWithImages = await Promise.all(
    characters.map(async (c) => {
      const faceDataUrl = c.face_url ? (await urlToDataUrl(c.face_url)) ?? undefined : undefined;
      const imageKeys = [
        'faceImage', 'sideProfileImage', 'hairstyleImage',
        'hairColorImage', 'eyeColorImage',
      ] as const;
      const characterImages: Record<string, string> = {};
      for (const key of imageKeys) {
        const url = c.character[key];
        if (url) {
          const dataUrl = await urlToDataUrl(url);
          if (dataUrl) characterImages[key] = dataUrl;
        }
      }
      if (c.character.additionalFaceImages?.length) {
        for (let i = 0; i < c.character.additionalFaceImages.length; i++) {
          const dataUrl = await urlToDataUrl(c.character.additionalFaceImages[i]);
          if (dataUrl) characterImages[`additionalFace_${i}`] = dataUrl;
        }
      }
      return { ...c, faceDataUrl, characterImages };
    })
  );

  onProgress?.(`Embedding images for ${poses.length} poses...`);
  const posesWithImages = await Promise.all(
    poses.map(async (p) => ({
      ...p,
      imageDataUrl: (await urlToDataUrl(p.image_url)) ?? undefined,
    }))
  );

  onProgress?.(`Embedding images for ${clothing.length} clothing items...`);
  const clothingWithImages = await Promise.all(
    clothing.map(async (c) => ({
      ...c,
      imageDataUrl: (await urlToDataUrl(c.image_url)) ?? undefined,
    }))
  );

  onProgress?.(`Embedding images for ${backgrounds.length} backgrounds...`);
  const backgroundsWithImages = await Promise.all(
    backgrounds.map(async (b) => ({
      ...b,
      imageDataUrl: b.image_url ? (await urlToDataUrl(b.image_url)) ?? undefined : undefined,
    }))
  );

  const bundle: ExportBundle = {
    version: 2,
    exportedAt: new Date().toISOString(),
    characters: charsWithImages,
    poses: posesWithImages,
    clothing: clothingWithImages,
    backgrounds: backgroundsWithImages,
    settingsPresets,
  };

  onProgress?.('Creating file...');
  return JSON.stringify(bundle);
}

export function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CHECKPOINT_KEY = 'studio_import_checkpoint';

type Section = 'characters' | 'clothing' | 'backgrounds' | 'poses' | 'settings';

interface Checkpoint {
  hash: string;
  progress: Record<Section, number>;
  counts: { characters: number; poses: number; clothing: number; backgrounds: number; settingsPresets: number };
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loadCheckpoint(hash: string): Checkpoint | null {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    const cp = JSON.parse(raw) as Checkpoint;
    return cp.hash === hash ? cp : null;
  } catch {
    return null;
  }
}

function saveCheckpoint(cp: Checkpoint) {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
  } catch {
    /* ignore */
  }
}

function clearCheckpoint() {
  try {
    localStorage.removeItem(CHECKPOINT_KEY);
  } catch {
    /* ignore */
  }
}

function isNetworkError(e: any): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(e?.message ?? e ?? '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    msg.includes('load failed')
  );
}

function waitForOnline(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (navigator.onLine !== false) return Promise.resolve();
  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener('online', handler);
      resolve();
    };
    window.addEventListener('online', handler);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function resilient<T>(fn: () => Promise<T>, onProgress?: (msg: string) => void): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      if (!isNetworkError(e)) throw e;
      attempt++;
      onProgress?.('Connection lost — import paused, waiting to reconnect…');
      await waitForOnline();
      const delay = Math.min(1000 * 2 ** (attempt - 1), 15000);
      onProgress?.(`Reconnecting… retrying in ${Math.round(delay / 1000)}s (attempt ${attempt})`);
      await sleep(delay);
    }
  }
}

export async function importAllData(
  json: string,
  onProgress?: (msg: string) => void
): Promise<{ characters: number; poses: number; clothing: number; backgrounds: number; settingsPresets: number; resumed: boolean }> {
  const bundle = JSON.parse(json);

  if (bundle.version !== 1 && bundle.version !== 2) throw new Error('Unsupported export version');

  const hash = await sha256(json);
  const existing = loadCheckpoint(hash);
  const resumed = !!existing;
  const checkpoint: Checkpoint = existing ?? {
    hash,
    progress: { characters: 0, clothing: 0, backgrounds: 0, poses: 0, settings: 0 },
    counts: { characters: 0, poses: 0, clothing: 0, backgrounds: 0, settingsPresets: 0 },
  };
  const counts = checkpoint.counts;

  if (resumed) onProgress?.('Resuming previous import…');

  // Import characters
  const chars = bundle.characters ?? [];
  for (let i = checkpoint.progress.characters; i < chars.length; i++) {
    const c = chars[i];
    onProgress?.(`Importing character ${i + 1} of ${chars.length}…`);

    await resilient(async () => {
      let faceUrl = c.face_url;
      if (c.faceDataUrl) {
        faceUrl = await uploadDataUrlToStorage(c.faceDataUrl);
      }

      const charData = { ...c.character };

      if (c.characterImages) {
        for (const [key, dataUrl] of Object.entries(c.characterImages)) {
          if (key.startsWith('additionalFace_')) {
            const idx = parseInt(key.split('_')[1]);
            if (!charData.additionalFaceImages) charData.additionalFaceImages = [];
            charData.additionalFaceImages[idx] = await uploadDataUrlToStorage(dataUrl as string);
          } else {
            (charData as any)[key] = await uploadDataUrlToStorage(dataUrl as string);
          }
        }
      }

      await saveCharacterPreset({
        id: crypto.randomUUID(),
        name: c.name,
        face_url: faceUrl,
        character: charData,
      });
    }, onProgress);

    counts.characters++;
    checkpoint.progress.characters = i + 1;
    saveCheckpoint(checkpoint);
  }

  // Import clothing
  const clothingItems = bundle.clothing ?? [];
  for (let i = checkpoint.progress.clothing; i < clothingItems.length; i++) {
    const c = clothingItems[i];
    onProgress?.(`Importing clothing ${i + 1} of ${clothingItems.length}…`);
    await resilient(async () => {
      const url = c.imageDataUrl ? await uploadDataUrlToStorage(c.imageDataUrl) : c.image_url;
      await saveClothingPreset(url);
    }, onProgress);
    counts.clothing++;
    checkpoint.progress.clothing = i + 1;
    saveCheckpoint(checkpoint);
  }

  // Import backgrounds
  const backgrounds = bundle.backgrounds ?? [];
  for (let i = checkpoint.progress.backgrounds; i < backgrounds.length; i++) {
    const b = backgrounds[i];
    onProgress?.(`Importing background ${i + 1} of ${backgrounds.length}…`);
    await resilient(async () => {
      let url = b.image_url;
      if (b.imageDataUrl) {
        url = await uploadDataUrlToStorage(b.imageDataUrl);
      }
      await saveBackgroundPreset(url, b.description);
    }, onProgress);
    counts.backgrounds++;
    checkpoint.progress.backgrounds = i + 1;
    saveCheckpoint(checkpoint);
  }

  // Import poses
  const poses = bundle.poses ?? [];
  for (let i = checkpoint.progress.poses; i < poses.length; i++) {
    const p = poses[i];
    onProgress?.(`Importing pose ${i + 1} of ${poses.length}…`);
    await resilient(async () => {
      const url = p.imageDataUrl ? await uploadDataUrlToStorage(p.imageDataUrl) : p.image_url;
      await savePosePreset(url);
    }, onProgress);
    counts.poses++;
    checkpoint.progress.poses = i + 1;
    saveCheckpoint(checkpoint);
  }

  // Import settings presets (v2+)
  const settingsPresets = bundle.settingsPresets ?? [];
  for (let i = checkpoint.progress.settings; i < settingsPresets.length; i++) {
    const sp = settingsPresets[i];
    onProgress?.(`Importing settings preset ${i + 1} of ${settingsPresets.length}…`);
    await resilient(() => saveSettingsPreset(sp.name, sp.characters, sp.settings), onProgress);
    counts.settingsPresets++;
    checkpoint.progress.settings = i + 1;
    saveCheckpoint(checkpoint);
  }

  clearCheckpoint();
  return { ...counts, resumed };
}

