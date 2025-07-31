import { useState, useEffect } from 'react';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { DisclaimerSection } from '@/components/marketplace/DisclaimerSection';
import { Button } from '@/components/ui/button';
import { ChevronDown, Filter, SortAsc } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock data
const mockListings = [
  {
    id: '1',
    title: 'iPhone 13 Pro Max 256GB - Like New',
    price: 65000,
    images: [
      'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=500',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500'
    ],
    location: 'Delhi University North Campus',
    contact: '+91 9876543210',
    seller: { name: 'Rahul Sharma', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    category: 'Electronics',
    timeAgo: '2 hours ago',
    isFavorited: false
  },
  {
    id: '2',
    title: 'Study Table with Chair - Excellent Condition',
    price: 3500,
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500'
    ],
    location: 'JNU Campus',
    contact: '+91 8765432109',
    seller: { name: 'Priya Patel', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150' },
    category: 'Furniture',
    timeAgo: '5 hours ago',
    isFavorited: true
  },
  {
    id: '3',
    title: 'Engineering Mathematics Textbooks Set',
    price: 1200,
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500'
    ],
    location: 'IIT Delhi',
    contact: '+91 7654321098',
    seller: { name: 'Amit Kumar', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    category: 'Books',
    timeAgo: '1 day ago',
    isFavorited: false
  },
  {
    id: '4',
    title: 'Royal Enfield Classic 350 - 2021 Model',
    price: 145000,
    images: [
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500'
    ],
    location: 'Jamia Millia Islamia',
    contact: '+91 6543210987',
    seller: { name: 'Arjun Singh', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150' },
    category: 'Vehicles',
    timeAgo: '3 days ago',
    isFavorited: false
  },
  {
    id: '5',
    title: 'Gaming Laptop - ROG Strix G15',
    price: 85000,
    images: [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500'
    ],
    location: 'Delhi University South Campus',
    contact: '+91 5432109876',
    seller: { name: 'Sneha Gupta', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    category: 'Electronics',
    timeAgo: '1 week ago',
    isFavorited: true
  },
  {
    id: '6',
    title: 'Brand New Winter Jacket Collection',
    price: 2500,
    images: [
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500'
    ],
    location: 'AIIMS Delhi',
    contact: '+91 4321098765',
    seller: { name: 'Neha Verma', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150' },
    category: 'Clothing',
    timeAgo: '1 week ago',
    isFavorited: false
  }
];

export default function Marketplace() {
  const [listings, setListings] = useState(mockListings);
  const [filteredListings, setFilteredListings] = useState(mockListings);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [sortBy, setSortBy] = useState('newest');
  const { toast } = useToast();

  useEffect(() => {
    let filtered = listings;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(listing => 
        listing.category.toLowerCase() === selectedCategory
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort listings
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
        default:
          return 0; // Keep original order for newest
      }
    });
    
    setFilteredListings(filtered);
    setVisibleCount(6); // Reset visible count when filters change
  }, [selectedCategory, searchQuery, listings, sortBy]);

  const handleFavoriteToggle = (id: string) => {
    setListings(prev => prev.map(listing =>
      listing.id === id 
        ? { ...listing, isFavorited: !listing.isFavorited }
        : listing
    ));
    
    const listing = listings.find(l => l.id === id);
    if (listing) {
      toast({
        title: listing.isFavorited ? 'Removed from favorites' : 'Added to favorites',
        description: listing.title,
      });
    }
  };

  const handleContact = (contact: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(contact);
    toast({
      title: 'Contact copied!',
      description: `${contact} copied to clipboard`,
    });
  };

  const handleCreateListing = (newListing: any) => {
    setListings(prev => [newListing, ...prev]);
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gray-50/50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Sidebar - handled by MarketplaceHeader */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MarketplaceHeader
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreateListing={() => setShowCreateListing(true)}
          />
          
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8 space-y-8 max-w-7xl">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {selectedCategory === 'all' ? 'All Listings' : 
                     selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {filteredListings.length} items found
                    {searchQuery && ` for "${searchQuery}"`}
                  </p>
                </div>
                
                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortBy(sortBy === 'newest' ? 'price-low' : sortBy === 'price-low' ? 'price-high' : 'newest')}
                    className="gap-2"
                  >
                    <SortAsc className="w-4 h-4" />
                    {sortBy === 'newest' && 'Newest First'}
                    {sortBy === 'price-low' && 'Price: Low to High'}
                    {sortBy === 'price-high' && 'Price: High to Low'}
                  </Button>
                </div>
              </div>

              {/* Listings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredListings.slice(0, visibleCount).map((listing) => (
                  <ListingCard
                    key={listing.id}
                    {...listing}
                    onFavoriteToggle={handleFavoriteToggle}
                    onContact={handleContact}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {visibleCount < filteredListings.length && (
                <div className="text-center">
                  <Button 
                    onClick={loadMore}
                    variant="outline"
                    size="lg"
                    className="gap-2 hover:bg-primary hover:text-white transition-colors"
                  >
                    Load More
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* No Results */}
              {filteredListings.length === 0 && (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-semibold mb-2">No listings found</h3>
                    <p className="text-muted-foreground mb-6">
                      Try adjusting your search or browse different categories
                    </p>
                    <Button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      variant="outline"
                      size="lg"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}

              {/* Disclaimer Section */}
              <DisclaimerSection />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <MarketplaceHeader
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateListing={() => setShowCreateListing(true)}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 space-y-6">
            {/* Results Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                  {selectedCategory === 'all' ? 'All Listings' : 
                   selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortBy(sortBy === 'newest' ? 'price-low' : sortBy === 'price-low' ? 'price-high' : 'newest')}
                  className="gap-1"
                >
                  <SortAsc className="w-3 h-3" />
                  Sort
                </Button>
              </div>
              <p className="text-muted-foreground">
                {filteredListings.length} items found
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredListings.slice(0, visibleCount).map((listing) => (
                <ListingCard
                  key={listing.id}
                  {...listing}
                  onFavoriteToggle={handleFavoriteToggle}
                  onContact={handleContact}
                />
              ))}
            </div>

            {/* Load More Button */}
            {visibleCount < filteredListings.length && (
              <div className="text-center">
                <Button 
                  onClick={loadMore}
                  variant="outline"
                  size="lg"
                  className="gap-2 w-full sm:w-auto"
                >
                  Load More
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* No Results */}
            {filteredListings.length === 0 && (
              <div className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Try adjusting your search or browse different categories
                  </p>
                  <Button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Disclaimer Section */}
            <DisclaimerSection />
          </div>
        </main>
      </div>

      <CreateListing
        isOpen={showCreateListing}
        onClose={() => setShowCreateListing(false)}
        onSubmit={handleCreateListing}
      />
    </div>
  );
}