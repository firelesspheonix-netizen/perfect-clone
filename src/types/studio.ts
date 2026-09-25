export type BodySize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large' | 'extra-extra-large';
export type ExpressionPreset = 'default' | 'smiling' | 'angry' | 'horny' | 'custom' | 'custom-image';
export type HairstyleOption = 'default' | 'custom-text' | 'custom-image';
export type CameraAngle = 'auto' | 'front' | 'side' | 'back' | 'over-shoulder' | 'behind-close' | 'low-angle' | 'high-angle' | 'top-down' | 'dutch-angle' | 'custom';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9' | '4:5' | '5:4' | '7:5' | '5:7' | 'custom';
export type AIModel = 'google/gemini-3-pro-image' | 'google/gemini-2.5-flash-image' | 'google/gemini-3.1-flash-image';
export type LightingOption = 'auto' | 'natural' | 'studio' | 'golden-hour' | 'dramatic' | 'neon' | 'soft' | 'backlit' | 'candlelight' | 'moody';
export type DetailLevel = 'auto' | 'ultra' | 'high' | 'medium' | 'low';
export type CameraQuality = 'none' | 'standard-phone' | 'old-phone' | 'webcam';
export type SkinTone = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type PosePreset = 'none' | 'standing' | 'sitting' | 'lying-down' | 'kneeling' | 'crawling' | 'squatting' | 'leaning' | 'arched-back' | 'on-all-fours' | 'side-lying' | 'bent-over' | 'looking-back' | 'hands-and-knees' | 'custom';
export type FootType = 'egyptian' | 'roman' | 'greek' | 'germanic' | 'celtic';
export type FootLength = 'short' | 'average' | 'long';
export type FingerLength = 'short' | 'average' | 'long';
export type NailLength = 'short' | 'medium' | 'long';

export interface HandConfig {
  enabled: boolean;
  fingerLength: FingerLength;
  nailLength: NailLength;
  nailPolish: boolean;
  nailPolishColor: string;
}

export interface Prop {
  id: string;
  name: string;
  imageData: string | null;
  placement: string;
}

export interface DistinguishingMark {
  id: string;
  type: 'tattoo' | 'birthmark' | 'scar' | 'piercing' | 'other';
  description: string;
  imageData: string | null;
}

export interface CharacterConfig {
  id: string;
  label: string;
  faceImage: string | null;
  additionalFaceImages: string[];
  clothingImage: string | null;
  clothingText: string;
  poseReferenceImage: string | null;
  hairstyleOption: HairstyleOption;
  hairstyleText: string;
  hairstyleImage: string | null;
  chestSize: BodySize;
  buttSize: BodySize;
  stomachSize: BodySize;
  expressionPreset: ExpressionPreset;
  customExpression: string;
  expressionImage: string | null;
  actionPrompt: string;
  posePreset: PosePreset;
  skinTone: SkinTone;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  hairColorImage: string | null;
  eyeColorImage: string | null;
  preserveExactHead: boolean;
  lookingAtViewer: boolean;
  sideProfileImage: string | null;
  heightEnabled: boolean;
  height: number;
  footSizeEnabled: boolean;
  footSize: number;
  footType: FootType;
  footLength: FootLength;
  hands: HandConfig;
  distinguishingMarks: DistinguishingMark[];
  props: Prop[];
}

export interface GenerationSettings {
  model: AIModel;
  aspectRatio: AspectRatio;
  customAspectRatio: string;
  cameraAngle: CameraAngle;
  customCameraAngle: string;
  ultraPhotorealistic8k: boolean;
  backgroundImage: string | null;
  backgroundText: string;
  lighting: LightingOption;
  skinDetail: DetailLevel;
  eyeDetail: DetailLevel;
  confineToBackground: boolean;
  imageCount: number;
  cameraQuality: CameraQuality;
  scenePrompt: string;
  copyPoseAngle: boolean;
  poseOnlyMode: boolean;
}

export interface GeneratedImage {
  id: string;
  imageData: string;
  prompt: string;
  characters: CharacterConfig[];
  settings: GenerationSettings;
  timestamp: number;
}

export function createDefaultCharacter(id: string, index: number): CharacterConfig {
  return {
    id,
    label: `Person ${index + 1}`,
    faceImage: null,
    additionalFaceImages: [],
    clothingImage: null,
    clothingText: '',
    poseReferenceImage: null,
    hairstyleOption: 'default',
    hairstyleText: '',
    hairstyleImage: null,
    chestSize: 'medium',
    buttSize: 'medium',
    stomachSize: 'medium',
    expressionPreset: 'default',
    customExpression: '',
    expressionImage: null,
    actionPrompt: '',
    posePreset: 'none',
    skinTone: 5,
    skinColor: '',
    hairColor: '',
    eyeColor: '',
    hairColorImage: null,
    eyeColorImage: null,
    preserveExactHead: false,
    lookingAtViewer: false,
    sideProfileImage: null,
    heightEnabled: false,
    height: 66,
    footSizeEnabled: false,
    footSize: 6,
    footType: 'egyptian',
    footLength: 'average',
    hands: {
      enabled: false,
      fingerLength: 'average',
      nailLength: 'short',
      nailPolish: false,
      nailPolishColor: '#FF0000',
    },
    distinguishingMarks: [],
    props: [],
  };
}
