import { useState } from 'react';
import { Search, ShoppingBag, Laptop, BookOpen, Home, Car, Shirt, Gamepad2, Menu, Gift, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

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
  onlineCount: number;
  totalUsersCount?: number;
}

const SidebarContent = ({ selectedCategory, onCategoryChange, searchQuery, onSearchChange, onLinkClick, onlineCount, totalUsersCount }: MarketplaceSidebarProps & { onLinkClick?: () => void }) => {
  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4 hidden md:block"> {/* Hidden on mobile, shown on desktop */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pl-10" />
        </div>
      </div>
      <Separator className="hidden md:block" /> {/* Hide separator on mobile if search is hidden */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Categories</h3>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => { onCategoryChange(cat.id); onLinkClick?.(); }} className={cn("w-full flex items-center gap-3 p-2 rounded-lg text-left", selectedCategory === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent/50')}>
            <cat.icon className="w-4 h-4" /><span>{cat.name}</span>
          </button>
        ))}
      </div>
      <Separator />
      <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Total Users</span>
          </div>
          <span className="font-semibold">{totalUsersCount ?? '...'}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex h-2.5 w-2.5 ml-1 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
            </span>
            <span>Online Now</span>
          </div>
          <span className="font-semibold">{onlineCount}</span>
        </div>
      </div>
    </div>
  );
};

export function MarketplaceSidebar(props: MarketplaceSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block w-72 border-r bg-white h-screen sticky top-16 shrink-0">
        <SidebarContent {...props} />
      </div>
      {/* Mobile */}
      <div className="sm:hidden fixed bottom-4 right-4 z-40">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild><Button size="icon" className="rounded-full shadow-lg h-14 w-14"><Menu className="h-6 w-6" /></Button></SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-80 p-0 bg-white"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetHeader className="p-4 border-b"><SheetTitle>Filters & Menu</SheetTitle></SheetHeader>
            <SidebarContent {...props} onLinkClick={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}