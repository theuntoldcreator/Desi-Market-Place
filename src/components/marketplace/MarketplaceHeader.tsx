import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { Link } from 'react-router-dom';
import logo from '@/assets/logofile.png';

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
}

export function MarketplaceHeader({ onCreateListing }: MarketplaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 max-w-screen-2xl">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
              <img src={logo} alt="Desi Market Place Logo" className="w-6 h-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent bg-[size:200%_auto] animate-gradient-move">
              Desi Market Place
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button onClick={onCreateListing} className="hidden sm:flex"><Plus className="w-4 h-4 mr-2" />Create Listing</Button>
          <Button onClick={onCreateListing} size="icon" className="sm:hidden flex"><Plus className="w-4 h-4" /></Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}