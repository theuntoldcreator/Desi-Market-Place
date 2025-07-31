import { useState } from 'react';
import { Heart, MapPin, Phone, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  images: string[];
  location: string;
  contact: string;
  seller: {
    name: string;
    avatar?: string;
  };
  category: string;
  timeAgo: string;
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onContact?: (contact: string) => void;
}

export function ListingCard({
  id,
  title,
  price,
  images,
  location,
  contact,
  seller,
  category,
  timeAgo,
  isFavorited = false,
  onFavoriteToggle,
  onContact
}: ListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleContact = () => {
    onContact?.(contact);
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white overflow-hidden transform hover:-translate-y-1">
      <CardContent className="p-0">
        {/* Image Section */}
        <div className="relative h-48 sm:h-52 md:h-48 bg-muted overflow-hidden">
          {images.length > 0 ? (
            <>
              <div className="relative w-full h-full">
                <img
                  src={images[currentImageIndex]}
                  alt={title}
                  className={cn(
                    "w-full h-full object-cover group-hover:scale-105 transition-all duration-500 cursor-pointer",
                    imageLoading ? "opacity-0" : "opacity-100"
                  )}
                  onClick={() => setIsImageModalOpen(true)}
                  onLoad={() => setImageLoading(false)}
                  loading="lazy"
                />
                {imageLoading && (
                  <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                    {images.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          index === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm h-8 w-8 transition-all duration-200"
            onClick={() => onFavoriteToggle?.(id)}
          >
            <Heart className={cn(
              "w-4 h-4 transition-all duration-200",
              isFavorited ? 'fill-red-500 text-red-500 scale-110' : 'text-white hover:text-red-400'
            )} />
          </Button>
          
          {/* Category Badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 bg-white/90 text-foreground backdrop-blur-sm font-medium"
          >
            {category}
          </Badge>
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-4">
          {/* Title and Price */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {title}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                ₹{price.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">{timeAgo}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {/* Seller Info and Contact */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={seller.avatar} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {seller.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{seller.name}</span>
            </div>
            
            <Button
              onClick={handleContact}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
            >
              <Phone className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Contact</span>
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4">
            <DialogTitle className="text-left">{title}</DialogTitle>
          </DialogHeader>
          <div className="relative px-4 pb-4">
            <img
              src={images[currentImageIndex]}
              alt={title}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            />
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}