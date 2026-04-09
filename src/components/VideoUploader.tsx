import { useCallback, useState } from 'react';
import { Upload, Film, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
  isAnalyzing: boolean;
}

export function VideoUploader({ onVideoSelect, isAnalyzing }: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onVideoSelect(file);
  }, [onVideoSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const clearVideo = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }, [preview]);

  if (preview) {
    return (
      <div className="relative rounded-xl border border-border/50 bg-card/30 p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 hover:bg-destructive/10 hover:text-destructive"
          onClick={clearVideo}
          disabled={isAnalyzing}
        >
          <X className="h-4 w-4" />
        </Button>
        <video
          src={preview}
          controls
          className="mx-auto max-h-[300px] rounded-lg"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
        dragActive
          ? 'border-primary bg-primary/10 shadow-xl shadow-primary/20 scale-[1.01]'
          : 'border-border/50 bg-card/30 hover:border-secondary/60 hover:bg-card/50 hover:shadow-lg hover:shadow-secondary/10'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={isAnalyzing}
      />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`rounded-full p-4 transition-all duration-300 ${dragActive ? 'bg-gradient-primary scale-110' : 'bg-primary/20'}`}>
          {dragActive ? (
            <Film className={`h-8 w-8 ${dragActive ? 'text-primary-foreground' : 'text-primary'}`} />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>
        <div>
          <p className="font-medium text-foreground">
            {dragActive ? 'Drop your video here' : 'Drag & drop a video'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse files
          </p>
        </div>
        <p className="rounded-full bg-secondary/15 px-3 py-1 text-xs text-secondary">
          Supports: MP4, WebM, MOV, AVI
        </p>
      </div>
    </div>
  );
}
