import { useState } from 'react';
import { Heart, MapPin, Phone, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  image_urls: string[];
  location: string;
  contact: string;
  seller: {
    full_name: string;
    avatar_url?: string;
  };
  category: string;
  timeAgo: string;
  isFavorited?: boolean;
  isOwner?: boolean;
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void;
  onContact?: (contact: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function ListingCard({
  id, title, price, image_urls, location, contact, seller, category, timeAgo,
  isFavorited = false, isOwner = false, onFavoriteToggle, onContact, onDelete, onEdit
}: ListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % image_urls.length); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + image_urls.length) % image_urls.length); };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white overflow-hidden transform hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative h-52 bg-muted overflow-hidden" onClick={() => setIsImageModalOpen(true)}>
          {image_urls.length > 0 ? (
            <>
              <img src={image_urls[currentImageIndex]} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              {image_urls.length > 1 && (
                <>
                  <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-8 w-8" onClick={prevImage}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-8 w-8" onClick={nextImage}><ChevronRight className="w-4 h-4" /></Button>
                </>
              )}
            </>
          ) : <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>}
          {!isOwner && (
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm h-8 w-8" onClick={(e) => { e.stopPropagation(); onFavoriteToggle?.(id, isFavorited); }}>
              <Heart className={cn("w-4 h-4 transition-all", isFavorited ? 'fill-red-500 text-red-500' : 'text-white')} />
            </Button>
          )}
          <Badge variant="secondary" className="absolute top-2 left-2 bg-white/90">{category}</Badge>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 h-14 group-hover:text-primary">{title}</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-marketplace-price-text">${price.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> <span className="truncate">{location}</span></div>
          
          {isOwner ? (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button onClick={onEdit} size="sm" variant="outline"><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
              <Button onClick={onDelete} size="sm" variant="destructive"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 min-w-0"><Avatar className="w-8 h-8"><AvatarImage src={seller.avatar_url} /><AvatarFallback>{seller.full_name?.[0]}</AvatarFallback></Avatar><span className="text-sm font-medium truncate">{seller.full_name}</span></div>
              <Button onClick={() => onContact?.(contact)} size="sm"><Phone className="w-3 h-3 mr-1" /> Contact</Button>
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl p-0"><img src={image_urls[currentImageIndex]} alt={title} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" /></DialogContent>
      </Dialog>
    </Card>
  );
}