import { Search, Home, ShoppingBag, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NavLinkIcon } from '@/components/layout/NavLinkIcon';

interface MarketplaceMobileSearchAndNavProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MarketplaceMobileSearchAndNav({
  searchQuery,
  onSearchChange,
}: MarketplaceMobileSearchAndNavProps) {
  return (
    <div className="md:hidden sticky top-16 z-20 bg-background border-b border-border p-4 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search Marketplace"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2 rounded-full"
        />
      </div>

      {/* Navigation Buttons */}
      <nav className="flex justify-around items-center w-full">
        <NavLinkIcon to="/" icon={Home} label="All Listings" />
        <NavLinkIcon to="/my-listings" icon={ShoppingBag} label="My Listings" />
        <NavLinkIcon to="/favorites" icon={Heart} label="Favorites" />
      </nav>
    </div>
  );
}