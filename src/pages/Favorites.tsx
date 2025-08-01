import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Loader2, Heart } from 'lucide-react';
import { useState } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { subDays } from 'date-fns';
import { MarketplaceSidebar } from '@/components/layout/MarketplaceSidebar';

const fetchFavoriteListings = async (userId: string) => {
  const twentyDaysAgo = subDays(new Date(), 20).toISOString();
  const { data: favorites, error: favError } = await supabase.from('favorites').select('listing_id').eq('user_id', userId);
  if (favError) throw new Error(favError.message);
  if (!favorites || favorites.length === 0) return [];

  const listingIds = favorites.map(f => f.listing_id);
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .in('id', listingIds)
    .gte('created_at', twentyDaysAgo);
  if (listingsError) throw new Error(listingsError.message);
  if (!listings || listings.length === 0) return [];

  const userIds = [...new Set(listings.map(l => l.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds);
  const profilesById = profiles?.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as any) || {};

  return listings.map(listing => ({
    ...listing,
    profile: profilesById[listing.user_id] || null,
    isFavorited: true,
  }));
};

export default function Favorites() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['favorites', session?.user?.id],
    queryFn: () => fetchFavoriteListings(session!.user.id),
    enabled: !!session,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      if (!session) throw new Error("You must be logged in.");
      await supabase.from('favorites').delete().match({ user_id: session.user.id, listing_id: listingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({ title: 'Removed from favorites' });
      setSelectedListing(null); // Close modal on unfavorite
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const filteredListings = listings.filter(listing =>
    (selectedCategory === 'all' || listing.category.toLowerCase() === selectedCategory) &&
    (!searchQuery.trim() || listing.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load favorites.</div>;
    if (listings.length === 0) return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No favorites yet</h3>
        <p className="mt-2">Browse the marketplace and click the heart to save items.</p>
        <Button asChild className="mt-6"><Link to="/">Browse Listings</Link></Button>
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
            <h2 className="text-2xl sm:text-3xl font-bold">My Favorites</h2>
            <p className="text-muted-foreground mt-1">{filteredListings.length} items saved</p>
          </div>
          {renderContent()}
        </main>
      </div>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {selectedListing && (
        <ListingDetailModal
          listing={{ ...selectedListing, seller: selectedListing.profile || {}, timeAgo: new Date(selectedListing.created_at).toLocaleDateString() }}
          isOpen={!!selectedListing}
          isOwner={false}
          onClose={() => setSelectedListing(null)}
          onFavoriteToggle={(id) => favoriteMutation.mutate({ listingId: id })}
        />
      )}
    </div>
  );
}