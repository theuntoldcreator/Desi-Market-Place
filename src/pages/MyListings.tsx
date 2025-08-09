import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { EditListing } from '@/components/marketplace/EditListing';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { subDays } from 'date-fns';
import { MarketplaceMobileSearchAndNav } from '@/components/marketplace/MarketplaceMobileSearchAndNav'; // Import for mobile nav

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
  const [listingToMarkAsSold, setListingToMarkAsSold] = useState<any>(null);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Add search query state

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['my-listings', session?.user?.id],
    queryFn: () => fetchMyListings(session!.user.id),
    enabled: !!session,
  });

  // Supabase Realtime subscription for changes to user's own listings
  useEffect(() => {
    if (!session?.user?.id) return;

    const myListingChannel = supabase
      .channel(`my_listings_channel:${session.user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'listings', 
        filter: `user_id=eq.${session.user.id}` 
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['my-listings', session.user.id] });
        if (payload.eventType === 'UPDATE') {
          toast({ title: "Your Listing Updated!", description: `${payload.old.title || 'Your item'} has been updated.` });
        } else if (payload.eventType === 'DELETE') {
          toast({ title: "Your Listing Removed!", description: `${payload.old.title || 'Your item'} has been removed.` });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(myListingChannel);
    };
  }, [queryClient, session?.user?.id, toast]);


  const markAsSoldMutation = useMutation({
    mutationFn: async (listing: any) => {
      const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: (_, listing) => {
      toast({ title: "Success!", description: "Listing marked as sold." });
      queryClient.setQueryData(['my-listings', session?.user?.id], (oldData: any[] | undefined) =>
        oldData ? oldData.map(item => item.id === listing.id ? { ...item, status: 'sold' } : item) : []
      );
      queryClient.invalidateQueries({ queryKey: ['listings', session?.user?.id] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToMarkAsSold(null)
  });

  const deleteMutation = useMutation({
    mutationFn: async (listing: any) => {
      if (!session || session.user.id !== listing.user_id) throw new Error("Unauthorized");
      
      if (listing.image_urls && listing.image_urls.length > 0) {
        const imagePaths = listing.image_urls.map((url: string) => new URL(url).pathname.split('/listing_images/')[1]).filter(Boolean);
        if (imagePaths.length > 0) {
            await supabase.storage.from('listing_images').remove(imagePaths);
        }
      }

      const { error: dbError } = await supabase.from('listings').delete().eq('id', listing.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Listing permanently deleted." });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToDelete(null)
  });

  const normalizedSearchQuery = searchQuery.toLowerCase().trim();
  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(normalizedSearchQuery) ||
    l.location.toLowerCase().includes(normalizedSearchQuery)
  );

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load your listings.</div>;
    if (filteredListings.length === 0) return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">You haven't posted anything yet</h3>
        <Button onClick={() => setShowCreateListing(true)} className="mt-6"><Plus className="mr-2 h-4 w-4" /> Create Listing</Button>
      </div>
    );
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredListings.map((listing) => (
          <ListingCard
            key={listing.id}
            title={listing.title}
            price={listing.price}
            image_urls={listing.image_urls}
            location={listing.location}
            status={listing.status}
            onClick={() => setSelectedListing(listing)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50/50">
      <MarketplaceHeader onCreateListing={() => setShowCreateListing(true)} />
      <MarketplaceMobileSearchAndNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-screen-2xl md:pt-8"> {/* Adjusted padding-top for mobile */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">My Listings</h2>
          <p className="text-muted-foreground mt-1">{filteredListings.length} items posted</p>
        </div>
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {listingToEdit && <EditListing isOpen={!!listingToEdit} onClose={() => setListingToEdit(null)} listing={listingToEdit} />}
      <AlertDialog open={!!listingToMarkAsSold} onOpenChange={() => setListingToMarkAsSold(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will mark the listing as sold and hide it from the marketplace. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => markAsSoldMutation.mutate(listingToMarkAsSold)} disabled={markAsSoldMutation.isPending}>Mark as Sold</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!listingToDelete} onOpenChange={() => setListingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your listing and all its data. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(listingToDelete)} disabled={deleteMutation.isPending} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
          onMarkAsSold={() => { setSelectedListing(null); setListingToMarkAsSold(selectedListing); }}
          onDelete={() => { setSelectedListing(null); setListingToDelete(selectedListing); }}
        />
      )}
    </div>
  );
}