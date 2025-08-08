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
import { FloatingHomeButton } from '@/components/layout/FloatingHomeButton';

const fetchFavoriteListings = async (userId: string) => {
  const twentyDaysAgo = subDays(new Date(), 20).toISOString();

  // Step 1: Get the user's favorite listing IDs
  const { data: favorites, error: favError } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);
    
  if (favError) throw new Error(favError.message);
  if (!favorites || favorites.length === 0) return [];

  const listingIds = favorites.map(f => f.listing_id);

  // Step 2: Fetch the details for those listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .in('id', listingIds)
    .eq('status', 'active')
    .gte('created_at', twentyDaysAgo);

  if (listingsError) throw new Error(listingsError.message);
  if (!listings || listings.length === 0) return [];

  // Step 3: Get unique seller IDs from the listings
  const sellerIds = [...new Set(listings.map((l) => l.user_id).filter(Boolean))];
  if (sellerIds.length === 0) {
    return listings.map(l => ({ ...l, profile: null, isFavorited: true }));
  }

  // Step 4: Fetch profiles for the sellers
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', sellerIds);

  if (profilesError) throw new Error(profilesError.message);

  // Step 5: Create a map for easy profile lookup
  const profilesMap = new Map(profiles?.map(p => [p.id, p]));

  // Step 6: Combine listings with profiles
  return listings.map(listing => ({
    ...listing,
    profile: profilesMap.get(listing.user_id) || null,
    isFavorited: true, // All listings on this page are favorites
  }));
};

export default function Favorites() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['favorites', session?.user?.id],
    queryFn: () => fetchFavoriteListings(session!.user.id),
    enabled: !!session,
  });

  // Supabase Realtime subscription for changes to favorited listings
  useEffect(() => {
    if (!session?.user?.id) return;

    const favoritesChannel = supabase
      .channel(`favorites_channel:${session.user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'listings', 
        // Filter for listings that are currently favorited by the user
        // This filter is less direct as it requires joining, so we'll rely on invalidateQueries
      }, (payload) => {
        // Invalidate both listings and favorites queries to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['listings', session.user.id] });
        queryClient.invalidateQueries({ queryKey: ['favorites', session.user.id] });
        
        if (payload.eventType === 'UPDATE') {
          toast({ title: "Favorited Listing Updated!", description: `${payload.old.title || 'An item you favorited'} has been updated.` });
        } else if (payload.eventType === 'DELETE') {
          toast({ title: "Favorited Listing Removed!", description: `${payload.old.title || 'An item you favorited'} has been removed.` });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(favoritesChannel);
    };
  }, [queryClient, session?.user?.id, toast]);


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

  const handleSendMessage = (listing: any) => {
    if (!session) {
      toast({ title: "Please log in", description: "You need to be logged in to send a message.", variant: "destructive" });
      return;
    }

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
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {listings.map((listing) => (
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
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-screen-2xl">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">My Favorites</h2>
          <p className="text-muted-foreground mt-1">{listings.length} items saved</p>
        </div>
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {selectedListing && (
        <ListingDetailModal
          listing={{ ...selectedListing, seller: selectedListing.profile || {}, timeAgo: new Date(selectedListing.created_at).toLocaleDateString() }}
          isOpen={!!selectedListing}
          isOwner={false}
          onClose={() => setSelectedListing(null)}
          onFavoriteToggle={(id) => favoriteMutation.mutate({ listingId: id })}
          onSendMessage={() => handleSendMessage(selectedListing)}
        />
      )}
      <FloatingHomeButton />
    </div>
  );
}