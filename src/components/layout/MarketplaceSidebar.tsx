import { useState } from 'react';
import { Search, Filter, ShoppingBag, Laptop, BookOpen, Home, Car, Shirt, Gamepad2, Heart, Plus, Menu, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', name: 'All Items', icon: ShoppingBag, count: 127 },
  { id: 'electronics', name: 'Electronics', icon: Laptop, count: 45 },
  { id: 'books', name: 'Books & Study', icon: BookOpen, count: 32 },
  { id: 'furniture', name: 'Furniture', icon: Home, count: 18 },
  { id: 'vehicles', name: 'Vehicles', icon: Car, count: 12 },
  { id: 'clothing', name: 'Clothing', icon: Shirt, count: 28 },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, count: 15 },
];

interface MarketplaceSidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateListing: () => void;
}

// Desktop Sidebar Component
function DesktopSidebar({ 
  selectedCategory, 
  onCategoryChange, 
  searchQuery, 
  onSearchChange,
  onCreateListing,
  isCollapsed,
  onToggle
}: MarketplaceSidebarProps & { isCollapsed: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      "hidden lg:flex flex-col bg-white border-r border-border transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-80"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 hover:bg-accent"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!isCollapsed ? (
          <div className="p-4 space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
                />
              </div>
              
              <Button 
                onClick={onCreateListing}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Listing
              </Button>
            </div>

            <Separator />

            {/* Categories Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 hover:bg-accent/50",
                      selectedCategory === category.id 
                        ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-sm' 
                        : 'text-foreground hover:text-foreground/80'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {category.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="space-y-1">
                <button className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="font-medium">My Favorites</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">3</Badge>
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">My Listings</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">5</Badge>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Collapsed state - just icons
          <div className="flex flex-col items-center space-y-4 p-4">
            <Button
              onClick={onCreateListing}
              size="icon"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200"
              title="Create Listing"
            >
              <Plus className="w-4 h-4" />
            </Button>
            
            {categories.slice(0, 6).map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "ghost"}
                size="icon"
                onClick={() => onCategoryChange(category.id)}
                className="w-10 h-10 transition-all duration-200"
                title={category.name}
              >
                <category.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile Sidebar Component
function MobileSidebar({ 
  selectedCategory, 
  onCategoryChange, 
  searchQuery, 
  onSearchChange,
  onCreateListing 
}: MarketplaceSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryChange = (category: string) => {
    onCategoryChange(category);
    setIsOpen(false);
  };

  const handleCreateListing = () => {
    onCreateListing();
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-10 w-10 hover:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 bg-white">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">Marketplace Filters</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
                />
              </div>
              
              <Button 
                onClick={handleCreateListing}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Listing
              </Button>
            </div>

            <Separator />

            {/* Categories Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 hover:bg-accent/50",
                      selectedCategory === category.id 
                        ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-sm' 
                        : 'text-foreground hover:text-foreground/80'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {category.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="space-y-1">
                <button className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="font-medium">My Favorites</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">3</Badge>
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">My Listings</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">5</Badge>
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Main Sidebar Component
export function MarketplaceSidebar(props: MarketplaceSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <MobileSidebar {...props} />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar 
        {...props} 
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
    </>
  );
}