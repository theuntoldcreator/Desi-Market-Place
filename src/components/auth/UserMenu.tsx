import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export function UserMenu() {
  const { session } = useSessionContext();
  const supabase = useSupabaseClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
  });

  if (!session) return null;

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  const email = session.user.email;
  const avatarUrl = profile?.avatar_url;
  const fallback = fullName ? fullName[0].toUpperCase() : email?.[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl || undefined} alt={fullName || email} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" /><span>Profile</span></Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => supabase.auth.signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}