import { Bell, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthButton } from '@/components/auth/AuthWrapper';
import { MarketplaceSidebar } from '@/components/layout/MarketplaceSidebar';

interface MarketplaceHeaderProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateListing: () => void;
}

export function MarketplaceHeader({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onCreateListing
}: MarketplaceHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          {/* Mobile Sidebar Trigger */}
          <MarketplaceSidebar
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onCreateListing={onCreateListing}
          />
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">DM</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Desi Market Place
              </h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                Student Marketplace Platform
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9 hover:bg-accent transition-colors"
          >
            <Bell className="w-4 h-4" />
            <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-xs bg-destructive hover:bg-destructive">
              3
            </Badge>
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Messages */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9 hover:bg-accent transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-xs bg-primary hover:bg-primary">
              2
            </Badge>
            <span className="sr-only">Messages</span>
          </Button>

          {/* User Button */}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}