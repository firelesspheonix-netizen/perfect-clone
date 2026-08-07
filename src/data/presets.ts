import { CharacterConfig, HandConfig, BodySize, HairstyleOption, SkinTone, FootType, FootLength } from '@/types/studio';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────
export interface CharacterPreset {
  id: string;
  name: string;
  face_url: string | null;
  character: {
    faceImage: string | null;
    additionalFaceImages: string[];
    sideProfileImage: string | null;
    hairstyleOption: HairstyleOption;
    hairstyleText: string;
    hairstyleImage: string | null;
    hairColor: string;
    hairColorImage: string | null;
    eyeColor: string;
    eyeColorImage: string | null;
    chestSize: BodySize;
    buttSize: BodySize;
    stomachSize: BodySize;
    skinTone: SkinTone;
    skinColor: string;
    heightEnabled: boolean;
    height: number;
    footSizeEnabled: boolean;
    footSize: number;
    footType: FootType;
    footLength: FootLength;
    hands: HandConfig;
  };
}

export interface PosePresetSaved {
  id: string;
  image_url: string;
}

export interface FacePreset {
  id: string;
  image_url: string;
}

export interface ClothingPreset {
  id: string;
  image_url: string;
}

export interface BackgroundPreset {
  id: string;
  image_url: string | null;
  description: string;
}

// ─── Upload helper ───────────────────────────────────────────────────
export async function uploadImageToStorage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `images/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('studio-assets')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from('studio-assets')
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadDataUrlToStorage(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.includes('png') ? 'png' : 'jpg';
  const file = new File([blob], `image.${ext}`, { type: blob.type });
  return uploadImageToStorage(file);
}

// ─── Character Preset helpers ────────────────────────────────────────
export async function getCharacterPresets(): Promise<CharacterPreset[]> {
  const { data, error } = await supabase
    .from('character_presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    face_url: row.face_url,
    character: row.data,
  }));
}

export async function saveCharacterPreset(preset: CharacterPreset): Promise<void> {
  const { error } = await supabase.from('character_presets').insert({
    id: preset.id,
    name: preset.name,
    face_url: preset.face_url,
    data: preset.character as any,
  });
  if (error) throw error;
}

export async function deleteCharacterPreset(id: string): Promise<void> {
  const { error } = await supabase.from('character_presets').delete().eq('id', id);
  if (error) throw error;
}

export function characterToPreset(name: string, char: CharacterConfig): CharacterPreset {
  return {
    id: crypto.randomUUID(),
    name,
    face_url: char.faceImage,
    character: {
      faceImage: char.faceImage,
      additionalFaceImages: char.additionalFaceImages,
      sideProfileImage: char.sideProfileImage,
      hairstyleOption: char.hairstyleOption,
      hairstyleText: char.hairstyleText,
      hairstyleImage: char.hairstyleImage,
      hairColor: char.hairColor,
      hairColorImage: char.hairColorImage,
      eyeColor: char.eyeColor,
      eyeColorImage: char.eyeColorImage,
      chestSize: char.chestSize,
      buttSize: char.buttSize,
      stomachSize: char.stomachSize,
      skinTone: char.skinTone,
      skinColor: char.skinColor,
      heightEnabled: char.heightEnabled,
      height: char.height,
      footSizeEnabled: char.footSizeEnabled,
      footSize: char.footSize,
      footType: char.footType,
      footLength: char.footLength,
      hands: { ...char.hands },
    },
  };
}

export function applyCharacterPreset(preset: CharacterPreset, existingChar: CharacterConfig): CharacterConfig {
  return { ...existingChar, ...preset.character };
}

// ─── Pose Preset helpers ─────────────────────────────────────────────
export async function getPosePresets(): Promise<PosePresetSaved[]> {
  const { data, error } = await supabase
    .from('pose_presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, image_url: row.image_url }));
}

export async function savePosePreset(imageUrl: string): Promise<void> {
  const { error } = await supabase.from('pose_presets').insert({ image_url: imageUrl });
  if (error) throw error;
}

export async function deletePosePreset(id: string): Promise<void> {
  const { error } = await supabase.from('pose_presets').delete().eq('id', id);
  if (error) throw error;
}

// ─── Clothing Preset helpers ─────────────────────────────────────────
export async function getClothingPresets(): Promise<ClothingPreset[]> {
  const { data, error } = await supabase
    .from('clothing_presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, image_url: row.image_url }));
}

export async function saveClothingPreset(imageUrl: string): Promise<void> {
  const { error } = await supabase.from('clothing_presets').insert({ image_url: imageUrl });
  if (error) throw error;
}

export async function deleteClothingPreset(id: string): Promise<void> {
  const { error } = await supabase.from('clothing_presets').delete().eq('id', id);
  if (error) throw error;
}

// ─── Face Preset helpers ─────────────────────────────────────────────
export async function getFacePresets(): Promise<FacePreset[]> {
  const { data, error } = await supabase
    .from('face_presets' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, image_url: row.image_url }));
}

export async function saveFacePreset(imageUrl: string): Promise<void> {
  const { error } = await supabase.from('face_presets' as any).insert({ image_url: imageUrl } as any);
  if (error) throw error;
}

export async function deleteFacePreset(id: string): Promise<void> {
  const { error } = await supabase.from('face_presets' as any).delete().eq('id', id);
  if (error) throw error;
}

// ─── Background Preset helpers ───────────────────────────────────────
export async function getBackgroundPresets(): Promise<BackgroundPreset[]> {
  const { data, error } = await supabase
    .from('background_presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    image_url: row.image_url,
    description: row.description || '',
  }));
}

export async function saveBackgroundPreset(imageUrl: string | null, description: string): Promise<void> {
  const { error } = await supabase.from('background_presets').insert({
    image_url: imageUrl,
    description,
  });
  if (error) throw error;
}

export async function deleteBackgroundPreset(id: string): Promise<void> {
  const { error } = await supabase.from('background_presets').delete().eq('id', id);
  if (error) throw error;
}

// ─── Settings Preset helpers ─────────────────────────────────────────
export interface SettingsPreset {
  id: string;
  name: string;
  characters: any;
  settings: any;
  created_at?: string;
}

export async function getSettingsPresets(): Promise<SettingsPreset[]> {
  const { data, error } = await supabase
    .from('settings_presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    characters: row.characters,
    settings: row.settings,
    created_at: row.created_at,
  }));
}

export async function saveSettingsPreset(name: string, characters: any, settings: any): Promise<void> {
  const { error } = await supabase.from('settings_presets').insert({
    name,
    characters: characters as any,
    settings: settings as any,
  });
  if (error) throw error;
}

export async function deleteSettingsPreset(id: string): Promise<void> {
  const { error } = await supabase.from('settings_presets').delete().eq('id', id);
  if (error) throw error;
}
