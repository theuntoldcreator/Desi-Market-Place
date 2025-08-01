import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { MapPin } from 'lucide-react';

interface ListingCardProps {
  title: string;
  price: number;
  image_urls: string[];
  location: string;
  onClick: () => void;
  status?: string;
}

export function ListingCard({ title, price, image_urls, location, onClick, status }: ListingCardProps) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden rounded-lg border bg-card shadow-sm cursor-pointer relative"
    >
      {status === 'sold' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <span className="text-white text-2xl font-bold bg-destructive/80 px-4 py-2 rounded">SOLD</span>
        </div>
      )}
      <CardContent className="p-0">
        <AspectRatio ratio={1 / 1} className="bg-muted">
          <img
            src={image_urls[0]}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </AspectRatio>
        <div className="p-3 space-y-1">
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