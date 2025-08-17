import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Loader2, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { subDays } from 'date-fns';
import { Listing } from '@/lib/types';
import { useDebounce } from 'use-debounce';

const fetchFavoriteListings = async (userId: string): Promise<Listing[]> => {
  const twentyDaysAgo = subDays(new Date(), 20).toISOString();

  const { data: favorites, error: favError } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);
    
  if (favError) throw new Error(favError.message);
  if (!favorites || favorites.length === 0) return [];

  const listingIds = favorites.map(f => f.listing_id);

  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .in('id', listingIds)
    .eq('status', 'active')
    .gte('created_at', twentyDaysAgo);

  if (listingsError) throw new Error(listingsError.message);
  if (!listings || listings.length === 0) return [];

  const sellerIds = [...new Set(listings.map((l) => l.user_id).filter(Boolean))];
  if (sellerIds.length === 0) {
    return listings.map(l => ({ ...l, profile: null, isFavorited: true }));
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', sellerIds);

  if (profilesError) throw new Error(profilesError.message);

  const profilesMap = new Map(profiles?.map(p => [p.id, p]));

  return listings.map(listing => ({
    ...listing,
    profile: profilesMap.get(listing.user_id) || null,
    isFavorited: true,
  }));
};

export default function Favorites() {
  const session = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  const { data: listings = [], isLoading, isError } = useQuery<Listing[]>({
    queryKey: ['favorites', userId],
    queryFn: () => fetchFavoriteListings(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const favoritesChannel = supabase
      .channel(`favorites_channel:${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'listings', 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['listings', userId] });
        queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(favoritesChannel);
    };
  }, [queryClient, userId]);

  const favoriteMutation = useMutation({
    mutationFn: async ({ listingId }: { listingId: number }) => {
      if (!userId) throw new Error("You must be logged in.");
      await supabase.from('favorites').delete().match({ user_id: userId, listing_id: listingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({ title: 'Removed from favorites' });
      setSelectedListing(null);
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const normalizedSearchQuery = debouncedSearchQuery.toLowerCase().trim();
  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(normalizedSearchQuery) ||
    l.location.toLowerCase().includes(normalizedSearchQuery)
  );

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load favorites.</div>;
    if (filteredListings.length === 0) return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No favorites yet</h3>
        <p className="mt-2">Browse the marketplace and click the heart to save items.</p>
        <Button asChild className="mt-6"><Link to="/">Browse Listings</Link></Button>
      </div>
    );
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredListings.map((listing) => (
          <ListingCard
            key={listing.id}
            {...listing}
            onClick={() => setSelectedListing(listing)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <MarketplaceHeader
        onCreateListing={() => setShowCreateListing(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-screen-2xl">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">My Favorites</h2>
          <p className="text-muted-foreground mt-1">{filteredListings.length} items saved</p>
        </div>
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {selectedListing && (
        <ListingDetailModal
          listing={{ ...selectedListing, profile: selectedListing.profile || null }}
          isOpen={!!selectedListing}
          isOwner={false}
          onClose={() => setSelectedListing(null)}
          onFavoriteToggle={(id) => favoriteMutation.mutate({ listingId: id })}
        />
      )}
    </div>
  );
}