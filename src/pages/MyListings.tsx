import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { EditListing } from '@/components/marketplace/EditListing';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ListingDetailModal } from '@/components/marketplace/ListingDetailModal';
import { subDays } from 'date-fns';
import { FloatingHomeButton } from '@/components/layout/FloatingHomeButton';

const fetchMyListings = async (userId: string) => {
  const twentyDaysAgo = subDays(new Date(), 20).toISOString();
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', twentyDaysAgo)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const { data: profile } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', userId).single();
  return listings.map(listing => ({ ...listing, profile: profile || null }));
};

export default function MyListings() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [listingToMarkAsSold, setListingToMarkAsSold] = useState<any>(null);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['my-listings', session?.user?.id],
    queryFn: () => fetchMyListings(session!.user.id),
    enabled: !!session,
  });

  const markAsSoldMutation = useMutation({
    mutationFn: async (listing: any) => {
      const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Listing marked as sold." });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToMarkAsSold(null)
  });

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load your listings.</div>;
    if (listings.length === 0) return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">You haven't posted anything yet</h3>
        <Button onClick={() => setShowCreateListing(true)} className="mt-6"><Plus className="mr-2 h-4 w-4" /> Create Listing</Button>
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
            status={listing.status}
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
          <h2 className="text-2xl sm:text-3xl font-bold">My Listings</h2>
          <p className="text-muted-foreground mt-1">{listings.length} items posted</p>
        </div>
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
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
      {selectedListing && (
        <ListingDetailModal
          listing={{ ...selectedListing, seller: selectedListing.profile || {}, timeAgo: new Date(selectedListing.created_at).toLocaleDateString() }}
          isOpen={!!selectedListing}
          isOwner={true}
          onClose={() => setSelectedListing(null)}
          onEdit={() => { setSelectedListing(null); setListingToEdit(selectedListing); }}
          onMarkAsSold={() => { setSelectedListing(null); setListingToMarkAsSold(selectedListing); }}
        />
      )}
      <FloatingHomeButton />
    </div>
  );
}