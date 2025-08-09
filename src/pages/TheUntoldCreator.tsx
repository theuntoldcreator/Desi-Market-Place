import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, User, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreateListing } from '@/components/marketplace/CreateListing';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Listing } from '@/lib/types';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string; // Assuming email can be fetched or derived
  role: string;
}

export default function TheUntoldCreator() {
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showCreateListing, setShowCreateListing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

  // Fetch all listings
  const { data: listings = [], isLoading: isLoadingListings, isError: isErrorListings } = useQuery<Listing[]>({
    queryKey: ['admin-listings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!session,
  });

  // Fetch all profiles
  const { data: profiles = [], isLoading: isLoadingProfiles, isError: isErrorProfiles } = useQuery<Profile[]>({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data: usersData, error: usersError } = await supabaseClient.from('profiles').select('*');
      if (usersError) throw new Error(usersError.message);

      // Fetch emails from auth.users table (requires service_role key, handled by edge function)
      // For client-side, we can't directly query auth.users.
      // We'll rely on the profile data for now, or assume email is part of profile if it was added during signup.
      // If email is not in profiles, it will be undefined.
      const { data: authUsers, error: authUsersError } = await supabaseClient.auth.admin.listUsers();
      if (authUsersError) console.error("Error fetching auth users:", authUsersError.message);
      const authUsersMap = new Map(authUsers?.users.map(u => [u.id, u.email]));

      return usersData.map(profile => ({
        ...profile,
        email: authUsersMap.get(profile.id) || 'N/A', // Add email from auth.users
      }));
    },
    enabled: !!session,
  });

  // Mutation for deleting a listing
  const deleteListingMutation = useMutation({
    mutationFn: async (listing: Listing) => {
      if (!session) throw new Error("Unauthorized");
      
      // Delete images from storage first
      if (listing.image_urls && listing.image_urls.length > 0) {
        const imagePaths = listing.image_urls.map((url: string) => new URL(url).pathname.split('/listing_images/')[1]).filter(Boolean);
        if (imagePaths.length > 0) {
            await supabase.storage.from('listing_images').remove(imagePaths);
        }
      }

      // Delete listing from database
      const { error } = await supabase.from('listings').delete().eq('id', listing.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Listing deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] }); // Invalidate public listings too
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to delete listing: ${error.message}`, variant: "destructive" });
    },
    onSettled: () => setListingToDelete(null)
  });

  // Mutation for deleting a user
  const deleteUserMutation = useMutation({
    mutationFn: async (user: Profile) => {
      if (!session) throw new Error("Unauthorized");
      // Call the edge function to delete the user
      const { data, error } = await supabaseClient.functions.invoke('delete-user', {
        body: { userIdToDelete: user.id },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "User and associated data deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', userToDelete?.id] }); // Invalidate specific profile
      queryClient.invalidateQueries({ queryKey: ['listings'] }); // Listings might be affected
      queryClient.invalidateQueries({ queryKey: ['my-listings'] }); // Listings might be affected
      queryClient.invalidateQueries({ queryKey: ['favorites'] }); // Favorites might be affected
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to delete user: ${error.message}`, variant: "destructive" });
    },
    onSettled: () => setUserToDelete(null)
  });

  const normalizedSearchQuery = searchQuery.toLowerCase().trim();

  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(normalizedSearchQuery) ||
    l.description?.toLowerCase().includes(normalizedSearchQuery) ||
    l.location.toLowerCase().includes(normalizedSearchQuery)
  );

  const filteredProfiles = profiles.filter(p =>
    p.first_name?.toLowerCase().includes(normalizedSearchQuery) ||
    p.last_name?.toLowerCase().includes(normalizedSearchQuery) ||
    p.email.toLowerCase().includes(normalizedSearchQuery)
  );

  const renderListings = () => {
    if (isLoadingListings) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    if (isErrorListings) return <div className="text-center py-8 text-destructive">Failed to load listings.</div>;
    if (filteredListings.length === 0) return <div className="text-center py-8 text-muted-foreground">No listings found.</div>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredListings.map((listing) => (
            <TableRow key={listing.id}>
              <TableCell className="font-medium">{listing.title}</TableCell>
              <TableCell>${listing.price.toLocaleString()}</TableCell>
              <TableCell>{listing.location}</TableCell>
              <TableCell className="capitalize">{listing.status}</TableCell>
              <TableCell className="text-right">
                <Button variant="destructive" size="sm" onClick={() => setListingToDelete(listing)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderUsers = () => {
    if (isLoadingProfiles) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    if (isErrorProfiles) return <div className="text-center py-8 text-destructive">Failed to load users.</div>;
    if (filteredProfiles.length === 0) return <div className="text-center py-8 text-muted-foreground">No users found.</div>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProfiles.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback>{profile.first_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                {profile.first_name} {profile.last_name}
              </TableCell>
              <TableCell>{profile.email}</TableCell>
              <TableCell className="capitalize">{profile.role}</TableCell>
              <TableCell className="text-right">
                {session?.user?.id !== profile.id && ( // Prevent admin from deleting their own account
                  <Button variant="destructive" size="sm" onClick={() => setUserToDelete(profile)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50/50">
      <MarketplaceHeader
        onCreateListing={() => setShowCreateListing(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-screen-2xl">
        <h1 className="text-3xl font-bold">Admin Portal</h1>
        <p className="text-muted-foreground">Manage listings and user accounts.</p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> All Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {renderListings()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {renderUsers()}
          </CardContent>
        </Card>
      </main>

      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />

      {/* Delete Listing Confirmation */}
      <AlertDialog open={!!listingToDelete} onOpenChange={() => setListingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-6 h-6" /> Confirm Listing Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the listing "{listingToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteListingMutation.mutate(listingToDelete!)}
              disabled={deleteListingMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteListingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-6 h-6" /> Confirm User Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the user "{userToDelete?.email}" and all their associated data (listings, favorites, etc.)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate(userToDelete!)}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}