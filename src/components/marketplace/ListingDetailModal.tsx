import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, MapPin, Info, MessageCircle, Send, Mail, Edit, Trash2, CheckCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Listing } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOwner = user?.id === listing?.user_id;

  const handleLoginClick = () => {
    onClose();
    navigate('/login', { state: { listingId: listing.id } });
  };

  const updateListingStatusMutation = useMutation({
    mutationFn: async (status: 'sold' | 'active') => {
      const { error } = await supabase
        .from('listings')
        .update({ status })
        .eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast({ title: "Success!", description: `Listing marked as ${status}.` });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['userListings', user?.id] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to update status: ${error.message}`, variant: "destructive" });
    }
  });

  const deleteListingMutation = useMutation({
    mutationFn: async () => {
      if (listing.image_urls && listing.image_urls.length > 0) {
        const folderPath = new URL(listing.image_urls[0]).pathname.split('/').slice(4, -1).join('/');
        if (folderPath) {
          const { data: files, error: listError } = await supabase.storage.from('listing_images').list(folderPath);
          if (listError) console.error('Error listing files:', listError);
          if (files && files.length > 0) {
            const filePaths = files.map(file => `${folderPath}/${file.name}`);
            const { error: removeError } = await supabase.storage.from('listing_images').remove(filePaths);
            if (removeError) console.error('Error removing images:', removeError);
          }
        }
      }
      const { error } = await supabase.from('listings').delete().eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Listing has been deleted." });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['userListings', user?.id] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to delete listing: ${error.message}`, variant: "destructive" });
    }
  });

  useEffect(() => {
    setIsImageLoading(true);
  }, [currentImageIndex, listing?.image_urls]);

  if (!listing) return null;

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % listing.image_urls.length); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + listing.image_urls.length) % listing.image_urls.length); };

  const creationDate = new Date(listing.created_at);
  const expirationDate = addDays(creationDate, 1);
  const daysRemaining = differenceInDays(expirationDate, new Date());
  let expirationText = daysRemaining < 0 ? 'Expired' : daysRemaining === 0 ? 'Expires today' : `Expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
  const conditionMap: { [key: string]: string } = { new: 'New', like_new: 'Like New', used: 'Used' };
  const categoryMap: { [key: string]: string } = { electronics: 'Electronics', books: 'Books & Study', furniture: 'Furniture', vehicles: 'Vehicles', clothing: 'Clothing', gaming: 'Gaming', free: 'Free Stuff' };
  const contactParts = listing.contact?.match(/^([^:]+):(.*)$/);
  const contactMethod = contactParts ? contactParts[1] : null;
  const contactValue = contactParts ? contactParts[2] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-4xl sm:max-h-[90vh] sm:rounded-2xl flex flex-col sm:flex-row overflow-hidden" showCloseButton={false}>
        <div className="absolute top-4 right-4 z-20"><Button variant="ghost" size="icon" className="bg-background/50 border border-primary text-primary rounded-full hover:bg-primary/10 hover:text-black" onClick={onClose}><X className="h-5 w-5" /></Button></div>
        <div className="relative bg-muted flex items-center justify-center aspect-square sm:aspect-auto sm:w-1/2 sm:h-full sm:flex-shrink-0">
          {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full z-10" />}
          {listing.status === 'sold' && <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold z-20">SOLD</div>}
          <img src={listing.image_urls[currentImageIndex]} alt={listing.title} className={cn("w-full h-full object-contain z-10 transition-opacity duration-500", isImageLoading ? "opacity-0" : "opacity-100")} onLoad={() => setIsImageLoading(false)} onError={() => setIsImageLoading(false)} />
          {listing.image_urls.length > 1 && (<><Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={prevImage}><ChevronLeft /></Button><Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={nextImage}><ChevronRight /></Button></>)}
        </div>
        <div className="flex-grow overflow-y-auto hide-scrollbar p-4 space-y-4 sm:w-1/2 sm:h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-4 sm:pb-4">
          {user ? (
            <>
              <div className="space-y-1"><h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1><p className="text-2xl font-bold">{listing.price === 0 ? 'Free' : `$${listing.price.toLocaleString()}`}</p><div className="text-sm text-muted-foreground flex items-center gap-2 pt-1"><MapPin className="w-4 h-4" /><span>{listing.location}</span><span className="mx-1">&middot;</span><span>Posted {formatDistanceToNow(creationDate, { addSuffix: true })}</span></div></div>
              <Separator />
              {contactMethod && contactValue && (<><div className="space-y-3"><h2 className="text-lg font-semibold">Contact Seller</h2><div className="flex items-center gap-3 p-3 bg-muted rounded-lg">{contactMethod === 'whatsapp' && (<Button asChild className="w-full"><a href={`https://wa.me/${contactValue.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center"><MessageCircle className="w-5 h-5 mr-2" /> Chat on WhatsApp</a></Button>)}{contactMethod === 'telegram' && (<Button asChild className="w-full bg-sky-500 hover:bg-sky-600 text-white"><a href={`https://t.me/${contactValue.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center"><Send className="w-5 h-5 mr-2" /> Chat on Telegram</a></Button>)}{contactMethod === 'email' && (<Button asChild variant="outline" className="w-full"><a href={`mailto:${contactValue}`} className="flex items-center justify-center"><Mail className="w-5 h-5 mr-2" /> {contactValue}</a></Button>)}</div><Alert variant="default" className="text-xs"><Info className="h-4 w-4" /><AlertDescription>Contact the seller using the information provided. Always practice safety when meeting or transacting.</AlertDescription></Alert></div><Separator /></>)}
              <div className="space-y-3"><h2 className="text-lg font-semibold">Details</h2><div className="text-sm space-y-2"><div className="flex justify-between"><span>Category</span><span className="text-muted-foreground capitalize">{categoryMap[listing.category] || listing.category}</span></div>{listing.condition && <div className="flex justify-between"><span>Condition</span><span className="text-muted-foreground">{conditionMap[listing.condition]}</span></div>}<Tooltip><TooltipTrigger asChild><div className="flex justify-between cursor-help"><span>Listing Status</span><span className="text-muted-foreground">{expirationText}</span></div></TooltipTrigger><TooltipContent><p>Expires on {format(expirationDate, 'PPP')}</p></TooltipContent></Tooltip></div>{listing.description && <p className="text-sm text-foreground/80 pt-2">{listing.description}</p>}</div>
              {isOwner && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Manage Listing</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button variant="outline" disabled><Edit className="w-4 h-4 mr-2" /> Edit</Button>
                      <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => updateListingStatusMutation.mutate('sold')} disabled={updateListingStatusMutation.isPending || listing.status === 'sold'}><CheckCircle className="w-4 h-4 mr-2" /> Mark as Sold</Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={deleteListingMutation.isPending}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your listing and remove its data from our servers.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteListingMutation.mutate()}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    </div>
                    <p className="text-xs text-muted-foreground text-center sm:text-left">Editing is coming soon!</p>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Lock className="w-16 h-16 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">See Full Details</h2>
              <p className="text-muted-foreground mb-6">
                Log in or create an account to view the full listing details and contact the seller.
              </p>
              <Button onClick={handleLoginClick} size="lg" className="w-full">
                Login to Continue
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}