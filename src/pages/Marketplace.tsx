import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { DisclaimerSection } from '@/components/marketplace/DisclaimerSection';
import { Button } from '@/components/ui/button';
import { ChevronDown, SortAsc, Loader2 } from 'lucide-react';
import { MarketplaceSidebar } from '@/components/layout/MarketplaceSidebar';
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { Header } from '@/components/layout/Header';
import { Listing } from '@/lib/types';
import { useDebounce } from 'use-debounce';
import { MobileNavbar } from '@/components/layout/MobileNavbar';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

const fetchListings = async (userId?: string): Promise<Listing[]> => {
  let query = supabase
    .from('listings')
    .select('*, favorites ( user_id ), profiles ( first_name, last_name, avatar_url )')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return data.map(l => ({
    ...l,
    is_favorited: userId ? l.favorites.some(f => f.user_id === userId) : false,
  })) || [];
};

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const { data: listings = [], isLoading, isError } = useQuery<Listing[]>({
    queryKey: ['listings', user?.id],
    queryFn: () => fetchListings(user?.id),
    staleTime: 1000 * 60,
    refetchInterval: 60000, // Poll every 1 minute
  });

  useEffect(() => {
    const listingIdToOpen = searchParams.get('openListing');
    if (listingIdToOpen && listings.length > 0) {
      const listing = listings.find(l => l.id === parseInt(listingIdToOpen, 10));
      if (listing) {
        setSelectedListing(listing);
        searchParams.delete('openListing');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [listings, searchParams, setSearchParams]);

  const handleCardClick = (listing: Listing) => {
    setSelectedListing(listing);
  };

  const normalizedSearchQuery = debouncedSearchQuery.toLowerCase().trim();
  const filteredListings = listings
    .filter(l => (selectedCategory === 'all' || l.category.toLowerCase() === selectedCategory) &&
                 (!normalizedSearchQuery || l.title.toLowerCase().includes(normalizedSearchQuery) || l.location.toLowerCase().includes(normalizedSearchQuery)))
    .sort((a, b) => sortBy === 'price-low' ? a.price - b.price : sortBy === 'price-high' ? b.price - a.price : 0);

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load listings.</div>;
    if (filteredListings.length === 0) return <div className="text-center py-16"><h3 className="text-xl font-semibold">No listings found</h3><p className="text-muted-foreground">Try adjusting your search.</p></div>;

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
          {filteredListings.slice(0, visibleCount).map((listing) => (
            <ListingCard key={listing.id} {...listing} onClick={() => handleCardClick(listing)} />
          ))}
        </div>
        {visibleCount < filteredListings.length && <div className="text-center mt-8"><Button onClick={() => setVisibleCount(p => p + 12)} variant="outline" size="lg">Load More <ChevronDown className="w-4 h-4 ml-2" /></Button></div>}
      </>
    );
  };

  return (
    <div className="w-full">
      <Header 
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateListing={() => setShowCreateListing(true)}
      />
      <div className="flex">
        <MarketplaceSidebar selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 pb-24 sm:pb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">{selectedCategory === 'all' ? 'All Listings' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}</h2>
              <p className="text-muted-foreground mt-1">{filteredListings.length} items found</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSortBy(s => s === 'newest' ? 'price-low' : s === 'price-low' ? 'price-high' : 'newest')} className="gap-2 flex-shrink-0">
              <SortAsc className="w-4 h-4" />{sortBy === 'newest' ? 'Newest' : sortBy === 'price-low' ? 'Price: Low-High' : 'Price: High-Low'}
            </Button>
          </div>
          {renderContent()}
          <DisclaimerSection />
        </main>
      </div>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
      <MobileNavbar selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
    </div>
  );
}