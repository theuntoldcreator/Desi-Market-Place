import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Heart, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 grid grid-cols-1 md:grid-cols-2 rounded-lg">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-50 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>

        <div className="relative bg-black flex items-center justify-center md:rounded-l-lg overflow-hidden aspect-square">
          <img src={listing.image_urls[currentImageIndex]} alt={listing.title} className="w-full h-full object-contain" />
          {listing.image_urls.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={prevImage}><ChevronLeft /></Button>
              <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={nextImage}><ChevronRight /></Button>
            </>
          )}
        </div>

        <div className="flex flex-col p-6 overflow-y-auto max-h-[90vh]">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <p className="text-3xl font-bold text-primary">
              {listing.price === 0 ? 'Free' : `$${listing.price.toLocaleString()}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Listed {listing.timeAgo} in {listing.location}
            </p>
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

          <div className="flex-grow space-y-4">
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{listing.description || 'No description provided.'}</p>
            </div>
            <div className="mt-auto pt-4">
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