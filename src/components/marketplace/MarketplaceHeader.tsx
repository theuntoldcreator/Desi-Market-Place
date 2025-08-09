import { Plus, Home, ShoppingBag, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { Link } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
import marketplaceLogo from '@/assets/marketplace.jpg';
import { NavLinkIcon } from '@/components/layout/NavLinkIcon';
import { MobileSearchDialog } from './MobileSearchDialog'; // Import the new component

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
  searchQuery: string; // Add searchQuery prop
  onSearchChange: (query: string) => void; // Add onSearchChange prop
}

export function MarketplaceHeader({ onCreateListing, searchQuery, onSearchChange }: MarketplaceHeaderProps) {
  const session = useSession();
  const logoUrl = marketplaceLogo;
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-header-bg backdrop-blur-sm">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center sm:space-x-3">
            <img src={logoUrl} alt="NRI's Marketplace Logo" className="hidden sm:block w-8 h-8 rounded-lg" />
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              NRI's Marketplace
            </h1>
          </Link>
        </div>
        {/* Desktop navigation - hidden on small screens */}
        <nav className="hidden md:flex flex-1 justify-center gap-2">
          <NavLinkIcon to="/" icon={Home} label="All Listings" />
          <NavLinkIcon to="/my-listings" icon={ShoppingBag} label="My Listings" />
          <NavLinkIcon to="/favorites" icon={Heart} label="Favorites" />
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Button */}
          <MobileSearchDialog searchQuery={searchQuery} onSearchChange={onSearchChange} />
          {/* Tablet/Desktop Create Listing Buttons */}
          <Button onClick={onCreateListing} className="hidden lg:flex"><Plus className="w-4 h-4 mr-2" />Create Listing</Button>
          <Button onClick={onCreateListing} size="icon" variant="outline" className="hidden sm:flex lg:hidden"><Plus className="w-4 h-4" /></Button>
          <Button onClick={onCreateListing} size="icon" className="flex sm:hidden"><Plus className="w-4 h-4" /></Button>
          {session ? (
            <UserMenu />
          ) : (
            <Button asChild>
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}