import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Heart, MessageSquare, Pencil, Tag, Clock, MapPin, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays, formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

interface ListingDetailModalProps {
  listing: any;
  isOpen: boolean;
  isOwner: boolean;
  onClose: () => void;
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void;
  onSendMessage?: () => void;
  onEdit?: () => void;
  onMarkAsSold?: () => void;
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
  onMarkAsSold,
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

  const conditionMap: { [key: string]: string } = {
    new: 'New',
    like_new: 'Like New',
    used: 'Used',
  };

  const categoryMap: { [key: string]: string } = {
    electronics: 'Electronics',
    books: 'Books & Study',
    furniture: 'Furniture',
    vehicles: 'Vehicles',
    clothing: 'Clothing',
    gaming: 'Gaming',
    free: 'Free Stuff',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "w-[95vw] max-w-4xl p-0 gap-0 rounded-lg max-h-[90vh] flex flex-col",
        isMobile && "hide-scrollbar"
      )}>
        <DialogHeader className="sr-only">
          <DialogTitle>{listing.title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 flex-grow overflow-hidden">
          {/* Image Section */}
          <div className="relative bg-black flex items-center justify-center md:rounded-l-lg overflow-hidden aspect-video md:aspect-auto">
            {listing.status === 'sold' && (
              <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold z-20">
                SOLD
              </div>
            )}
            <img src={listing.image_urls[currentImageIndex]} alt={listing.title} className="w-full h-full object-contain z-10" />
            {listing.image_urls.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={prevImage}><ChevronLeft /></Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={nextImage}><ChevronRight /></Button>
              </>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col">
            <div className="p-6 space-y-4 flex-grow overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">{categoryMap[listing.category] || listing.category}</Badge>
                {listing.condition && <Badge variant="outline">{conditionMap[listing.condition]}</Badge>}
              </div>

              <h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1>
              
              <p className="text-3xl font-bold text-primary">
                {listing.price === 0 ? 'Free' : `$${listing.price.toLocaleString()}`}
              </p>

              <div className="space-y-2 text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{listing.location}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>Posted {formatDistanceToNow(creationDate, { addSuffix: true })}</span></div>
              </div>

              <div className="pt-4 border-t">
                <h2 className="font-semibold mb-2 text-sm">Description</h2>
                <p className="text-sm text-foreground/80">{listing.description || 'No description provided.'}</p>
              </div>
              
              <div className="pt-4 border-t">
                <h2 className="font-semibold mb-2 text-sm">Seller Information</h2>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10"><AvatarImage src={listing.seller?.avatar_url} /><AvatarFallback>{fallback}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium">{fullName}</p>
                    <p className="text-sm text-muted-foreground">Member</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="p-4 bg-muted/50 border-t mt-auto">
              <div className="flex items-center justify-center gap-1.5 text-amber-600 font-medium text-xs mb-3">
                <Clock className="w-3 h-3" />
                <span>{expirationText}</span>
              </div>
              
              {isOwner ? (
                <div className="space-y-2">
                  {listing.status !== 'sold' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={onEdit}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
                      <Button onClick={onMarkAsSold}><Tag className="w-4 h-4 mr-2" />Mark as Sold</Button>
                    </div>
                  ) : (
                    <>
                      <Button disabled className="w-full"><Check className="w-4 h-4 mr-2" />Item Sold</Button>
                      <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
                        <Trash2 className="w-4 h-4 mr-2" />Delete Listing Permanently
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                listing.status === 'sold' ? (
                  <Button disabled className="w-full">Item is Sold</Button>
                ) : (
                  <div className="flex items-stretch gap-2">
                    <Button className="flex-grow" onClick={onSendMessage}><MessageSquare className="w-4 h-4 mr-2" />Chat on WhatsApp</Button>
                    <Button variant="outline" size="icon" className="aspect-square h-auto" onClick={() => onFavoriteToggle?.(listing.id, listing.isFavorited)}>
                      <Heart className={cn("w-5 h-5", listing.isFavorited && "fill-destructive text-destructive")} />
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}