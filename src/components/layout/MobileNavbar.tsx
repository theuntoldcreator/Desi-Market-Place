import { Home, Heart, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MobileCategoriesSheet } from '@/components/marketplace/MobileCategoriesSheet';

interface MobileNavbarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function MobileNavbar({ selectedCategory, onCategoryChange }: MobileNavbarProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/favorites', label: 'Favorites', icon: Heart },
    { path: '/my-listings', label: 'My Listings', icon: ShoppingBag },
  ];

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg",
      "grid grid-cols-4 items-center h-16 sm:hidden"
    )}>
      {navItems.map(item => (
        <Link key={item.path} to={item.path} className={cn(
          "relative h-full flex flex-col items-center justify-center gap-1 transition-colors group",
          isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-primary'
        )}>
          <item.icon className="h-6 w-6" />
          <span className="text-xs mt-1">{item.label}</span>
          <div className={cn(
            "absolute bottom-0 h-1 bg-primary rounded-t-sm transition-all duration-200",
            isActive(item.path) ? 'w-1/2 opacity-100' : 'w-0 opacity-0 group-hover:w-1/2 group-hover:opacity-100'
          )} />
        </Link>
      ))}
      <MobileCategoriesSheet 
        selectedCategory={selectedCategory} 
        onCategoryChange={onCategoryChange} 
      />
    </nav>
  );
}