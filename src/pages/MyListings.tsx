import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { Header } from '@/components/layout/Header';
import { Loader2, ShoppingBag } from 'lucide-react';
import { Listing } from '@/lib/types';
import { useState } from 'react';
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { useNavigate } from 'react-router-dom';

const fetchUserListings = async (userId: string): Promise<Listing[]> => {
  const { data, error } = await supabase
    .from('listings')
    .select('*, favorites ( user_id ), profiles ( first_name, last_name, avatar_url )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  return data.map(l => ({
    ...l,
    is_favorited: l.favorites.some(f => f.user_id === userId),
  })) || [];
};

export default function MyListings() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const { data: listings = [], isLoading, isError } = useQuery<Listing[]>({
    queryKey: ['userListings', user?.id],
    queryFn: () => fetchUserListings(user!.id),
    enabled: !!user,
    refetchInterval: 60000, // Poll every 1 minute
  });

  if (!loading && !session) {
    navigate('/login');
    return null;
  }

  const renderContent = () => {
    if (isLoading || loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load your listings.</div>;
    if (listings.length === 0) return (
      <div className="text-center py-16">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">You haven't listed anything yet</h3>
        <p className="mt-2 text-muted-foreground">Click "Create Listing" to get started.</p>
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
          <h2 className="text-2xl sm:text-3xl font-bold">My Listings</h2>
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