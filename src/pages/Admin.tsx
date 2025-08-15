import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { EditListing } from '@/components/marketplace/EditListing';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDebounce } from 'use-debounce';
import { Listing } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { UserMenu } from '@/components/auth/UserMenu';

const fetchAllListings = async (): Promise<Listing[]> => {
  const { data, error } = await supabase
    .from('listings')
    .select('*, profile:profiles(first_name, last_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<Listing | null>(null);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  const { data: listings = [], isLoading, isError } = useQuery<Listing[]>({
    queryKey: ['admin-listings'],
    queryFn: fetchAllListings,
  });

  const deleteMutation = useMutation({
    mutationFn: async (listing: Listing) => {
      const imagePaths = listing.image_urls.map((url: string) => new URL(url).pathname.split('/listing_images/')[1]);
      if (imagePaths.length > 0) {
        await supabase.storage.from('listing_images').remove(imagePaths);
      }
      await supabase.from('listings').delete().eq('id', listing.id);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Listing deleted." });
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    onSettled: () => setListingToDelete(null)
  });

  const normalizedSearchQuery = debouncedSearchQuery.toLowerCase().trim();
  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(normalizedSearchQuery) ||
    l.profile?.first_name?.toLowerCase().includes(normalizedSearchQuery) ||
    l.profile?.last_name?.toLowerCase().includes(normalizedSearchQuery) ||
    l.location.toLowerCase().includes(normalizedSearchQuery)
  );

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <header className="sticky top-0 z-30 w-full border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search listings or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowCreateListing(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Listing
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Listings ({filteredListings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : isError ? (
              <div className="text-center py-16 text-destructive">Failed to load listings.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">{listing.title}</TableCell>
                      <TableCell>{`${listing.profile?.first_name || ''} ${listing.profile?.last_name || 'N/A'}`}</TableCell>
                      <TableCell>${listing.price}</TableCell>
                      <TableCell className="capitalize">{listing.status}</TableCell>
                      <TableCell>{format(new Date(listing.created_at), 'PP')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setListingToEdit(listing)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setListingToDelete(listing)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      {listingToEdit && <EditListing isOpen={!!listingToEdit} onClose={() => setListingToEdit(null)} listing={listingToEdit} />}
      <AlertDialog open={!!listingToDelete} onOpenChange={() => setListingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this listing. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(listingToDelete!)} disabled={deleteMutation.isPending} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}