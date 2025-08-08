import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Mail, Phone, Calendar, Edit, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { format } from 'date-fns';
import { EditProfile } from '@/components/auth/EditProfile';
import { FloatingHomeButton } from '@/components/layout/FloatingHomeButton';

const fetchProfile = async (supabase: any, userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export default function Profile() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: () => fetchProfile(supabase, session!.user.id),
    enabled: !!session,
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
    if (isLoading) {
      return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (isError || !profile) {
      return <div className="text-center py-16 text-destructive">Failed to load your profile.</div>;
    }

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const fallback = fullName ? fullName[0].toUpperCase() : session?.user.email?.[0].toUpperCase();

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
                <AvatarImage src={profile.avatar_url} alt={fullName} />
                <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">{fullName}</h2>
                <p className="text-muted-foreground">{session?.user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t">
              {renderProfileDetail(User, 'Full Name', fullName)}
              {renderProfileDetail(Mail, 'Email', session?.user.email)}
              {renderProfileDetail(Phone, 'Phone Number', profile.phone_number)}
              {renderProfileDetail(Send, 'Telegram', profile.telegram_username)}
              {renderProfileDetail(Calendar, 'Date of Birth', profile.dob ? format(new Date(profile.dob), 'PPP') : null)}
              {renderProfileDetail(User, 'Gender', profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null)}
            </div>
          </CardContent>
        </Card>
        {showEditProfile && (
          <EditProfile
            isOpen={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            profile={profile}
          />
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50/50">
      <MarketplaceHeader onCreateListing={() => setShowCreateListing(true)} />
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
      <FloatingHomeButton />
    </div>
  );
}