import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ImageUploadPreviewProps {
  status: 'compressing' | 'done' | 'error';
  progress: number;
  previewUrl: string;
  onRemove: () => void;
}

export function ImageUploadPreview({ status, progress, previewUrl, onRemove }: ImageUploadPreviewProps) {
  return (
    <div className="relative group aspect-square">
      <img
        src={previewUrl}
        alt="Image preview"
        className="w-full h-full object-cover rounded-lg border"
      />
      {status !== 'done' && (
        <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center p-2 text-white">
          {status === 'compressing' && (
            <>
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-xs text-center mb-2">Optimizing...</p>
              <Progress value={progress} className="w-full h-1.5 bg-gray-500" />
            </>
          )}
          {status === 'error' && (
            <>
              <AlertTriangle className="w-6 h-6 text-destructive mb-2" />
              <p className="text-xs text-center">Failed</p>
            </>
          )}
        </div>
      )}
      <Button
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}