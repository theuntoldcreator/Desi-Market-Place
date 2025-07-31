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

const fetchFavoriteListings = async (userId: string) => {
  // Step 1: Fetch favorite listing IDs
  const { data: favorites, error: favError } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);

  if (favError) throw new Error(favError.message);
  if (!favorites || favorites.length === 0) return [];

  const listingIds = favorites.map(f => f.listing_id);

  // Step 2: Fetch the listings for those IDs
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .in('id', listingIds);

  if (listingsError) throw new Error(listingsError.message);
  if (!listings || listings.length === 0) return [];

  // Step 3: Fetch profiles for the fetched listings
  const userIds = [...new Set(listings.map(l => l.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw new Error(profilesError.message);

  const profilesById = profiles.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<string, { id: string; full_name: string | null; avatar_url: string | null; }>);

  // Step 4: Combine listings with their profiles
  return listings.map(listing => ({
    ...listing,
    profile: profilesById[listing.user_id] || { full_name: 'Unknown User', avatar_url: null },
    isFavorited: true,
  }));
};

export default function Favorites() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['favorites', session?.user?.id],
    queryFn: () => fetchFavoriteListings(session!.user.id),
    enabled: !!session,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string, isFavorited: boolean }) => {
      if (!session) throw new Error("You must be logged in to favorite items.");
      if (isFavorited) {
        const { error } = await supabase.from('favorites').delete().match({ user_id: session.user.id, listing_id: listingId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({ title: 'Removed from favorites' });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (isError) {
      return <div className="text-center py-16 text-destructive">Failed to load your favorites.</div>;
    }
    if (listings.length === 0) {
      return (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">No favorites yet</h3>
          <p className="mt-2 text-muted-foreground">Browse the marketplace and click the heart to save items.</p>
          <Button asChild className="mt-6">
            <Link to="/">Browse Listings</Link>
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
            seller={listing.profile || { full_name: 'Unknown' }}
            timeAgo={new Date(listing.created_at).toLocaleDateString()}
            onFavoriteToggle={() => favoriteMutation.mutate({ listingId: listing.id, isFavorited: true })}
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
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">My Favorites</h2>
          <p className="text-muted-foreground mt-1">{listings.length} items saved</p>
        </div>
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
    </div>
  );
}