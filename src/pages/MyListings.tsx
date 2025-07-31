import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { EditListing } from '@/components/marketplace/EditListing';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const fetchMyListings = async (userId: string) => {
  // Fetch listings for the current user
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (listingsError) throw new Error(listingsError.message);
  if (!listings) return [];

  // Fetch the profile of the current user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single();
  
  if (profileError) {
    console.warn('Could not fetch profile for my listings:', profileError.message);
  }

  // Attach the same profile to all listings
  return listings.map(listing => ({
    ...listing,
    profile: profile || { full_name: 'You', avatar_url: null }
  }));
};

export default function MyListings() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [listingToEdit, setListingToEdit] = useState<any>(null);

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['my-listings', session?.user?.id],
    queryFn: () => fetchMyListings(session!.user.id),
    enabled: !!session,
  });

  const deleteMutation = useMutation({
    mutationFn: async (listing: any) => {
      // Robustly extract image paths from URLs for deletion
      const imagePaths = listing.image_urls.map((url: string) => {
        const path = new URL(url).pathname;
        const pathParts = path.split('/listing_images/');
        return pathParts[1];
      });

      if (imagePaths.length > 0) {
        const { error: deleteImageError } = await supabase.storage.from('listing_images').remove(imagePaths);
        if (deleteImageError) throw new Error(`Failed to delete images: ${deleteImageError.message}`);
      }
      
      const { error: deleteListingError } = await supabase.from('listings').delete().eq('id', listing.id);
      if (deleteListingError) throw new Error(`Failed to delete listing: ${deleteListingError.message}`);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Your listing has been deleted." });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setListingToDelete(null);
    }
  });

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (isError) {
      return <div className="text-center py-16 text-destructive">Failed to load your listings.</div>;
    }
    if (listings.length === 0) {
      return (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">You haven't posted anything yet</h3>
          <p className="mt-2 text-muted-foreground">Click the button below to create your first listing.</p>
          <Button onClick={() => setShowCreateListing(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" /> Create Listing
          </Button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            {...listing}
            seller={listing.profile || { full_name: 'You' }}
            timeAgo={new Date(listing.created_at).toLocaleDateString()}
            isOwner={true}
            onDelete={() => setListingToDelete(listing)}
            onEdit={() => setListingToEdit(listing)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50/50">
      <MarketplaceHeader onCreateListing={() => setShowCreateListing(true)} />
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-screen-2xl">
        <div>
          <h2 className="text-3xl font-bold text-foreground">My Listings</h2>
          <p className="text-muted-foreground mt-1">{listings.length} items posted</p>
        </div>
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {listingToEdit && (
        <EditListing 
          isOpen={!!listingToEdit} 
          onClose={() => setListingToEdit(null)} 
          listing={listingToEdit} 
        />
      )}
      <AlertDialog open={!!listingToDelete} onOpenChange={() => setListingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your listing
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(listingToDelete)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}