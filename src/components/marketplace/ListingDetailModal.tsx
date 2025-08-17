import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, MapPin, Info, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Listing } from '@/lib/types';

interface ListingDetailModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

export function ListingDetailModal({
  listing,
  isOpen,
  onClose,
}: ListingDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    setIsImageLoading(true);
  }, [currentImageIndex, listing?.image_urls]);

  if (!listing) return null;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % listing.image_urls.length);
  };
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + listing.image_urls.length) % listing.image_urls.length);
  };

  const creationDate = new Date(listing.created_at);
  const expirationDate = addDays(creationDate, 1);
  const daysRemaining = differenceInDays(expirationDate, new Date());

  let expirationText = '';
  if (daysRemaining < 0) {
    expirationText = 'Expired';
  } else if (daysRemaining === 0) {
    expirationText = 'Expires today';
  } else {
    expirationText = `Expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
  }

  const conditionMap: { [key: string]: string } = { new: 'New', like_new: 'Like New', used: 'Used' };
  const categoryMap: { [key: string]: string } = { electronics: 'Electronics', books: 'Books & Study', furniture: 'Furniture', vehicles: 'Vehicles', clothing: 'Clothing', gaming: 'Gaming', free: 'Free Stuff' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-4xl sm:max-h-[90vh] sm:rounded-2xl flex flex-col sm:flex-row overflow-hidden"
        showCloseButton={false}
      >
        <div className="absolute top-4 right-4 z-20">
          <Button variant="ghost" size="icon" className="bg-background/50 border border-primary text-primary rounded-full hover:bg-primary/10 hover:text-black" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="relative bg-muted flex items-center justify-center aspect-square sm:aspect-auto sm:w-1/2 sm:h-full sm:flex-shrink-0">
          {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full z-10" />}
          {listing.status === 'sold' && <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold z-20">SOLD</div>}
          <img
            src={listing.image_urls[currentImageIndex]}
            alt={listing.title}
            className={cn(
              "w-full h-full object-contain z-10 transition-opacity duration-500",
              isImageLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
          {listing.image_urls.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={prevImage}><ChevronLeft /></Button>
              <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={nextImage}><ChevronRight /></Button>
            </>
          )}
        </div>

        <div className="flex-grow overflow-y-auto hide-scrollbar p-4 space-y-4 sm:w-1/2 sm:h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-4 sm:pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1>
            <p className="text-2xl font-bold">{listing.price === 0 ? 'Free' : `$${listing.price.toLocaleString()}`}</p>
            <div className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
              <MapPin className="w-4 h-4" />
              <span>{listing.location}</span>
              <span className="mx-1">&middot;</span>
              <span>Posted {formatDistanceToNow(creationDate, { addSuffix: true })}</span>
            </div>
          </div>
          <Separator />
          
          {listing.contact && (
            <>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Contact Seller</h2>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="w-5 h-5 text-primary" />
                  <p className="font-mono text-sm">{listing.contact}</p>
                </div>
                <Alert variant="default" className="text-xs">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Contact the seller using the information provided. Always practice safety when meeting or transacting.
                  </AlertDescription>
                </Alert>
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Details</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span>Category</span><span className="text-muted-foreground capitalize">{categoryMap[listing.category] || listing.category}</span></div>
              {listing.condition && <div className="flex justify-between"><span>Condition</span><span className="text-muted-foreground">{conditionMap[listing.condition]}</span></div>}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between cursor-help"><span>Listing Status</span><span className="text-muted-foreground">{expirationText}</span></div>
                </TooltipTrigger>
                <TooltipContent><p>Expires on {format(expirationDate, 'PPP')}</p></TooltipContent>
              </Tooltip>
            </div>
            {listing.description && <p className="text-sm text-foreground/80 pt-2">{listing.description}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}