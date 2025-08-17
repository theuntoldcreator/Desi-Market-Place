import { Plus, Home, ShoppingBag, Heart, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import marketplaceLogo from '@/assets/marketplace.jpg';
import { NavLinkIcon } from '@/components/layout/NavLinkIcon';
import { MobileSearchDialog } from '../marketplace/MobileSearchDialog';

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MarketplaceHeader({ onCreateListing, searchQuery, onSearchChange }: MarketplaceHeaderProps) {
  const logoUrl = marketplaceLogo;
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
        <nav className="hidden md:flex flex-1 justify-center gap-2">
          <NavLinkIcon to="/" icon={Home} label="All Listings" />
          <NavLinkIcon to="/my-listings" icon={ShoppingBag} label="My Listings" />
          <NavLinkIcon to="/favorites" icon={Heart} label="Favorites" />
          <NavLinkIcon to="/messages" icon={MessageSquare} label="Messages" />
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <MobileSearchDialog searchQuery={searchQuery} onSearchChange={onSearchChange} />
          <Button onClick={onCreateListing} className="hidden lg:flex"><Plus className="w-4 h-4 mr-2" />Create Listing</Button>
          <Button onClick={onCreateListing} size="icon" variant="outline" className="hidden sm:flex lg:hidden"><Plus className="w-4 h-4" /></Button>
          <Button onClick={onCreateListing} size="icon" className="flex sm:hidden"><Plus className="w-4 h-4" /></Button>
          <SignedIn>
            <UserMenu />
          </SignedIn>
          <SignedOut>
            <Button asChild>
              <Link to="/sign-in">Login</Link>
            </Button>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}