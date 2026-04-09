import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, Film, SkipForward } from 'lucide-react';
import { VideoUploader } from './VideoUploader';
import type { Detection } from '@/types/detection';
import { CATEGORY_CONFIG } from '@/types/detection';

interface VideoAnalysisViewProps {
  onAnalyze: (imageBase64: string) => Promise<void>;
  detections: Detection[];
  isAnalyzing: boolean;
}

function extractFrames(
  file: File,
  intervalSec: number,
  maxFrames: number,
  onProgress: (pct: number) => void
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const times: number[] = [];
      for (let t = 0; t < duration && times.length < maxFrames; t += intervalSec) {
        times.push(t);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const frames: string[] = [];
      let idx = 0;

      const captureNext = () => {
        if (idx >= times.length) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }
        video.currentTime = times[idx];
      };

      video.onseeked = () => {
        // Scale down for efficiency
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.7));
        idx++;
        onProgress(Math.round((idx / times.length) * 100));
        captureNext();
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      captureNext();
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
  });
}

export function VideoAnalysisView({ onAnalyze, detections, isAnalyzing }: VideoAnalysisViewProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleVideoSelect = useCallback(async (file: File) => {
    setVideoFile(file);
    setFrames([]);
    setCurrentFrameIdx(0);
    setExtracting(true);
    setExtractProgress(0);
    try {
      const extracted = await extractFrames(file, 2, 30, setExtractProgress);
      setFrames(extracted);
    } catch (err) {
      console.error('Frame extraction failed:', err);
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleAnalyzeAll = useCallback(async () => {
    if (frames.length === 0) return;
    setAnalyzing(true);
    setAnalyzeProgress(0);
    for (let i = 0; i < frames.length; i++) {
      setCurrentFrameIdx(i);
      await onAnalyze(frames[i]);
      setAnalyzeProgress(Math.round(((i + 1) / frames.length) * 100));
      // Small delay between frames to avoid rate limiting
      if (i < frames.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    setAnalyzing(false);
  }, [frames, onAnalyze]);

  const handleAnalyzeCurrent = useCallback(async () => {
    if (frames.length === 0) return;
    await onAnalyze(frames[currentFrameIdx]);
  }, [frames, currentFrameIdx, onAnalyze]);

  // Draw current frame with detections
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frames[currentFrameIdx];
    if (!canvas || !frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      const w = img.width * scale;
      const h = img.height * scale;
      setDimensions({ width: w, height: h });
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      detections.forEach(detection => {
        const { boundingBox, category, confidence } = detection;
        const config = CATEGORY_CONFIG[category];

        const x = boundingBox.x * w;
        const y = boundingBox.y * h;
        const bw = boundingBox.width * w;
        const bh = boundingBox.height * h;

        ctx.strokeStyle = config.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, bw, bh);

        const label = `${config.icon} ${config.label} ${Math.round(confidence * 100)}%`;
        ctx.font = 'bold 14px system-ui';
        const textMetrics = ctx.measureText(label);
        const textHeight = 20;
        const padding = 6;

        ctx.fillStyle = config.color;
        ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding);

        ctx.fillStyle = detection.severity === 'warning' ? '#000' : '#fff';
        ctx.fillText(label, x + padding, y - padding);
      });
    };
    img.src = frame;
  }, [frames, currentFrameIdx, detections]);

  return (
    <div className="space-y-4">
      {!videoFile ? (
        <VideoUploader onVideoSelect={handleVideoSelect} isAnalyzing={isAnalyzing} />
      ) : extracting ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border/50 bg-card/30 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-foreground">Extracting frames...</p>
          <Progress value={extractProgress} className="w-64" />
          <p className="text-sm text-muted-foreground">{extractProgress}%</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAnalyzeCurrent}
              disabled={isAnalyzing || analyzing}
              className="gap-2"
              size="sm"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>
              ) : (
                <><Search className="h-4 w-4" />Analyze Frame</>
              )}
            </Button>
            <Button
              onClick={handleAnalyzeAll}
              disabled={isAnalyzing || analyzing}
              className="gap-2"
              variant="secondary"
              size="sm"
            >
              {analyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Scanning {analyzeProgress}%</>
              ) : (
                <><Film className="h-4 w-4" />Analyze All Frames ({frames.length})</>
              )}
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">
              Frame {currentFrameIdx + 1} / {frames.length}
            </span>
          </div>

          {analyzing && (
            <Progress value={analyzeProgress} className="w-full" />
          )}

          <div className="relative overflow-hidden rounded-lg border border-border bg-black/50">
            <canvas ref={canvasRef} className="mx-auto block" />
          </div>

          {/* Frame timeline */}
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/30 bg-card/30 p-2">
            {frames.map((frame, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentFrameIdx(idx)}
                className={`h-12 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                  idx === currentFrameIdx
                    ? 'border-primary shadow-lg shadow-primary/30'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={frame} alt={`Frame ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
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
                        <p className="truncate text-sm font-medium text-foreground">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(detection.confidence * 100)}%</p>
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
              setVideoFile(null);
              setFrames([]);
              setCurrentFrameIdx(0);
            }}
            disabled={isAnalyzing || analyzing}
          >
            Upload New Video
          </Button>
        </div>
      )}
    </div>
  );
}
