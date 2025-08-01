import { useState, useEffect } from 'react';
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
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { EditListing } from '@/components/marketplace/EditListing';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';
import { subDays } from 'date-fns';

const fetchListings = async (userId: string | undefined) => {
  const twentyDaysAgo = subDays(new Date(), 20).toISOString();
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .gte('created_at', twentyDaysAgo)
    .order('created_at', { ascending: false });

  if (listingsError) throw new Error(listingsError.message);
  if (!listings) return [];

  const userIds = [...new Set(listings.map(l => l.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
  const profilesById = profiles?.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as any) || {};

  const listingsWithProfiles = listings.map(l => ({
    ...l,
    profile: profilesById[l.user_id] || null,
  }));

  if (!userId) {
    return listingsWithProfiles.map(l => ({ ...l, isFavorited: false }));
  }

  const listingIds = listings.map(l => l.id);
  const { data: favorites } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', listingIds);

  const favoriteSet = new Set(favorites?.map(f => f.listing_id) || []);
  return listingsWithProfiles.map(l => ({
    ...l,
    isFavorited: favoriteSet.has(l.id),
  }));
};

export default function Marketplace() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  const [listingToMarkAsSold, setListingToMarkAsSold] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!session) {
      setOnlineCount(0);
      return;
    }

    const channel = supabase.channel(`online-users`, {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    const handlePresence = () => {
      const presenceState = channel.presenceState();
      const count = Object.keys(presenceState).length;
      setOnlineCount(count);
    };

    channel
      .on('presence', { event: 'sync' }, handlePresence)
      .on('presence', { event: 'join' }, handlePresence)
      .on('presence', { event: 'leave' }, handlePresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['listings', session?.user?.id],
    queryFn: () => fetchListings(session?.user?.id),
    staleTime: 1000 * 60,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string, isFavorited: boolean }) => {
      if (!session) throw new Error("You must be logged in to favorite items.");
      if (isFavorited) {
        await supabase.from('favorites').delete().match({ user_id: session.user.id, listing_id: listingId });
      } else {
        await supabase.from('favorites').insert({ user_id: session.user.id, listing_id: listingId });
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
      if (!session || session.user.id !== listing.user_id) throw new Error("Unauthorized");
      const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Listing marked as sold." });
      queryClient.invalidateQueries({ queryKey: ['listings', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['my-listings', session?.user?.id] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToMarkAsSold(null)
  });

  const handleSendMessage = (listing: any) => {
    if (!session) {
      toast({ title: "Please log in", description: "You need to be logged in to send a message.", variant: "destructive" });
      return;
    }
    if (!listing.contact) {
      toast({ title: "Contact information not available", description: "The seller has not provided a contact number.", variant: "destructive" });
      return;
    }
    
    const cleanedNumber = listing.contact.replace(/\D/g, '');
    
    if (!cleanedNumber) {
      toast({ title: "Invalid contact number", variant: "destructive" });
      return;
    }

    const message = `Hey! I'm interested in your listing "${listing.title}" on Eagle Market Place.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
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
    if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">{Array.from({ length: 10 }).map((_, i) => <Card key={i} className="p-0"><div className="h-72 bg-muted animate-pulse rounded-lg"></div></Card>)}</div>;
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
        <MarketplaceSidebar {...{ selectedCategory, onCategoryChange: handleCategoryChange, searchQuery, onSearchChange: setSearchQuery, onlineCount }} />
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
    </div>
  );
}