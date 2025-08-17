import { Search, ShoppingBag, Laptop, BookOpen, Home, Car, Shirt, Gamepad2, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', name: 'All Items', icon: ShoppingBag },
  { id: 'free', name: 'Free Stuff', icon: Gift },
  { id: 'electronics', name: 'Electronics', icon: Laptop },
  { id: 'books', name: 'Books & Study', icon: BookOpen },
  { id: 'furniture', name: 'Furniture', icon: Home },
  { id: 'vehicles', name: 'Vehicles', icon: Car },
  { id: 'clothing', name: 'Clothing', icon: Shirt },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
];

interface MarketplaceSidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface SidebarContentProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onLinkClick?: () => void;
}

export const SidebarContent = ({ selectedCategory, onCategoryChange, searchQuery, onSearchChange, onLinkClick }: SidebarContentProps) => {
  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={searchQuery} onChange={(e) => onSearchChange?.(e.target.value)} className="pl-10" />
        </div>
      </div>
      <Separator className="hidden md:block" />
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Categories</h3>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => { onCategoryChange(cat.id); onLinkClick?.(); }} className={cn("w-full flex items-center gap-3 p-2 rounded-lg text-left", selectedCategory === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent/50')}>
            <cat.icon className="w-4 h-4" /><span>{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export function MarketplaceSidebar(props: MarketplaceSidebarProps) {
  return (
    <div className="hidden sm:block w-1/5 border-r bg-white h-screen sticky top-16 shrink-0">
      <SidebarContent {...props} />
    </div>
  );
}