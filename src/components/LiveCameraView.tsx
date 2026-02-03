import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Play, Square, AlertCircle } from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import type { Detection } from '@/types/detection';
import { CATEGORY_CONFIG } from '@/types/detection';

interface LiveCameraViewProps {
  onFrameCapture: (imageBase64: string) => void;
  detections: Detection[];
  isAnalyzing: boolean;
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

export function LiveCameraView({
  onFrameCapture,
  detections,
  isAnalyzing,
  isActive,
  onToggle,
}: LiveCameraViewProps) {
  const { videoRef, isStreaming, error, startCamera, stopCamera, captureFrame } = useWebcam();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const analyzingRef = useRef(false);
  const inFlightRef = useRef(false);
  const [objectCounts, setObjectCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    analyzingRef.current = isAnalyzing;
    // When the parent says analysis finished, release the local lock too.
    if (!isAnalyzing) inFlightRef.current = false;
  }, [isAnalyzing]);

  // Count objects by category
  useEffect(() => {
    const counts: Record<string, number> = {};
    detections.forEach(d => {
      const label = CATEGORY_CONFIG[d.category].label;
      counts[label] = (counts[label] || 0) + 1;
    });
    setObjectCounts(counts);
  }, [detections]);

  // Draw detections on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !isStreaming) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      ctx.drawImage(video, 0, 0);

      // Draw detection boxes
      detections.forEach(detection => {
        const { boundingBox, category, confidence } = detection;
        const config = CATEGORY_CONFIG[category];

        const x = boundingBox.x * canvas.width;
        const y = boundingBox.y * canvas.height;
        const w = boundingBox.width * canvas.width;
        const h = boundingBox.height * canvas.height;

        // Box
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Label
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

      requestAnimationFrame(draw);
    };

    draw();
  }, [isStreaming, detections, videoRef]);

  // Start/stop capture loop
  // - Uses setTimeout (not setInterval) to avoid overlap.
  // - Uses refs to avoid stale closures on isAnalyzing.
  // - Uses a local single-flight lock to prevent rapid double-submits.
  useEffect(() => {
    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const tick = () => {
      // Stop conditions
      if (!isActive || !isStreaming) {
        clearTimer();
        return;
      }

      // If analysis is still running, poll soon (don't enqueue new work)
      if (analyzingRef.current || inFlightRef.current) {
        timeoutRef.current = window.setTimeout(tick, 250);
        return;
      }

      const frame = captureFrame();
      if (frame) {
        // Lock immediately (parent state update can lag by a render)
        inFlightRef.current = true;
        onFrameCapture(frame);
      }

      // Next scheduled capture (conservative to avoid provider rate limits)
      timeoutRef.current = window.setTimeout(tick, 3000);
    };

    clearTimer();

    if (isActive && isStreaming) {
      tick();
    }

    return clearTimer;
  }, [isActive, isStreaming, captureFrame, onFrameCapture]);

  const handleStart = useCallback(async () => {
    await startCamera();
    onToggle(true);
  }, [startCamera, onToggle]);

  const handleStop = useCallback(() => {
    stopCamera();
    onToggle(false);
  }, [stopCamera, onToggle]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Video className="h-5 w-5 text-emerald-500" />
          ) : (
            <VideoOff className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">
            {isStreaming ? 'Camera Active' : 'Camera Off'}
          </span>
          {isActive && isAnalyzing && (
            <span className="ml-2 animate-pulse text-sm text-primary">● Detecting</span>
          )}
        </div>

        <div className="flex gap-2">
          {!isStreaming ? (
            <Button onClick={handleStart} className="gap-2">
              <Play className="h-4 w-4" />
              Start Camera
            </Button>
          ) : (
            <Button onClick={handleStop} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              Stop Camera
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/20 p-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover opacity-0"
        />
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain"
        />
        
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80">
            <div className="text-center">
              <VideoOff className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Camera not active</p>
            </div>
          </div>
        )}

        {/* Object count overlay */}
        {Object.keys(objectCounts).length > 0 && (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {Object.entries(objectCounts).map(([label, count]) => (
              <div
                key={label}
                className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white"
              >
                {label}: {count}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
