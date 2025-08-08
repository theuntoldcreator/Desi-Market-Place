import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { Link } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';

interface MarketplaceHeaderProps {
  onCreateListing: () => void;
}

export function MarketplaceHeader({ onCreateListing }: MarketplaceHeaderProps) {
  const session = useSession();
  const logoUrl = 'https://res.cloudinary.com/dlzvthxf5/image/upload/v1754093530/eaglelogo_otceda.png';
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur-sm">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center sm:space-x-3">
            <img src={logoUrl} alt="NRI's Marketplace Logo" className="hidden sm:block w-8 h-8 rounded-lg" />
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent bg-[size:200%_auto] animate-gradient-move">
              NRI's Marketplace
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button onClick={onCreateListing} className="hidden sm:flex"><Plus className="w-4 h-4 mr-2" />Create Listing</Button>
          <Button onClick={onCreateListing} size="icon" className="sm:hidden flex"><Plus className="w-4 h-4" /></Button>
          {session ? (
            <UserMenu />
          ) : (
            <Button asChild>
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}