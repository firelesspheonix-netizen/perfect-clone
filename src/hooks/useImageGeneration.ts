import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CharacterConfig, GeneratedImage, GenerationSettings } from '@/types/studio';
import { toast } from 'sonner';

function buildPrompt(characters: CharacterConfig[], settings: GenerationSettings): string {
  const parts: string[] = [];

  parts.push("Generate a 4K ultra HD realistic photograph with perfect attention to lighting, skin detail, and natural appearance.");

  if (settings.aspectRatio === 'custom' && settings.customAspectRatio) {
    parts.push(`Image aspect ratio: ${settings.customAspectRatio}.`);
  } else if (settings.aspectRatio !== 'auto') {
    parts.push(`Image aspect ratio: ${settings.aspectRatio}.`);
  }

  if (settings.cameraAngle === 'custom' && settings.customCameraAngle) {
    parts.push(`Camera angle: ${settings.customCameraAngle}.`);
  } else if (settings.cameraAngle !== 'auto') {
    const angleDescriptions: Record<string, string> = {
      'front': 'front view',
      'side': 'side view',
      'back': 'from behind',
      'over-shoulder': 'over the shoulder view from behind',
      'behind-close': 'close-up from behind',
      'low-angle': 'low angle looking up',
      'high-angle': 'high angle looking down',
      'top-down': 'top-down bird\'s eye view',
      'dutch-angle': 'dutch angle tilted view',
    };
    parts.push(`Camera angle: ${angleDescriptions[settings.cameraAngle] || settings.cameraAngle}.`);
  }

  if (settings.lighting !== 'auto') {
    const lightingDescriptions: Record<string, string> = {
      'natural': 'natural daylight',
      'studio': 'professional studio lighting with soft boxes',
      'golden-hour': 'warm golden hour sunlight',
      'dramatic': 'dramatic high-contrast lighting with deep shadows',
      'neon': 'colorful neon lighting',
      'soft': 'soft diffused lighting',
      'backlit': 'backlit with rim light creating a glowing outline',
      'candlelight': 'warm candlelight ambiance',
      'moody': 'moody low-key atmospheric lighting',
    };
    parts.push(`Lighting: ${lightingDescriptions[settings.lighting] || settings.lighting}.`);
  }

  if (settings.skinDetail !== 'auto') {
    const skinDescriptions: Record<string, string> = {
      'ultra': 'Ultra-realistic skin with visible pores, micro-textures, fine hair, and natural skin imperfections',
      'high': 'Highly detailed skin with natural texture and subtle imperfections',
      'medium': 'Standard realistic skin detail',
      'low': 'Smooth, simplified skin rendering',
    };
    parts.push(`${skinDescriptions[settings.skinDetail]}.`);
  }

  if (settings.eyeDetail !== 'auto') {
    const eyeDescriptions: Record<string, string> = {
      'ultra': 'Ultra-detailed eyes with visible iris patterns, reflections, catch lights, and micro-detail in the pupils',
      'high': 'Highly detailed eyes with clear iris detail and natural reflections',
      'medium': 'Standard realistic eye detail',
      'low': 'Simplified eye rendering',
    };
    parts.push(`${eyeDescriptions[settings.eyeDetail]}.`);
  }

  if (settings.cameraQuality && settings.cameraQuality !== 'none') {
    const cameraQualityDescriptions: Record<string, string> = {
      'standard-phone': 'Shot on a standard smartphone camera. Slight digital noise, minor lens distortion at edges, auto-exposure inconsistencies, slightly over-sharpened processing, visible JPEG compression artifacts, and occasional motion blur. The image should look like a casual phone photo — not professional.',
      'old-phone': 'Shot on an old low-resolution phone camera (circa 2005-2010). Heavy JPEG compression artifacts, very low resolution and pixelated details, washed-out colors, significant digital noise and grain, poor dynamic range with blown-out highlights and crushed shadows, slight purple fringing, and a generally blurry/soft focus look.',
      'webcam': 'Captured on a low-quality webcam. Grainy image with visible noise, low resolution, washed-out flat colors, slight fish-eye lens distortion, inconsistent white balance with a greenish or yellowish tint, interlacing artifacts, motion blur, and harsh direct frontal lighting typical of a monitor-lit face.',
    };
    parts.push(cameraQualityDescriptions[settings.cameraQuality]);
  }

  if (settings.backgroundImage) {
    if (settings.cameraAngle !== 'auto') {
      const angleKey = settings.cameraAngle === 'custom' ? settings.customCameraAngle : settings.cameraAngle;
      const bgAngleInstructions: Record<string, string> = {
        'top-down': "Since the camera is top-down, intelligently zoom into and show only the FLOOR/GROUND area of the provided background image. Place the character as if viewed from directly above, lying or positioned on the ground surface visible in the background.",
        'low-angle': "Since the camera is at a low angle looking up, zoom into and emphasize the LOWER portion of the background, showing the ground/floor level. The background should appear as if photographed from ground level looking upward.",
        'high-angle': "Since the camera is at a high angle looking down, zoom into the background appropriately to show the scene from above. Emphasize the floor/ground area and place the character naturally within it.",
        'front': "Frame the background naturally for a front-facing shot, showing the scene at eye level behind the character.",
        'side': "Frame the background for a side-view shot, adjusting perspective to match a lateral camera position.",
        'back': "Frame the background as seen from behind the character, adjusting the background perspective accordingly.",
        'over-shoulder': "Frame the background as seen over the character's shoulder, with appropriate depth and perspective.",
        'behind-close': "Frame the background for a close-up from behind, showing what would be visible just past the character.",
        'dutch-angle': "Tilt the background perspective to match the dutch angle camera tilt.",
      };
      const bgInstruction = bgAngleInstructions[angleKey] || `Adapt the background perspective and zoom to match the ${angleKey} camera angle naturally.`;
      parts.push(`${bgInstruction} Use the provided background image as the scene.`);
    } else if (settings.confineToBackground) {
      parts.push("CRITICAL: Use the provided background image as the scene. Do NOT extend, zoom out, or add any areas beyond what is shown in the background image. Keep the entire scene WITHIN the boundaries of the provided background. The AI may zoom in or crop to fit the character naturally, and may adjust lighting to match, but must NEVER generate additional background areas that don't exist in the original image. Do NOT change the colors, textures, or elements of the background. Place the character in a reasonable, natural position within the existing scene.");
    } else {
      parts.push("Use the provided background image as the scene background.");
    }
  }
  if (settings.backgroundText) {
    parts.push(`Background/setting: ${settings.backgroundText}.`);
  }

  if (settings.scenePrompt?.trim()) {
    parts.push(`Scene direction: ${settings.scenePrompt.trim()}.`);
  }

  characters.forEach((char, i) => {
    const label = char.label || `Person ${i + 1}`;
    const charParts: string[] = [`[${label}]:`];

    if (char.faceImage) {
      if (char.preserveExactHead) {
        charParts.push("CRITICAL: Perfectly replicate this person's EXACT head, face, hair, and all facial features from the provided face reference image with ZERO modifications. The head must be an identical copy — same face shape, jawline, hairline, hair color, hair length, hairstyle, eyebrows, eyes, nose, mouth, ears, skin texture, and every detail. Do NOT alter, stylize, or reinterpret any part of the head. Generate a full body below the head.");
      } else {
        charParts.push("Use the provided face reference image to recreate this person's exact facial features, skin tone, and details.");
      }
    }

    if (char.additionalFaceImages && char.additionalFaceImages.length > 0) {
      charParts.push(`${char.additionalFaceImages.length} additional face reference image(s) are provided from different angles — use all of them together to build a more accurate understanding of this person's facial features, structure, and proportions.`);
    }

    if (char.sideProfileImage) {
      charParts.push("A side profile reference image is also provided — use it for accurate nose shape, jawline, ear placement, and hair appearance from the side angle.");
    }

    if (char.hairstyleOption === 'default') {
      charParts.push("Keep the exact hairstyle from the face reference image.");
    } else if (char.hairstyleOption === 'custom-text' && char.hairstyleText) {
      charParts.push(`Hairstyle: ${char.hairstyleText}.`);
    } else if (char.hairstyleOption === 'custom-image') {
      charParts.push("Use the provided hairstyle reference image.");
    }

    if (char.clothingImage) {
      charParts.push("Dress this person in the exact clothing shown in the provided clothing reference image.");
    }
    if (char.clothingText) {
      charParts.push(`Clothing: ${char.clothingText}.`);
    }

    const skinToneDescriptions: Record<number, string> = {
      0: 'very fair porcelain white', 1: 'fair light', 2: 'light peach', 3: 'light tan',
      4: 'medium light', 5: 'medium olive', 6: 'medium tan', 7: 'tan brown',
      8: 'medium dark brown', 9: 'dark brown', 10: 'very dark deep brown',
    };
    if (char.skinColor) {
      charParts.push(`Skin color: exactly ${char.skinColor}.`);
    } else {
      charParts.push(`Skin tone: ${skinToneDescriptions[char.skinTone] || 'medium'}.`);
    }
    if (char.hairColor) {
      charParts.push(`Hair color: exactly ${char.hairColor}.`);
    }
    if (char.eyeColor) {
      charParts.push(`Eye color: exactly ${char.eyeColor}.`);
    }
    charParts.push(`Body proportions: chest size ${char.chestSize}, butt size ${char.buttSize}, stomach size ${char.stomachSize}.`);

    if (char.heightEnabled) {
      const heightFt = Math.floor(char.height / 12);
      const heightIn = char.height % 12;
      charParts.push(`Height: approximately ${heightFt} feet ${heightIn} inches tall.`);
    }

    if (char.expressionPreset === 'default') {
      charParts.push("Keep the natural expression from the face reference.");
    } else if (char.expressionPreset === 'custom' && char.customExpression) {
      charParts.push(`Expression: ${char.customExpression}.`);
    } else if (char.expressionPreset === 'custom-image' && char.expressionImage) {
      charParts.push("Expression: match the facial expression from the provided expression reference image exactly.");
    } else if (char.expressionPreset !== 'custom-image') {
      charParts.push(`Expression: ${char.expressionPreset}.`);
    }

    if (char.posePreset !== 'none' && char.posePreset !== 'custom') {
      const poseDescriptions: Record<string, string> = {
        'standing': 'standing upright',
        'sitting': 'sitting down',
        'lying-down': 'lying down',
        'kneeling': 'kneeling',
        'crawling': 'crawling on the ground',
        'squatting': 'squatting down',
        'leaning': 'leaning seductively',
        'arched-back': 'with arched back pose',
        'on-all-fours': 'on all fours position',
        'side-lying': 'lying on side',
        'bent-over': 'bent over',
        'looking-back': 'looking back over shoulder',
        'hands-and-knees': 'on hands and knees',
      };
      charParts.push(`Pose: ${poseDescriptions[char.posePreset] || char.posePreset}.`);
    }

    if (char.actionPrompt) {
      charParts.push(`Action/pose: ${char.actionPrompt}.`);
    }

    if (char.lookingAtViewer) {
      charParts.push("IMPORTANT: Regardless of body pose or camera angle, this character's EYES must be looking directly at the viewer/camera. Even if the body is turned away, twisted, or in any pose, the eyes should make direct eye contact with the camera.");
    }

    if (char.poseReferenceImage) {
      if (settings.poseOnlyMode) {
        charParts.push("Match ONLY the body position and pose from the provided pose reference image. IMPORTANT: Completely ignore the body proportions, body shape, body size, hand shape, foot shape, skin tone, hair, clothing, and any other physical attributes visible in the pose reference. Only use it for the spatial arrangement and position of the limbs and torso.");
      } else {
        charParts.push("Match the body pose from the provided pose reference image.");
      }
      if (settings.copyPoseAngle) {
        charParts.push("IMPORTANT: Also match the exact same camera angle/perspective from the pose reference image.");
      }
    }

    char.props.forEach((prop) => {
      if (prop.name) {
        charParts.push(`Prop: ${prop.name}${prop.placement ? ` placed ${prop.placement}` : ''}.${prop.imageData ? ' Use the provided prop reference image.' : ''}`);
      }
    });

    char.distinguishingMarks.forEach((mark) => {
      if (mark.description || mark.imageData) {
        charParts.push(`Distinguishing ${mark.type}: ${mark.description || mark.type}.${mark.imageData ? ' A reference image is provided showing the exact appearance and placement on the body — replicate it in the same location.' : ''}`);
      }
    });

    parts.push(charParts.join(" "));
  });

  return parts.join("\n\n");
}

function collectReferenceImages(characters: CharacterConfig[], settings: GenerationSettings): string[] {
  const images: string[] = [];

  if (settings.backgroundImage) images.push(settings.backgroundImage);

  characters.forEach((char) => {
    if (char.faceImage) images.push(char.faceImage);
    if (char.additionalFaceImages) {
      char.additionalFaceImages.forEach((img) => images.push(img));
    }
    if (char.sideProfileImage) images.push(char.sideProfileImage);
    if (char.clothingImage) images.push(char.clothingImage);
    if (char.poseReferenceImage) images.push(char.poseReferenceImage);
    if (char.hairstyleOption === 'custom-image' && char.hairstyleImage) images.push(char.hairstyleImage);
    if (char.expressionPreset === 'custom-image' && char.expressionImage) images.push(char.expressionImage);
    char.props.forEach((prop) => {
      if (prop.imageData) images.push(prop.imageData);
    });
    char.distinguishingMarks.forEach((mark) => {
      if (mark.imageData) images.push(mark.imageData);
    });
  });

  return images;
}

export function useImageGeneration() {
  const [generatingCount, setGeneratingCount] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() => {
    try {
      const cached = localStorage.getItem('generated_images');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync to localStorage whenever images change
  useEffect(() => {
    try {
      localStorage.setItem('generated_images', JSON.stringify(generatedImages));
    } catch (e) {
      console.warn('Failed to cache images to localStorage:', e);
    }
  }, [generatedImages]);

  const saveToDb = async (image: GeneratedImage) => {
    try {
      await supabase.from('generation_history').insert({
        id: image.id,
        image_data: image.imageData,
        prompt: image.prompt,
        characters: JSON.parse(JSON.stringify(image.characters)),
        settings: JSON.parse(JSON.stringify(image.settings)),
        created_at: new Date(image.timestamp).toISOString(),
      });
    } catch (err) {
      console.error('Failed to save to DB:', err);
    }
  };

  const generate = useCallback(async (characters: CharacterConfig[], settings: GenerationSettings) => {
    setGeneratingCount(c => c + 1);
    try {
      const prompt = buildPrompt(characters, settings);
      const referenceImages = collectReferenceImages(characters, settings);

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, model: settings.model, referenceImages },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.imageUrl) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          imageData: data.imageUrl,
          prompt,
          characters: JSON.parse(JSON.stringify(characters)),
          settings: JSON.parse(JSON.stringify(settings)),
          timestamp: Date.now(),
        };
        setGeneratedImages((prev) => [newImage, ...prev]);
        saveToDb(newImage);
        toast.success('Image generated!');
      } else {
        toast.error('No image was returned. Try adjusting your prompt.');
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Failed to generate image');
    } finally {
      setGeneratingCount(c => Math.max(0, c - 1));
    }
  }, []);

  const clearHistory = useCallback(async () => {
    setGeneratedImages([]);
    localStorage.removeItem('generated_images');
    try {
      const { error } = await supabase.from('generation_history').delete().gte('created_at', '1970-01-01');
      if (error) console.error('Failed to clear DB history:', error);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, []);

  return { isGenerating: generatingCount > 0, generatingCount, isLoading, generatedImages, generate, setGeneratedImages, clearHistory };
}
