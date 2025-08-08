import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { DisclaimerSection } from '@/components/marketplace/DisclaimerSection';
import { Button } from '@/components/ui/button';
import { ChevronDown, SortAsc, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarketplaceSidebar } from '@/components/layout/MarketplaceSidebar';
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { EditListing } from '@/components/marketplace/EditListing';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { subDays } from 'date-fns';

const fetchListings = async (userId: string | undefined) => {
  const twentyDaysAgo = subDays(new Date(), 20).toISOString();

  // Step 1: Fetch all active listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .gte('created_at', twentyDaysAgo)
    .order('created_at', { ascending: false });

  if (listingsError) throw new Error(listingsError.message);
  if (!listings || listings.length === 0) return [];

  // Step 2: Collect all unique seller IDs from the listings
  const sellerIds = [...new Set(listings.map((l) => l.user_id).filter(Boolean))];
  if (sellerIds.length === 0) {
    return listings.map(l => ({ ...l, profile: null, isFavorited: false }));
  }

  // Step 3: Fetch all profiles for these sellers in a single query
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', sellerIds);

  if (profilesError) throw new Error(profilesError.message);

  // Step 4: Create a map for easy profile lookup
  const profilesMap = new Map(profiles?.map(p => [p.id, p]));

  // Step 5: Fetch user's favorites if logged in
  let favoriteSet = new Set();
  if (userId) {
    const listingIds = listings.map(l => l.id);
    const { data: favorites } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .in('listing_id', listingIds);
    favoriteSet = new Set(favorites?.map(f => f.listing_id));
  }

  // Step 6: Combine everything
  return listings.map((listing) => ({
    ...listing,
    profile: profilesMap.get(listing.user_id) || null,
    isFavorited: favoriteSet.has(listing.id),
  }));
};

export default function Marketplace() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [listingToMarkAsSold, setListingToMarkAsSold] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['listings', session?.user?.id],
    queryFn: () => fetchListings(session!.user.id),
    enabled: !!session,
    staleTime: 1000 * 60,
  });

  const { data: totalUsersCount } = useQuery({
    queryKey: ['totalUsersCount'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      return count;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: session?.user?.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        setOnlineCount(Object.keys(presenceState).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && session) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Supabase Realtime subscription for new listings
  useEffect(() => {
    const listingsChannel = supabase
      .channel('public:listings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, (payload) => {
        // Invalidate the 'listings' query to refetch and include the new listing
        queryClient.invalidateQueries({ queryKey: ['listings', session?.user?.id] });
        toast({ title: "New Listing!", description: "A new item has been posted to the marketplace." });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(listingsChannel);
    };
  }, [queryClient, session?.user?.id]);


  const favoriteMutation = useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string, isFavorited: boolean }) => {
      if (isFavorited) {
        await supabase.from('favorites').delete().match({ user_id: session!.user.id, listing_id: listingId });
      } else {
        await supabase.from('favorites').insert({ user_id: session!.user.id, listing_id: listingId });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listings', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['favorites', session?.user?.id] });
      const listing = listings.find(l => l.id === variables.listingId);
      if (listing) {
        toast({
          title: variables.isFavorited ? 'Removed from favorites' : 'Added to favorites',
          description: listing.title,
        });
      }
      if (selectedListing && selectedListing.id === variables.listingId) {
        setSelectedListing({ ...selectedListing, isFavorited: !variables.isFavorited });
      }
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const markAsSoldMutation = useMutation({
    mutationFn: async (listing: any) => {
      const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: (_, listing) => {
      toast({ title: "Success!", description: "Listing marked as sold." });
      queryClient.setQueryData(['listings', session?.user?.id], (oldData: any[] | undefined) =>
        oldData ? oldData.filter(item => item.id !== listing.id) : []
      );
      queryClient.invalidateQueries({ queryKey: ['my-listings', session?.user?.id] });
      if (selectedListing?.id === listing.id) {
        setSelectedListing(null);
      }
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToMarkAsSold(null)
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
      queryClient.invalidateQueries({ queryKey: ['listings', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['my-listings', session?.user?.id] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToDelete(null)
  });

  const handleSendMessage = (listing: any) => {
    const message = `Hey, i am interested in this ${listing.title}, is it still available?`;
    const encodedMessage = encodeURIComponent(message);

    if (!listing.contact) {
      toast({ title: "Contact information not available", description: "The seller has not provided a contact number.", variant: "destructive" });
      return;
    }
    
    const cleanedNumber = listing.contact.replace(/\D/g, '');
    
    if (!cleanedNumber) {
      toast({ title: "Invalid contact number", variant: "destructive" });
      return;
    }

    const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const normalizedSearchQuery = searchQuery.toLowerCase().trim();
  const filteredListings = listings
    .filter(l => {
      const categoryMatch = selectedCategory === 'all' || l.category.toLowerCase() === selectedCategory;
      
      if (!normalizedSearchQuery) {
        return categoryMatch;
      }

      const searchMatch = l.title.toLowerCase().includes(normalizedSearchQuery) ||
                          l.location.toLowerCase().includes(normalizedSearchQuery);

      return categoryMatch && searchMatch;
    })
    .sort((a, b) => sortBy === 'price-low' ? a.price - b.price : sortBy === 'price-high' ? b.price - a.price : 0);

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load listings.</div>;
    if (filteredListings.length === 0) return <div className="text-center py-16"><h3 className="text-xl font-semibold">No listings found</h3><p className="text-muted-foreground">Try adjusting your search.</p></div>;

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredListings.slice(0, visibleCount).map((listing) => (
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
        {visibleCount < filteredListings.length && <div className="text-center mt-8"><Button onClick={() => setVisibleCount(p => p + 12)} variant="outline" size="lg">Load More <ChevronDown className="w-4 h-4 ml-2" /></Button></div>}
      </>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50/50">
      <MarketplaceHeader onCreateListing={() => setShowCreateListing(true)} />
      <div className="flex">
        <MarketplaceSidebar 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onlineCount={onlineCount}
          totalUsersCount={totalUsersCount ?? undefined}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{selectedCategory === 'all' ? 'All Listings' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}</h2>
              <p className="text-muted-foreground mt-1">{filteredListings.length} items found</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSortBy(s => s === 'newest' ? 'price-low' : s === 'price-low' ? 'price-high' : 'newest')} className="gap-2"><SortAsc className="w-4 h-4" />{sortBy === 'newest' ? 'Newest' : sortBy === 'price-low' ? 'Price: Low-High' : 'Price: High-Low'}</Button>
          </div>
          {renderContent()}
          <DisclaimerSection />
        </main>
      </div>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {selectedListing && (
        <ListingDetailModal
          listing={{ ...selectedListing, seller: selectedListing.profile || {}, timeAgo: new Date(selectedListing.created_at).toLocaleDateString() }}
          isOpen={!!selectedListing}
          isOwner={session?.user?.id === selectedListing.user_id}
          onClose={() => setSelectedListing(null)}
          onFavoriteToggle={(id, isFav) => favoriteMutation.mutate({ listingId: id, isFavorited: isFav })}
          onSendMessage={() => handleSendMessage(selectedListing)}
          onEdit={() => { setSelectedListing(null); setListingToEdit(selectedListing); }}
          onDelete={() => { setSelectedListing(null); setListingToDelete(selectedListing); }}
          onMarkAsSold={() => { setSelectedListing(null); setListingToMarkAsSold(selectedListing); }}
        />
      )}
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
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your listing.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(listingToDelete)} disabled={deleteMutation.isPending}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}