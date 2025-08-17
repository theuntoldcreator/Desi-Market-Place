import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SidebarContent } from '@/components/layout/MarketplaceSidebar';

interface MobileCategoriesSheetProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function MobileCategoriesSheet({ selectedCategory, onCategoryChange }: MobileCategoriesSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="relative h-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors group">
          <Menu className="h-6 w-6" />
          <span className="text-xs mt-1">Categories</span>
          <div className="absolute bottom-0 h-1 bg-primary rounded-t-sm transition-all duration-200 w-0 opacity-0 group-hover:w-1/2 group-hover:opacity-100" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-80 p-0 bg-white"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Categories</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="absolute right-4 top-4 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </SheetHeader>
        <SidebarContent 
          selectedCategory={selectedCategory} 
          onCategoryChange={onCategoryChange} 
          onLinkClick={() => setIsOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}