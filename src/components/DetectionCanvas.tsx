import { useEffect, useRef } from 'react';
import type { Detection } from '@/types/detection';
import { CATEGORY_CONFIG } from '@/types/detection';

interface DetectionCanvasProps {
  imageSrc?: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
  detections: Detection[];
  width: number;
  height: number;
}

export function DetectionCanvas({ imageSrc, videoRef, detections, width, height }: DetectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw image or video frame
      if (imageSrc) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          drawDetections(ctx, detections, width, height);
        };
        img.src = imageSrc;
      } else if (videoRef?.current) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        drawDetections(ctx, detections, width, height);
      }
    };

    draw();
  }, [imageSrc, detections, width, height, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg"
    />
  );
}

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  canvasWidth: number,
  canvasHeight: number
) {
  detections.forEach(detection => {
    const { boundingBox, category, confidence } = detection;
    const config = CATEGORY_CONFIG[category];

    // Scale bounding box to canvas size
    const x = boundingBox.x * canvasWidth;
    const y = boundingBox.y * canvasHeight;
    const w = boundingBox.width * canvasWidth;
    const h = boundingBox.height * canvasHeight;

    // Draw bounding box
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Draw label background
    const label = `${config.icon} ${config.label} ${Math.round(confidence * 100)}%`;
    ctx.font = 'bold 14px system-ui';
    const textMetrics = ctx.measureText(label);
    const textHeight = 20;
    const padding = 6;

    ctx.fillStyle = config.color;
    ctx.fillRect(
      x,
      y - textHeight - padding,
      textMetrics.width + padding * 2,
      textHeight + padding
    );

    // Draw label text
    ctx.fillStyle = detection.severity === 'warning' ? '#000' : '#fff';
    ctx.fillText(label, x + padding, y - padding);
  });
}
