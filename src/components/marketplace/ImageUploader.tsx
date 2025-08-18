import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageMetadata } from '@/lib/types';

interface ImageUploaderProps {
  listingId: number;
  onUploadComplete: (image: ImageMetadata) => void;
  onDelete: (path: string) => void;
  existingImages: ImageMetadata[];
}

export function ImageUploader({ listingId, onUploadComplete, onDelete, existingImages }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = async (acceptedFiles: File[]) => {
    if (existingImages.length + acceptedFiles.length > 5) {
      toast({ title: 'Limit Reached', description: 'You can only upload up to 5 images.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    for (const file of acceptedFiles) {
      const fileExt = file.name.split('.').pop();
      const filePath = `listings/${listingId}/${nanoid()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('listing_images')
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: 'Upload Error', description: uploadError.message, variant: 'destructive' });
        continue;
      }

      try {
        const { data: imageData, error: functionError } = await supabase.functions.invoke('image-metadata', {
          body: { path: filePath, listingId },
        });

        if (functionError) throw new Error(functionError.message);
        onUploadComplete(imageData);
      } catch (error) {
        toast({ title: 'Processing Error', description: (error as Error).message, variant: 'destructive' });
      }
    }
    setIsUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p>Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
            <p>{isDragActive ? 'Drop the files here...' : "Drag 'n' drop images, or click to select"}</p>
            <p className="text-sm text-muted-foreground">Max 5 images, up to 5MB each</p>
          </div>
        )}
      </div>
      {existingImages.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {existingImages.map((image) => (
            <div key={image.path} className="relative group aspect-square">
              <img src={supabase.storage.from('listing_images').getPublicUrl(image.path).data.publicUrl} alt="Uploaded preview" className="w-full h-full object-cover rounded-lg border" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100"
                onClick={() => onDelete(image.path)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}