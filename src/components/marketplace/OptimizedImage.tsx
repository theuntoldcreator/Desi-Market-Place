import { useState, useEffect } from 'react';
import { Blurhash } from 'react-blurhash';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const MAX_WIDTHS = [240, 360, 480, 720, 1080, 1440];

interface OptimizedImageProps {
  path: string;
  alt: string;
  blurhash: string | null;
  width: number | null;
  height: number | null;
  sha256: string | null;
  className?: string;
  priority?: boolean;
  sizes: string;
}

export function OptimizedImage({
  path,
  alt,
  blurhash,
  width,
  height,
  sha256,
  className,
  priority = false,
  sizes,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const aspectRatio = width && height ? width / height : 4 / 3;

  const getTransformedUrl = (filePath: string, width: number) => {
    const cacheBust = sha256 ? `?v=${sha256.slice(0, 8)}` : '';
    const { data } = supabase.storage
      .from('listing_images')
      .getPublicUrl(filePath, {
        transform: {
          width,
          quality: 75,
          format: 'webp',
        },
      });
    return `${data.publicUrl}${cacheBust}`;
  };

  const srcSet = MAX_WIDTHS.map(w => `${getTransformedUrl(path, w)} ${w}w`).join(', ');
  const src = getTransformedUrl(path, MAX_WIDTHS[2]); // Default src

  useEffect(() => {
    if (priority) {
      const img = new Image();
      img.src = src;
      img.srcset = srcSet;
      img.onload = () => setIsLoaded(true);
    }
  }, [priority, src, srcSet]);

  return (
    <div
      className={cn('relative overflow-hidden bg-muted', className)}
      style={{ aspectRatio }}
    >
      {blurhash && (
        <Blurhash
          hash={blurhash}
          width="100%"
          height="100%"
          resolutionX={32}
          resolutionY={32}
          punch={1}
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-500',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  );
}