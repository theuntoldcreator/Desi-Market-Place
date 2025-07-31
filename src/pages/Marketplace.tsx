import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { DisclaimerSection } from '@/components/marketplace/DisclaimerSection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, SortAsc } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarketplaceSidebar } from '@/components/layout/MarketplaceSidebar';

const fetchListings = async (userId: string | undefined) => {
  // Step 1: Fetch all listings with their profiles using a LEFT JOIN
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*, profile:profiles!left!listings_user_id_fkey(*)')
    .order('created_at', { ascending: false });

  if (listingsError) throw new Error(listingsError.message);
  if (!listings) return [];

  // Step 2: If user is logged in, determine which are favorited
  if (!userId) {
    return listings.map(l => ({ ...l, isFavorited: false }));
  }

  const listingIds = listings.map(l => l.id);
  const { data: favorites } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', listingIds);

  const favoriteSet = new Set(favorites?.map(f => f.listing_id) || []);
  return listings.map(l => ({
    ...l,
    isFavorited: favoriteSet.has(l.id),
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

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['listings', session?.user?.id],
    queryFn: () => fetchListings(session?.user?.id),
    staleTime: 1000 * 60, // 1 minute
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string, isFavorited: boolean }) => {
      if (!session) throw new Error("You must be logged in to favorite items.");

      if (isFavorited) {
        const { error } = await supabase.from('favorites').delete().match({ user_id: session.user.id, listing_id: listingId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('favorites').insert({ user_id: session.user.id, listing_id: listingId });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      const listing = listings.find(l => l.id === variables.listingId);
      if (listing) {
        toast({
          title: variables.isFavorited ? 'Removed from favorites' : 'Added to favorites',
          description: listing.title,
        });
      }
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleFavoriteToggle = (id: string, isFavorited: boolean) => {
    favoriteMutation.mutate({ listingId: id, isFavorited });
  };

  const filteredListings = listings
    .filter(listing => {
      if (selectedCategory !== 'all' && listing.category.toLowerCase() !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() && !listing.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        default: return 0; // Already sorted by newest from query
      }
    });

  const loadMore = () => setVisibleCount(prev => prev + 12);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-0"><div className="h-96 bg-muted animate-pulse"></div></Card>
          ))}
        </div>
      );
    }

    if (isError) {
      return <div className="text-center py-16 text-destructive">Failed to load listings. Please try again.</div>;
    }

    if (filteredListings.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-2">No listings found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your search or browse different categories.</p>
            <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} variant="outline" size="lg">
              Clear Filters
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.slice(0, visibleCount).map((listing) => (
            <ListingCard
              key={listing.id}
              {...listing}
              description={listing.description}
              seller={listing.profile || { id: listing.user_id, first_name: 'Unknown', last_name: 'User', avatar_url: null }}
              timeAgo={new Date(listing.created_at).toLocaleDateString()}
              onFavoriteToggle={() => handleFavoriteToggle(listing.id, listing.isFavorited)}
            />
          ))}
        </div>
        {visibleCount < filteredListings.length && (
          <div className="text-center mt-8">
            <Button onClick={loadMore} variant="outline" size="lg" className="gap-2 hover:bg-primary hover:text-white transition-colors">
              Load More <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
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
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                {selectedCategory === 'all' ? 'All Listings' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              </h2>
              <p className="text-muted-foreground mt-1">
                {filteredListings.length} items found
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy(sortBy === 'newest' ? 'price-low' : sortBy === 'price-low' ? 'price-high' : 'newest')}
                className="gap-2"
              >
                <SortAsc className="w-4 h-4" />
                {sortBy === 'newest' && 'Newest First'}
                {sortBy === 'price-low' && 'Price: Low to High'}
                {sortBy === 'price-high' && 'Price: High to Low'}
              </Button>
            </div>
          </div>
          {renderContent()}
          <DisclaimerSection />
        </main>
      </div>
      <CreateListing
        isOpen={showCreateListing}
        onClose={() => setShowCreateListing(false)}
      />
    </div>
  );
}