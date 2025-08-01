import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Heart, MessageSquare, Pencil, Tag, Clock, MapPin, Check, Trash2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  if (!listing) return null;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % listing.image_urls.length);
  };
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + listing.image_urls.length) % listing.image_urls.length);
  };

  const handleShare = async () => {
    const shareData = {
      title: listing.title,
      text: `Check out this listing on Eagle Market Place: ${listing.title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error("Web Share API not supported");
      }
    } catch (err) {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied to clipboard!' });
    }
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

  const conditionMap: { [key: string]: string } = { new: 'New', like_new: 'Like New', used: 'Used' };
  const categoryMap: { [key: string]: string } = { electronics: 'Electronics', books: 'Books & Study', furniture: 'Furniture', vehicles: 'Vehicles', clothing: 'Clothing', gaming: 'Gaming', free: 'Free Stuff' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-full p-0 gap-0 rounded-none sm:max-w-lg sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col">
        <div className="flex-grow overflow-y-auto">
          <div className="relative bg-muted flex items-center justify-center aspect-square">
            {listing.status === 'sold' && <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold z-20">SOLD</div>}
            <img src={listing.image_urls[currentImageIndex]} alt={listing.title} className="w-full h-full object-contain z-10" />
            {listing.image_urls.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={prevImage}><ChevronLeft /></Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={nextImage}><ChevronRight /></Button>
              </>
            )}
            {/* Mobile-only close button (top-left) */}
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-20 sm:hidden bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={onClose}><X className="h-5 w-5" /></Button>
            {/* Desktop-only close button (top-right) */}
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-20 hidden sm:inline-flex bg-black/30 hover:bg-black/50 text-white rounded-full" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>

          <div className="p-4 space-y-4">
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
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12"><AvatarImage src={listing.seller?.avatar_url} /><AvatarFallback>{fallback}</AvatarFallback></Avatar>
              <div>
                <p className="font-semibold">{fullName}</p>
                <p className="text-sm text-muted-foreground">Seller Information</p>
              </div>
            </div>
            <Separator />
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
                    <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" />Delete Listing</Button>
                  </>
                )}
              </div>
            ) : (
              listing.status !== 'sold' && (
                <div className="space-y-3">
                  <Button className="w-full" onClick={onSendMessage}><MessageSquare className="w-4 h-4 mr-2" />Chat on WhatsApp</Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => onFavoriteToggle?.(listing.id, listing.isFavorited)}>
                      <Heart className={cn("w-4 h-4 mr-2", listing.isFavorited && "fill-destructive text-destructive")} />
                      {listing.isFavorited ? 'Saved' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" />Share</Button>
                  </div>
                </div>
              )
            )}
            <Separator />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}