import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import type { Detection } from '@/types/detection';
import { CATEGORY_CONFIG } from '@/types/detection';

interface ImageAnalysisViewProps {
  onAnalyze: (imageBase64: string) => Promise<void>;
  detections: Detection[];
  isAnalyzing: boolean;
}

export function ImageAnalysisView({ onAnalyze, detections, isAnalyzing }: ImageAnalysisViewProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleImageSelect = (imageBase64: string) => {
    setSelectedImage(imageBase64);
    
    // Get image dimensions
    const img = new Image();
    img.onload = () => {
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      setDimensions({
        width: img.width * scale,
        height: img.height * scale,
      });
    };
    img.src = imageBase64;
  };

  const handleAnalyze = async () => {
    if (selectedImage) {
      await onAnalyze(selectedImage);
    }
  };

  // Draw image with detections
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedImage || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      
      ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

      // Draw detections
      detections.forEach(detection => {
        const { boundingBox, category, confidence } = detection;
        const config = CATEGORY_CONFIG[category];

        const x = boundingBox.x * dimensions.width;
        const y = boundingBox.y * dimensions.height;
        const w = boundingBox.width * dimensions.width;
        const h = boundingBox.height * dimensions.height;

        // Box
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Label background
        const label = `${config.icon} ${config.label} ${Math.round(confidence * 100)}%`;
        ctx.font = 'bold 14px system-ui';
        const textMetrics = ctx.measureText(label);
        const textHeight = 20;
        const padding = 6;

        ctx.fillStyle = config.color;
        ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding);

        // Label text
        ctx.fillStyle = detection.severity === 'warning' ? '#000' : '#fff';
        ctx.fillText(label, x + padding, y - padding);
      });
    };
    img.src = selectedImage;
  }, [selectedImage, detections, dimensions]);

  return (
    <div className="space-y-4">
      {!selectedImage ? (
        <ImageUploader onImageSelect={handleImageSelect} isAnalyzing={isAnalyzing} />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analyze Image
                </>
              )}
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-border bg-black/50">
            <canvas
              ref={canvasRef}
              className="mx-auto block"
            />
          </div>

          {detections.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 font-semibold text-foreground">Detection Summary</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {detections.map(detection => {
                  const config = CATEGORY_CONFIG[detection.category];
                  return (
                    <div
                      key={detection.id}
                      className="flex items-center gap-2 rounded-lg border p-2"
                      style={{ borderColor: config.color }}
                    >
                      <span className="text-lg">{config.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {config.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(detection.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => {
              setSelectedImage(null);
              setDimensions({ width: 0, height: 0 });
            }}
            disabled={isAnalyzing}
          >
            Upload New Image
          </Button>
        </div>
      )}
    </div>
  );
}
