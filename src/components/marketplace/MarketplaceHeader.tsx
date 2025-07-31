import { Bell, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/auth/UserMenu';
import { Link } from 'react-router-dom';

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
}

export function MarketplaceHeader({ onCreateListing }: MarketplaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 max-w-screen-2xl">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">DM</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Desi Market Place
              </h1>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button onClick={onCreateListing} className="hidden sm:flex"><Plus className="w-4 h-4 mr-2" />Create Listing</Button>
          <Button onClick={onCreateListing} size="icon" className="sm:hidden flex"><Plus className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="relative h-9 w-9"><Bell className="w-4 h-4" /><Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-destructive">3</Badge></Button>
          <Button variant="ghost" size="icon" className="relative h-9 w-9"><MessageCircle className="w-4 h-4" /><Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-primary">2</Badge></Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}