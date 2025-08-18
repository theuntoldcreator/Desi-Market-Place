import { useEffect } from 'react';

interface LcpImagePreloaderProps {
  imageUrl: string;
}

export function LcpImagePreloader({ imageUrl }: LcpImagePreloaderProps) {
  useEffect(() => {
    if (!imageUrl) return;

    const linkId = 'lcp-image-preload-link';
    // Avoid adding duplicate links
    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'preload';
    link.as = 'image';
    link.href = imageUrl;
    
    document.head.appendChild(link);

    // No cleanup needed, we want it to stay for the session
  }, [imageUrl]);

  return null;
}