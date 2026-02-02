import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onImageSelect: (imageBase64: string) => void;
  isAnalyzing: boolean;
}

export function ImageUploader({ onImageSelect, isAnalyzing }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

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

  const clearImage = useCallback(() => {
    setPreview(null);
  }, []);

  if (preview) {
    return (
      <div className="relative rounded-lg border-2 border-border bg-card/50 p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10"
          onClick={clearImage}
          disabled={isAnalyzing}
        >
          <X className="h-4 w-4" />
        </Button>
        <img
          src={preview}
          alt="Upload preview"
          className="mx-auto max-h-[300px] rounded-lg object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        dragActive
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card/50 hover:border-primary/50 hover:bg-card'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={isAnalyzing}
      />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-primary/20 p-4">
          {dragActive ? (
            <ImageIcon className="h-8 w-8 text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>
        <div>
          <p className="font-medium text-foreground">
            {dragActive ? 'Drop your image here' : 'Drag & drop an image'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse files
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Supports: JPG, PNG, WebP
        </p>
      </div>
    </div>
  );
}
