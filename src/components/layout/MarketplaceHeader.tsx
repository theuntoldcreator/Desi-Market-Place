import { LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import marketplaceLogo from '@/assets/marketplace.jpg';
import { MobileSearchDialog } from '../marketplace/MobileSearchDialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MarketplaceHeader({ onCreateListing, searchQuery, onSearchChange }: MarketplaceHeaderProps) {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const logoUrl = marketplaceLogo;

  const handleCreateClick = () => {
    if (session) {
      onCreateListing();
    } else {
      navigate('/login');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate(0); // Refresh page to clear state
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-header-bg backdrop-blur-sm">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center sm:space-x-3">
            <img src={logoUrl} alt="NRI's Marketplace Logo" className="hidden sm:block w-8 h-8 rounded-lg border border-gray-200" />
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              NRI's Marketplace
            </h1>
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <MobileSearchDialog searchQuery={searchQuery} onSearchChange={onSearchChange} />
          <Button onClick={handleCreateClick} className="hidden sm:flex"><Plus className="w-4 h-4 mr-2" />Create Listing</Button>
          <Button onClick={handleCreateClick} size="icon" className="flex sm:hidden"><Plus className="w-4 h-4" /></Button>
          
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                    <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">My Account</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/login')} className="hidden sm:flex">Login</Button>
          )}
        </div>
      </div>
    </header>
  );
}