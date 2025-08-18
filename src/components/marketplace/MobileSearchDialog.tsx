import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface MobileSearchDialogProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MobileSearchDialog({ searchQuery, onSearchChange }: MobileSearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Optionally clear search when closing, or keep it
      // onSearchChange(''); 
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="icon" className="sm:hidden flex"><Search className="w-4 h-4" /></Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-auto p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="sr-only">Search Marketplace</SheetTitle>
          <SheetDescription className="sr-only">Enter a search term to find items.</SheetDescription>
          <div className="relative flex-grow mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Marketplace"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-full"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full border border-input">
            <X className="w-5 h-5" />
          </Button>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}