import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import marketplaceLogo from '@/assets/marketplace.jpg';
import { MobileSearchDialog } from '../marketplace/MobileSearchDialog';

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MarketplaceHeader({ onCreateListing, searchQuery, onSearchChange }: MarketplaceHeaderProps) {
  const logoUrl = marketplaceLogo;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-header-bg backdrop-blur-sm">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center sm:space-x-3">
            <img src={logoUrl} alt="NRI's Marketplace Logo" className="hidden sm:block w-8 h-8 rounded-lg border border-gray-200" />
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              NRI's Marketplace
            </h1>
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <MobileSearchDialog searchQuery={searchQuery} onSearchChange={onSearchChange} />
          <Button onClick={onCreateListing} className="hidden sm:flex"><Plus className="w-4 h-4 mr-2" />Create Listing</Button>
          <Button onClick={onCreateListing} size="icon" className="flex sm:hidden"><Plus className="w-4 h-4" /></Button>
        </div>
      </div>
    </header>
  );
}