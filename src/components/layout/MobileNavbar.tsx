import { Home, ShoppingBag, Heart } from 'lucide-react'; // Removed User icon
import { NavLinkIcon } from '@/components/layout/NavLinkIcon';
import { cn } from '@/lib/utils';

export function MobileNavbar() {
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg",
      "flex justify-around items-center h-16 sm:hidden" // Visible only on mobile
    )}>
      <NavLinkIcon to="/" icon={Home} label="Home" />
      <NavLinkIcon to="/my-listings" icon={ShoppingBag} label="My Listings" />
      <NavLinkIcon to="/favorites" icon={Heart} label="Favorites" />
      {/* Removed NavLinkIcon for Profile */}
    </nav>
  );
}