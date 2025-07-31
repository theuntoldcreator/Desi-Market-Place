import { useState } from 'react';
import { Heart, MapPin, MessageSquare, ChevronLeft, ChevronRight, Trash2, Pencil, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn, formatFullName } from '@/lib/utils';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types';

type SellerProfile = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;

interface ListingCardProps {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_urls: string[];
  location: string;
  seller: SellerProfile;
  category: string;
  timeAgo: string;
  isFavorited?: boolean;
  isOwner?: boolean;
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function ListingCard({
  id, title, description, price, image_urls, location, seller, category, timeAgo,
  isFavorited = false, isOwner: isOwnerProp, onFavoriteToggle, onDelete, onEdit
}: ListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const session = useSession();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  // The card can now determine if it's the owner, even if not explicitly told.
  const isOwner = isOwnerProp !== undefined ? isOwnerProp : (session?.user?.id === seller.id);

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % image_urls.length); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + image_urls.length) % image_urls.length); };

  const handlePingSeller = async () => {
    setIsPinging(true);
    if (!session) {
      toast({ title: "Authentication required", description: "Please log in to ping the seller.", variant: "destructive" });
      setIsPinging(false);
      return;
    }
    if (session.user.id === seller.id) {
      toast({ title: "This is your listing", description: "You cannot start a chat on your own item.", variant: "destructive" });
      setIsPinging(false);
      return;
    }

    try {
      const { data: existingChat } = await supabase.from('chats').select('id, status').eq('listing_id', id).eq('buyer_id', session.user.id).single();
      if (existingChat) {
        toast({ title: "Already Pinging or Active", description: "You already have a conversation for this item." });
        navigate(`/messages/${existingChat.id}`);
        return;
      }

      const { error } = await supabase.from('chats').insert({ listing_id: id, buyer_id: session.user.id, seller_id: seller.id });
      if (error) throw error;

      toast({ title: "Ping Sent!", description: "The seller has been notified. You can see the request in your messages." });
    } catch (error: any) {
      if (error.code !== 'PGRST116') { // Ignore "No rows found" which is expected
        toast({ title: "Error Sending Ping", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white overflow-hidden transform hover:-translate-y-1 flex flex-col">
      <CardContent className="p-0 flex flex-col flex-grow">
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
        <div className="p-4 space-y-3 flex flex-col flex-grow">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg truncate group-hover:text-primary" title={title}>{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 h-10">{description || 'No description provided.'}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-marketplace-price-text">${price.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{timeAgo}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> <span className="truncate">{location}</span></div>
          <div className="flex-grow" />
          {isOwner ? (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button onClick={onEdit} size="sm" variant="outline"><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
              <Button onClick={onDelete} size="sm" variant="destructive"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 min-w-0"><Avatar className="w-8 h-8"><AvatarImage src={seller.avatar_url ?? ''} /><AvatarFallback>{seller.first_name?.[0]}</AvatarFallback></Avatar><span className="text-sm font-medium truncate">{formatFullName(seller)}</span></div>
              <Button onClick={handlePingSeller} size="sm" disabled={isPinging}>
                {isPinging ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                Ping Seller
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}><DialogContent className="max-w-4xl p-0"><img src={image_urls[currentImageIndex]} alt={title} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" /></DialogContent></Dialog>
    </Card>
  );
}