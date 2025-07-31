import { useState } from 'react';
import { Heart, MapPin, MessageSquare, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ListingCardProps {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_urls: string[];
  location: string;
  contact: string;
  seller: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
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
  isFavorited = false, isOwner = false, onFavoriteToggle, onDelete, onEdit
}: ListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const session = useSession();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % image_urls.length); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + image_urls.length) % image_urls.length); };

  const handleStartChat = async () => {
    setIsStartingChat(true);
    if (!session) {
      toast({ title: "Authentication required", description: "Please log in to start a chat.", variant: "destructive" });
      setIsStartingChat(false);
      return;
    }
    if (session.user.id === seller.id) {
      toast({ title: "Cannot chat with yourself", description: "This is your own listing.", variant: "destructive" });
      setIsStartingChat(false);
      return;
    }

    const [user1_id, user2_id] = [session.user.id, seller.id].sort();

    try {
      let { data: chat } = await supabase.from('chats').select('id').eq('user1_id', user1_id).eq('user2_id', user2_id).single();

      if (!chat) {
        const { data: newChat, error: insertError } = await supabase.from('chats').insert({ user1_id, user2_id }).select('id').single();
        if (insertError) throw insertError;
        chat = newChat;
      }
      
      navigate(`/messages/${chat.id}`);
    } catch (error: any) {
      if (error.code !== 'PGRST116') { // Ignore "No rows found" error, as we handle it by creating a chat.
        toast({ title: "Error starting chat", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsStartingChat(false);
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
              <div className="flex items-center gap-2 min-w-0"><Avatar className="w-8 h-8"><AvatarImage src={seller.avatar_url} /><AvatarFallback>{seller.full_name?.[0]}</AvatarFallback></Avatar><span className="text-sm font-medium truncate">{seller.full_name}</span></div>
              <Button onClick={handleStartChat} size="sm" disabled={isStartingChat}><MessageSquare className="w-3 h-3 mr-1" /> Chat</Button>
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}><DialogContent className="max-w-4xl p-0"><img src={image_urls[currentImageIndex]} alt={title} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" /></DialogContent></Dialog>
    </Card>
  );
}