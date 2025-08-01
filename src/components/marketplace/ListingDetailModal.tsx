import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Heart, MessageSquare, MoreHorizontal, Pencil, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays } from 'date-fns';

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
      <DialogContent className="w-[95vw] max-w-4xl p-0 rounded-lg max-h-[90vh] flex flex-col md:flex-row overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full h-9 w-9"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="relative bg-black flex items-center justify-center flex-shrink-0 md:w-1/2">
          <div className="w-full aspect-[4/3] md:aspect-square">
            <img src={listing.image_urls[currentImageIndex]} alt={listing.title} className="w-full h-full object-contain" />
          </div>
          {listing.image_urls.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={prevImage}><ChevronLeft /></Button>
              <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={nextImage}><ChevronRight /></Button>
            </>
          )}
        </div>

        <div className="flex flex-col p-6 overflow-y-auto md:w-1/2">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <p className="text-3xl font-bold text-primary">
              {listing.price === 0 ? 'Free' : `$${listing.price.toLocaleString()}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Listed {listing.timeAgo} in {listing.location}
            </p>
            <div className="flex items-center gap-1.5 text-sm text-amber-600">
              <Clock className="w-4 h-4" />
              <span>{expirationText}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 my-4">
            {isOwner ? (
              <>
                <Button className="flex-1" variant="outline" onClick={onEdit}><Pencil className="w-4 h-4 mr-2" /> Edit</Button>
                <Button className="flex-1" variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
              </>
            ) : (
              <>
                <Button className="flex-1" onClick={onSendMessage}><MessageSquare className="w-4 h-4 mr-2" /> Chat on WhatsApp</Button>
                <Button variant="outline" size="icon" onClick={() => onFavoriteToggle?.(listing.id, listing.isFavorited)}>
                  <Heart className={cn("w-4 h-4", listing.isFavorited && "fill-red-500 text-red-500")} />
                </Button>
                <Button variant="outline" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
              </>
            )}
          </div>

          <hr className="my-2" />

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{listing.description || 'No description provided.'}</p>
            </div>
            <div className="pt-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-12 h-12"><AvatarImage src={listing.seller?.avatar_url} /><AvatarFallback>{fallback}</AvatarFallback></Avatar>
                <div>
                  <p className="font-semibold">{fullName}</p>
                  <p className="text-sm text-muted-foreground">Seller</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}