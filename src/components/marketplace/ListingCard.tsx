import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { useFavorite } from '@/hooks/use-favorite';
import { Listing } from '@/lib/types';

interface ListingCardProps extends Listing {
  onClick: () => void;
}

export function ListingCard({ id, title, price, image_urls, location, status, is_favorited, onClick }: ListingCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { toggleFavorite, isLoading: isFavoriting } = useFavorite(id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(!!is_favorited);
  };

  return (
    <Card
      onClick={onClick}
      className="border bg-card shadow-sm cursor-pointer relative group"
    >
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
        onClick={handleFavoriteClick}
        disabled={isFavoriting}
      >
        <Heart className={cn("w-4 h-4", is_favorited ? "fill-red-500 text-red-500" : "text-white")} />
      </Button>

      {status === 'sold' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
          <span className="text-white text-2xl font-bold bg-destructive/80 px-4 py-2 rounded">SOLD</span>
        </div>
      )}
      <CardContent className="p-3 space-y-3">
        <AspectRatio ratio={1 / 1} className="bg-muted rounded-md overflow-hidden relative">
          {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full z-10" />}
          <img
            src={image_urls[0]}
            alt={title}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-500",
              isImageLoading ? "opacity-0" : "opacity-100"
            )}
            loading="lazy"
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </AspectRatio>
        
        <div className="space-y-1">
          <p className="font-bold text-lg text-primary">
            {price === 0 ? 'Free' : `$${price.toLocaleString()}`}
          </p>
          <h3 className="font-semibold truncate" title={title}>{title}</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}