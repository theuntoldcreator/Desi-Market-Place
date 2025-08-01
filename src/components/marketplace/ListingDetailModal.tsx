import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Heart, MessageSquare, Pencil, Trash2, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface ListingDetailModalProps {
  listing: any;
  isOpen: boolean;
  isOwner: boolean;
  onClose: () => void;
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void;
  onSendMessage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ListingDetailModal({
  listing,
  isOpen,
  isOwner,
  onClose,
  onFavoriteToggle,
  onSendMessage,
  onEdit,
  onDelete,
}: ListingDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isMobile = useIsMobile();

  if (!listing) return null;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % listing.image_urls.length);
  };
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + listing.image_urls.length) % listing.image_urls.length);
  };

  const fullName = `${listing.seller?.first_name || ''} ${listing.seller?.last_name || ''}`.trim() || 'Unknown User';
  const fallback = fullName?.[0]?.toUpperCase();

  const creationDate = new Date(listing.created_at);
  const expirationDate = addDays(creationDate, 20);
  const daysRemaining = differenceInDays(expirationDate, new Date());

  let expirationText = '';
  if (daysRemaining < 0) {
    expirationText = 'Expired';
  } else if (daysRemaining === 0) {
    expirationText = 'Expires today';
  } else {
    expirationText = `Expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "w-[95vw] max-w-4xl p-0 gap-0 rounded-lg max-h-[90vh] overflow-y-auto",
        isMobile && "hide-scrollbar"
      )}>
        <DialogHeader className="sr-only">
          <DialogTitle>{listing.title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative bg-black flex items-center justify-center md:rounded-l-lg overflow-hidden aspect-[4/3] md:aspect-square">
            <img src={listing.image_urls[currentImageIndex]} alt={listing.title} className="w-full h-full object-contain" />
            {listing.image_urls.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={prevImage}><ChevronLeft /></Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={nextImage}><ChevronRight /></Button>
              </>
            )}
          </div>

          <div className="flex flex-col p-6 md:p-8">
            <div className="flex-grow space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12"><AvatarImage src={listing.seller?.avatar_url} /><AvatarFallback>{fallback}</AvatarFallback></Avatar>
                <div>
                  <p className="font-semibold text-lg">{fullName}</p>
                  <p className="text-sm text-muted-foreground">Seller</p>
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight">{listing.title}</h1>
              
              <div className="space-y-2">
                <p className="text-4xl font-bold text-primary">
                  {listing.price === 0 ? 'Free' : `$${listing.price.toLocaleString()}`}
                </p>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{listing.location}</span>
                </div>
              </div>

              <article className="prose prose-sm max-w-none text-foreground/90">
                <p>{listing.description || 'No description provided.'}</p>
              </article>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>{expirationText}</span>
                </div>
                <p className="text-muted-foreground">Posted {listing.timeAgo}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {isOwner ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={onEdit}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
                    <Button variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
                  </div>
                ) : (
                  <div className="flex items-stretch gap-2">
                    <Button className="flex-grow" onClick={onSendMessage}><MessageSquare className="w-4 h-4 mr-2" />Chat on WhatsApp</Button>
                    <Button variant="outline" size="icon" className="aspect-square h-auto" onClick={() => onFavoriteToggle?.(listing.id, listing.isFavorited)}>
                      <Heart className={cn("w-5 h-5", listing.isFavorited && "fill-destructive text-destructive")} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}