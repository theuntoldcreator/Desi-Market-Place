import { Home, ShoppingBag, Heart } from 'lucide-react';
import { NavLinkIcon } from '@/components/layout/NavLinkIcon';
import { cn } from '@/lib/utils';
import { MobileCategoriesSheet } from '@/components/marketplace/MobileCategoriesSheet'; // Import the new component

interface MobileNavbarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onlineCount: number;
  totalUsersCount?: number;
}

export function MobileNavbar({ selectedCategory, onCategoryChange, onlineCount, totalUsersCount }: MobileNavbarProps) {
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg",
      "flex justify-around items-center h-16 sm:hidden" // Visible only on mobile
    )}>
      <NavLinkIcon to="/" icon={Home} label="Home" />
      <NavLinkIcon to="/my-listings" icon={ShoppingBag} label="My Listings" />
      <NavLinkIcon to="/favorites" icon={Heart} label="Favorites" />
      <MobileCategoriesSheet 
        selectedCategory={selectedCategory} 
        onCategoryChange={onCategoryChange} 
        onlineCount={onlineCount}
        totalUsersCount={totalUsersCount}
      />
    </nav>
  );
}