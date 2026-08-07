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

export async function importAllData(
  json: string,
  onProgress?: (msg: string) => void
): Promise<{ characters: number; poses: number; clothing: number; backgrounds: number; settingsPresets: number }> {
  const bundle = JSON.parse(json);

  if (bundle.version !== 1 && bundle.version !== 2) throw new Error('Unsupported export version');

  const counts = { characters: 0, poses: 0, clothing: 0, backgrounds: 0, settingsPresets: 0 };

  // Import characters
  onProgress?.(`Importing ${bundle.characters.length} characters...`);
  for (const c of bundle.characters) {
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
    counts.characters++;
  }

  // Import clothing
  onProgress?.(`Importing ${bundle.clothing.length} clothing items...`);
  for (const c of bundle.clothing) {
    const url = c.imageDataUrl ? await uploadDataUrlToStorage(c.imageDataUrl) : c.image_url;
    await saveClothingPreset(url);
    counts.clothing++;
  }

  // Import backgrounds
  onProgress?.(`Importing ${bundle.backgrounds.length} backgrounds...`);
  for (const b of bundle.backgrounds) {
    let url = b.image_url;
    if (b.imageDataUrl) {
      url = await uploadDataUrlToStorage(b.imageDataUrl);
    }
    await saveBackgroundPreset(url, b.description);
    counts.backgrounds++;
  }

  // Import poses
  onProgress?.(`Importing ${bundle.poses.length} poses...`);
  for (const p of bundle.poses) {
    const url = p.imageDataUrl ? await uploadDataUrlToStorage(p.imageDataUrl) : p.image_url;
    await savePosePreset(url);
    counts.poses++;
  }

  // Import settings presets (v2+)
  if (bundle.settingsPresets?.length) {
    onProgress?.(`Importing ${bundle.settingsPresets.length} settings presets...`);
    for (const sp of bundle.settingsPresets) {
      await saveSettingsPreset(sp.name, sp.characters, sp.settings);
      counts.settingsPresets++;
    }
  }

  return counts;
}
