import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFavorite } from '@/hooks/use-favorite';
import { Listing } from '@/lib/types';
import { OptimizedImage } from './OptimizedImage';

interface ListingCardProps extends Listing {
  onClick: () => void;
  isPriority?: boolean;
}

export function ListingCard({ id, title, price, images, location, status, is_favorited, onClick, isPriority = false }: ListingCardProps) {
  const { toggleFavorite, isLoading: isFavoriting } = useFavorite(id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(!!is_favorited);
  };

  const firstImage = images?.[0];

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
        {firstImage ? (
          <OptimizedImage
            path={firstImage.path}
            alt={title}
            blurhash={firstImage.blurhash}
            width={firstImage.width}
            height={firstImage.height}
            sha256={firstImage.sha256}
            priority={isPriority}
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, (max-width: 1440px) 23vw, 360px"
            className="rounded-md"
          />
        ) : (
          <div className="aspect-[4/3] bg-muted rounded-md" />
        )}
        
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