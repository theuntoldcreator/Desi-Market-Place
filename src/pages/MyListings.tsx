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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { subDays } from 'date-fns';
import { MarketplaceSidebar } from '@/components/layout/MarketplaceSidebar';

const fetchMyListings = async (userId: string) => {
  const twentyDaysAgo = subDays(new Date(), 20).toISOString();
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', twentyDaysAgo)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const { data: profile } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', userId).single();
  return listings.map(listing => ({ ...listing, profile: profile || null }));
};

export default function MyListings() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['my-listings', session?.user?.id],
    queryFn: () => fetchMyListings(session!.user.id),
    enabled: !!session,
  });

  const deleteMutation = useMutation({
    mutationFn: async (listing: any) => {
      const imagePaths = listing.image_urls.map((url: string) => new URL(url).pathname.split('/listing_images/')[1]);
      if (imagePaths.length > 0) {
        await supabase.storage.from('listing_images').remove(imagePaths);
      }
      await supabase.from('listings').delete().eq('id', listing.id);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Listing deleted." });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToDelete(null)
  });

  const filteredListings = listings.filter(listing =>
    (selectedCategory === 'all' || listing.category.toLowerCase() === selectedCategory) &&
    (!searchQuery.trim() || listing.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load your listings.</div>;
    if (listings.length === 0) return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">You haven't posted anything yet</h3>
        <Button onClick={() => setShowCreateListing(true)} className="mt-6"><Plus className="mr-2 h-4 w-4" /> Create Listing</Button>
      </div>
    );
    if (filteredListings.length === 0) return (
        <div className="text-center py-16"><h3 className="text-xl font-semibold">No listings found</h3><p className="text-muted-foreground">Try adjusting your search or filters.</p></div>
    );
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredListings.map((listing) => (
          <ListingCard
            key={listing.id}
            title={listing.title}
            price={listing.price}
            image_urls={listing.image_urls}
            location={listing.location}
            onClick={() => setSelectedListing(listing)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50/50">
      <MarketplaceHeader onCreateListing={() => setShowCreateListing(true)} />
      <div className="flex">
        <MarketplaceSidebar {...{ selectedCategory, onCategoryChange: setSelectedCategory, searchQuery, onSearchChange: setSearchQuery }} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">My Listings</h2>
            <p className="text-muted-foreground mt-1">{filteredListings.length} items posted</p>
          </div>
          {renderContent()}
        </main>
      </div>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {listingToEdit && <EditListing isOpen={!!listingToEdit} onClose={() => setListingToEdit(null)} listing={listingToEdit} />}
      <AlertDialog open={!!listingToDelete} onOpenChange={() => setListingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your listing.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(listingToDelete)} disabled={deleteMutation.isPending}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {selectedListing && (
        <ListingDetailModal
          listing={{ ...selectedListing, seller: selectedListing.profile || {}, timeAgo: new Date(selectedListing.created_at).toLocaleDateString() }}
          isOpen={!!selectedListing}
          isOwner={true}
          onClose={() => setSelectedListing(null)}
          onEdit={() => { setSelectedListing(null); setListingToEdit(selectedListing); }}
          onDelete={() => { setSelectedListing(null); setListingToDelete(selectedListing); }}
        />
      )}
    </div>
  );
}