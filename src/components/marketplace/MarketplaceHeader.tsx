import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { Link } from 'react-router-dom';
import logo from '@/assets/eaglelogo.png';

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
}

export function MarketplaceHeader({ onCreateListing }: MarketplaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur-sm">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center sm:space-x-3">
            <img src={logo} alt="Eagle Market Place Logo" className="hidden sm:block w-8 h-8 rounded-lg" />
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#00853E] to-accent bg-clip-text text-transparent bg-[size:200%_auto] animate-gradient-move">
              Eagle Market Place
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