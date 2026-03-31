import { supabase } from '@/integrations/supabase/client';
import type { DetectionResult, Detection, DetectionCategory, BoundingBox } from '@/types/detection';
import { CATEGORY_CONFIG } from '@/types/detection';

interface AIDetection {
  category: string;
  confidence: number;
  bounding_box: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

interface AnalyzeResponse {
  detections: AIDetection[];
  image_width: number;
  image_height: number;
}

function mapCategory(category: string): DetectionCategory {
  const categoryMap: Record<string, DetectionCategory> = {
    'fight': 'fight',
    'fighting': 'fight',
    'violence': 'fight',
    'gun': 'weapon_gun',
    'firearm': 'weapon_gun',
    'pistol': 'weapon_gun',
    'rifle': 'weapon_gun',
    'knife': 'weapon_knife',
    'blade': 'weapon_knife',
    'weapon': 'weapon_knife',
    'accident': 'accident',
    'crash': 'accident',
    'collision': 'accident',
    'fainting': 'fainting',
    'faint': 'fainting',
    'unconscious': 'fainting',
    'collapsed': 'fainting',
    'bad_behavior': 'bad_behavior',
    'suspicious': 'bad_behavior',
    'vandalism': 'bad_behavior',
    'person': 'person',
    'human': 'person',
    'people': 'person',
    'animal': 'animal',
    'dog': 'animal',
    'cat': 'animal',
  };

  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || 'person';
}

const RATE_LIMIT_COOLDOWN_MS = 15000;
let nextAnalyzeAllowedAt = 0;

function createEmptyResult(): DetectionResult {
  return {
    detections: [],
    imageWidth: 1280,
    imageHeight: 720,
    analyzedAt: new Date(),
  };
}

export async function analyzeImage(imageBase64: string, mode: 'image' | 'camera' = 'image'): Promise<DetectionResult> {
  const now = Date.now();
  if (now < nextAnalyzeAllowedAt) {
    console.warn(`Skipping analysis during cooldown (${nextAnalyzeAllowedAt - now}ms remaining)`);
    return createEmptyResult();
  }

  const maxRetries = 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { image: imageBase64, mode },
      });

      if (error) {
        const errorMsg = error.message || '';
        const isRateLimited = errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit');

        if (isRateLimited) {
          nextAnalyzeAllowedAt = Date.now() + RATE_LIMIT_COOLDOWN_MS;
          console.warn(`Rate limited by AI service. Cooling down for ${RATE_LIMIT_COOLDOWN_MS}ms.`);
          return createEmptyResult();
        }

        console.error('Analysis error:', error);
        throw new Error(errorMsg || 'Failed to analyze image');
      }

      if (data?.error && data.error.includes('Rate limit')) {
        nextAnalyzeAllowedAt = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        console.warn(`Rate limit response received. Cooling down for ${RATE_LIMIT_COOLDOWN_MS}ms.`);
        return createEmptyResult();
      }

      const response = data as AnalyzeResponse;

      const detections: Detection[] = (response.detections || []).map((d, index) => {
        const category = mapCategory(d.category);
        const config = CATEGORY_CONFIG[category];

        const boundingBox: BoundingBox = {
          x: d.bounding_box.x_min,
          y: d.bounding_box.y_min,
          width: d.bounding_box.x_max - d.bounding_box.x_min,
          height: d.bounding_box.y_max - d.bounding_box.y_min,
        };

        return {
          id: `detection-${Date.now()}-${index}`,
          category,
          confidence: d.confidence,
          boundingBox,
          severity: config.severity,
          timestamp: new Date(),
        };
      });

      return {
        detections,
        imageWidth: response.image_width || 1280,
        imageHeight: response.image_height || 720,
        analyzedAt: new Date(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimited = message.includes('429') || message.toLowerCase().includes('rate limit');

      if (isRateLimited) {
        nextAnalyzeAllowedAt = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        console.warn(`Rate limited while analyzing. Cooling down for ${RATE_LIMIT_COOLDOWN_MS}ms.`);
        return createEmptyResult();
      }

      if (attempt < maxRetries) {
        const delay = 2000;
        console.warn(`Transient analysis error, retrying in ${delay}ms:`, err);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      console.error('Failed to analyze image after retries:', err);
      return createEmptyResult();
    }
  }

  return createEmptyResult();
}
