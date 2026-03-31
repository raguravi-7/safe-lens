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

export async function analyzeImage(imageBase64: string): Promise<DetectionResult> {
  const maxRetries = 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { image: imageBase64 },
      });

      // Handle rate limit with retry
      if (error) {
        const errorMsg = error.message || '';
        if ((errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) && attempt < maxRetries) {
          const delay = (attempt + 1) * 3000;
          console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        console.error('Analysis error:', error);
        throw new Error(errorMsg || 'Failed to analyze image');
      }

      // Check if response itself indicates rate limit
      if (data?.error && data.error.includes('Rate limit') && attempt < maxRetries) {
        const delay = (attempt + 1) * 3000;
        console.warn(`Rate limited (response), retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
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
      if (attempt < maxRetries) {
        const delay = (attempt + 1) * 3000;
        console.warn(`Error, retrying in ${delay}ms:`, err);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      console.error('Failed to analyze image after retries:', err);
      // Return empty result instead of crashing
      return {
        detections: [],
        imageWidth: 1280,
        imageHeight: 720,
        analyzedAt: new Date(),
      };
    }
  }

  return { detections: [], imageWidth: 1280, imageHeight: 720, analyzedAt: new Date() };
}
