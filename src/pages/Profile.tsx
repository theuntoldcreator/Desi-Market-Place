import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Mail, Phone, Calendar, Edit, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { format } from 'date-fns';
import { EditProfile } from '@/components/auth/EditProfile';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export default function Profile() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
        // This now needs to be handled by Clerk.
        // We'll call the deleteSelf method on the user object.
        if (!user) throw new Error("Not authenticated");
        await user.delete();
    },
    onSuccess: () => {
        toast({ title: "Account Deleted", description: "Your account and all associated data have been permanently deleted." });
        // Clerk will handle redirecting the user after deletion.
    },
    onError: (error: any) => {
        toast({ title: "Deletion Failed", description: error.message || "Could not delete your account.", variant: "destructive" });
    },
    onSettled: () => {
        setShowDeleteConfirm(false);
    }
  });

  const renderProfileDetail = (Icon: React.ElementType, label: string, value: string | null | undefined) => (
    <div className="flex items-center gap-4">
      <Icon className="w-5 h-5 text-muted-foreground" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading || !isLoaded) {
      return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (isError || !profile || !user) {
      return <div className="text-center py-16 text-destructive">Failed to load your profile.</div>;
    }

    const fullName = user.fullName;
    const fallback = user.firstName?.[0] || user.primaryEmailAddress?.emailAddress[0];

    return (
      <>
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Profile</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowEditProfile(true)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.imageUrl} alt={fullName || ''} />
                <AvatarFallback className="text-4xl">{fallback?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">{fullName}</h2>
                <p className="text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t">
              {renderProfileDetail(User, 'Full Name', fullName)}
              {renderProfileDetail(Mail, 'Email', user.primaryEmailAddress?.emailAddress)}
              {renderProfileDetail(Phone, 'Phone Number', profile.phone_number)}
              {renderProfileDetail(MapPin, 'Location', profile.location)}
              {renderProfileDetail(Calendar, 'Date of Birth', profile.dob ? format(new Date(profile.dob), 'PPP') : null)}
              {renderProfileDetail(User, 'Gender', profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null)}
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start">
            <div className="w-full pt-6 mt-6 border-t">
                <h3 className="font-semibold text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Deleting your account is permanent. All of your data will be removed. This action cannot be undone.
                </p>
                <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full sm:w-auto"
                    disabled={deleteAccountMutation.isPending}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete My Account
                </Button>
            </div>
          </CardFooter>
        </Card>
        {showEditProfile && (
          <EditProfile
            isOpen={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            profile={profile}
          />
        )}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => deleteAccountMutation.mutate()}
                        disabled={deleteAccountMutation.isPending}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {deleteAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Yes, Delete Account
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  return (
    <div className="w-full">
      <MarketplaceHeader
        onCreateListing={() => setShowCreateListing(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
    </div>
  );
}