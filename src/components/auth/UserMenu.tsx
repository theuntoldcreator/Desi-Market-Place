import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User, ShoppingBag, Heart, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

export function UserMenu() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!session,
  });

  const handleLogout = () => {
    if (session?.user.email && profile) {
      const rememberedUser = {
        email: session.user.email,
        fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        avatarUrl: profile.avatar_url,
      };
      localStorage.setItem('rememberedUser', JSON.stringify(rememberedUser));
    } else if (session?.user.email) {
      // Fallback if profile is not loaded
      const rememberedUser = {
        email: session.user.email,
        fullName: session.user.email,
        avatarUrl: null,
      };
      localStorage.setItem('rememberedUser', JSON.stringify(rememberedUser));
    }
    supabase.auth.signOut();
  };

  if (!session) return null;

  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const fallback = fullName ? fullName[0].toUpperCase() : session.user.email?.[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} alt={fullName || session.user.email} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" /><span>Profile</span></Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/"><LayoutGrid className="mr-2 h-4 w-4" /><span>All Listings</span></Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/my-listings"><ShoppingBag className="mr-2 h-4 w-4" /><span>My Listings</span></Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/favorites"><Heart className="mr-2 h-4 w-4" /><span>Favorites</span></Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}