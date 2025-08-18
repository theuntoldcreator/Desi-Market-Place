import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, MapPin, Info, Edit, Trash2, CheckCircle, Lock, Send, Copy, Shield } from 'lucide-react';
import { addDays, differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Listing } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { EditListing } from './EditListing';
import { Label } from '../ui/label';
import { OptimizedImage } from './OptimizedImage';

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
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
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
      // The trigger will handle storage deletion
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
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  if (!listing) return null;

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % (listing.images?.length || 1)); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + (listing.images?.length || 1)) % (listing.images?.length || 1)); };

  const creationDate = new Date(listing.created_at);
  const expirationDate = addDays(creationDate, 7);
  const daysRemaining = differenceInDays(expirationDate, new Date());
  let expirationText = daysRemaining < 0 ? 'Expired' : daysRemaining === 0 ? 'Expires today' : `Expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
  const conditionMap: { [key: string]: string } = { new: 'New', like_new: 'Like New', used: 'Used' };
  const categoryMap: { [key: string]: string } = { electronics: 'Electronics', books: 'Books & Study', furniture: 'Furniture', vehicles: 'Vehicles', clothing: 'Clothing', gaming: 'Gaming', free: 'Free Stuff' };
  const formattedId = String(listing.id).padStart(4, '0');
  const currentImage = listing.images?.[currentImageIndex];

  if (isEditing) {
    return <EditListing listing={listing} isOpen={isEditing} onClose={() => { setIsEditing(false); onClose(); }} />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-4xl sm:max-h-[90vh] sm:rounded-2xl flex flex-col sm:flex-row overflow-hidden" showCloseButton={false}>
        <div className="absolute top-4 right-4 z-20"><Button variant="ghost" size="icon" className="bg-background/50 border border-primary text-primary rounded-full hover:bg-primary/10 hover:text-black" onClick={onClose}><X className="h-5 w-5" /></Button></div>
        <div className="relative bg-muted flex items-center justify-center aspect-square sm:aspect-auto sm:w-1/2 sm:h-full sm:flex-shrink-0">
          {listing.status === 'sold' && <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold z-20">SOLD</div>}
          {currentImage ? (
            <OptimizedImage
              path={currentImage.path}
              alt={listing.title}
              blurhash={currentImage.blurhash}
              width={currentImage.width}
              height={currentImage.height}
              sha256={currentImage.sha256}
              priority
              sizes="(max-width: 768px) 90vw, (max-width: 1280px) 70vw, 1080px"
              className="w-full h-full object-contain"
            />
          ) : <div className="w-full h-full bg-muted" />}
          {(listing.images?.length || 0) > 1 && (<><Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={prevImage}><ChevronLeft /></Button><Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full z-20" onClick={nextImage}><ChevronRight /></Button></>)}
        </div>
        <div className="flex-grow overflow-y-auto hide-scrollbar p-4 space-y-4 sm:w-1/2 sm:h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-4 sm:pb-4">
          {user ? (
            <>
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold tracking-tight">{listing.title}</DialogTitle>
                <DialogDescription className="sr-only">Detailed view of the listing: {listing.title}</DialogDescription>
                <p className="text-2xl font-bold">{listing.price === 0 ? 'Free' : `$${listing.price.toLocaleString()}`}</p>
                <div className="text-sm text-muted-foreground flex items-center gap-2 pt-1"><MapPin className="w-4 h-4" /><span>{listing.location}</span><span className="mx-1">&middot;</span><span>Posted {formatDistanceToNow(creationDate, { addSuffix: true })}</span></div>
              </div>
              <Separator />
              <div className="space-y-3"><h2 className="text-lg font-semibold">Details</h2><div className="text-sm space-y-2"><div className="flex justify-between"><span>Item ID</span><span className="text-muted-foreground font-mono">{formattedId}</span></div><div className="flex justify-between"><span>Category</span><span className="text-muted-foreground capitalize">{categoryMap[listing.category] || listing.category}</span></div>{listing.condition && <div className="flex justify-between"><span>Condition</span><span className="text-muted-foreground">{conditionMap[listing.condition]}</span></div>}<Tooltip><TooltipTrigger asChild><div className="flex justify-between cursor-help"><span>Listing Status</span><span className="text-muted-foreground">{expirationText}</span></div></TooltipTrigger><TooltipContent><p>Expires on {format(expirationDate, 'PPP')}</p></TooltipContent></Tooltip></div>{listing.description && <p className="text-sm text-foreground/80 pt-2">{listing.description}</p>}</div>
              {isOwner ? (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Manage Listing</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button variant="outline" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" /> Edit</Button>
                      <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => updateListingStatusMutation.mutate('sold')} disabled={updateListingStatusMutation.isPending || listing.status === 'sold'}><CheckCircle className="w-4 h-4 mr-2" /> Mark as Sold</Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={deleteListingMutation.isPending}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your listing and remove its data from our servers.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteListingMutation.mutate()}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Contact Seller</h2>
                    {(() => {
                      if (!listing.contact) return <p className="text-sm text-muted-foreground">The seller has not provided contact information.</p>;
                      const parts = listing.contact.split(':');
                      const method = parts[0];
                      const detail = parts.slice(1).join(':');

                      if (method === 'telegram' && detail) {
                        const href = `https://t.me/${detail}`;
                        const prefilledMessage = `Hello, is this ${listing.title} still available? Please verify the item with ID: ${formattedId} from NRI Marketplace`;
                        
                        const handleCopy = () => {
                          navigator.clipboard.writeText(prefilledMessage).then(() => {
                            setIsCopied(true);
                            toast({ title: "Message copied!" });
                            setTimeout(() => setIsCopied(false), 2000);
                          });
                        };

                        return (
                          <div className="space-y-4">
                            <Alert variant="default" className="p-3 text-xs bg-amber-50 border-amber-200 text-amber-900">
                              <Shield className="h-4 w-4 text-amber-600" />
                              <AlertDescription>
                                <strong>Safety Tip:</strong> No advance deposits. Meet in public. Verify item before paying.
                              </Aler tDescription>
                            </Alert>
                            <div>
                              <Label htmlFor="prefilled-message" className="text-sm font-medium">Suggested Message</Label>
                              <div className="relative mt-1">
                                <p className="text-sm bg-muted p-3 pr-12 rounded-md text-muted-foreground font-mono text-left">
                                  {prefilledMessage}
                                </p>
                                <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={handleCopy}>
                                  {isCopied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                                  <span className="sr-only">Copy message</span>
                                </Button>
                              </div>
                            </div>
                            <Button asChild size="lg" className="w-full bg-[#24A1DE] hover:bg-[#1C88C7] text-white">
                              <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                Chat on Telegram
                              </a>
                            </Button>
                          </div>
                        );
                      }
                      
                      return <p className="text-sm text-muted-foreground">The seller has not provided contact information.</p>;
                    })()}
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