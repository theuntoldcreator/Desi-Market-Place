import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { Header } from '@/components/layout/Header';
import { Loader2, Heart } from 'lucide-react';
import { Listing } from '@/lib/types';
import { useState } from 'react';
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { useNavigate } from 'react-router-dom';

const fetchFavoriteListings = async (userId: string): Promise<Listing[]> => {
  const { data, error } = await supabase
    .from('listings')
    .select('*, favorites!inner(user_id), profiles ( first_name, last_name, avatar_url )') // Query listings...
    .eq('favorites.user_id', userId)      // ...that are favorited by the current user.
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // The query now returns Listing objects directly.
  return data?.map(listing => ({
    ...listing,
    is_favorited: true, // We know it's favorited because of the query.
  })) || [];
};

export default function Favorites() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const { data: listings = [], isLoading, isError } = useQuery<Listing[]>({
    queryKey: ['favoriteListings', user?.id],
    queryFn: () => fetchFavoriteListings(user!.id),
    enabled: !!user,
    refetchInterval: 60000, // Poll every 1 minute
  });

  if (!loading && !session) {
    navigate('/login');
    return null;
  }

  const renderContent = () => {
    if (isLoading || loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load your favorites.</div>;
    if (listings.length === 0) return (
      <div className="text-center py-16">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No saved items yet</h3>
        <p className="mt-2 text-muted-foreground">Tap the heart on a listing to save it.</p>
      </div>
    );

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <ListingCard key={listing.id} {...listing} onClick={() => setSelectedListing(listing)} />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 space-y-8 pb-24 sm:pb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">My Favorites</h2>
          <p className="text-muted-foreground mt-1">{listings.length} items found</p>
        </div>
        {renderContent()}
      </main>
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
}