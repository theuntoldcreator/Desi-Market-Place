import { useState } from 'react';
import { Upload, X, Phone, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateListingProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (listing: any) => void;
}

const categories = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books & Study' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'gaming', label: 'Gaming' },
];

const locations = [
  'Delhi University North Campus',
  'Delhi University South Campus',
  'JNU Campus',
  'Jamia Millia Islamia',
  'IIT Delhi',
  'AIIMS Delhi',
  'Other - Specify in description'
];

export function CreateListing({ isOpen, onClose, onSubmit }: CreateListingProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    location: '',
    contact: '',
    images: [] as File[]
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (files: FileList) => {
    const newImages = Array.from(files).slice(0, 5 - formData.images.length);
    const validImages = newImages.filter(file => file.type.startsWith('image/'));
    
    if (validImages.length !== newImages.length) {
      toast({
        title: "Invalid files",
        description: "Please select only image files",
        variant: "destructive"
      });
    }
    
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...validImages]
    }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast({ title: "Error", description: "Please enter a valid price", variant: "destructive" });
      return false;
    }
    if (!formData.category) {
      toast({ title: "Error", description: "Please select a category", variant: "destructive" });
      return false;
    }
    if (!formData.location) {
      toast({ title: "Error", description: "Please select a location", variant: "destructive" });
      return false;
    }
    if (!formData.contact.trim()) {
      toast({ title: "Error", description: "Please enter a contact number", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    setIsUploading(true);
    
    try {
      // Simulate image upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate image upload to Cloudinary
      const imageUrls = await Promise.all(
        formData.images.map(async (file) => {
          // In real implementation, upload to Cloudinary here
          return URL.createObjectURL(file);
        })
      );

      const listing = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price),
        category: formData.category,
        location: formData.location,
        contact: formData.contact,
        images: imageUrls,
        seller: {
          name: 'Current User', // Get from Clerk user
          avatar: ''
        },
        timeAgo: 'just now',
        isFavorited: false
      };

      onSubmit(listing);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        location: '',
        contact: '',
        images: []
      });
      
      setShowConfirmation(false);
      onClose();
      
      toast({
        title: "Success!",
        description: "Your listing has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create New Listing</DialogTitle>
            <DialogDescription>
              Fill in the details below to create your marketplace listing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Images (Max 5)</Label>
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200",
                  dragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-accent/20"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                  disabled={formData.images.length >= 5}
                />
                <label 
                  htmlFor="image-upload" 
                  className={cn(
                    "cursor-pointer block",
                    formData.images.length >= 5 && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {dragActive ? "Drop images here" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 10MB each ({formData.images.length}/5)
                      </p>
                    </div>
                  </div>
                </label>
              </div>
              
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">Listing Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., iPhone 13 Pro Max in excellent condition"
                className="bg-background/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your item in detail..."
                rows={4}
                className="bg-background/50 border-border/50 focus:bg-background transition-colors resize-none"
              />
            </div>

            {/* Price and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-base font-medium">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0"
                  className="bg-background/50 border-border/50 focus:bg-background transition-colors"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="bg-background/50 border-border/50 focus:bg-background transition-colors">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location and Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Location *</Label>
                <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
                  <SelectTrigger className="bg-background/50 border-border/50 focus:bg-background transition-colors">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact" className="text-base font-medium">Contact Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              Create Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Your Listing</DialogTitle>
            <DialogDescription>
              Please review your listing details before publishing
            </DialogDescription>
          </DialogHeader>
          
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-start gap-3">
                {formData.images.length > 0 ? (
                  <img 
                    src={URL.createObjectURL(formData.images[0])} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <span className="line-clamp-2">{formData.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold text-green-600">₹{parseInt(formData.price || '0').toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span>{categories.find(c => c.value === formData.category)?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="text-right">{formData.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact:</span>
                <span>{formData.contact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Images:</span>
                <span>{formData.images.length} uploaded</span>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Edit
            </Button>
            <Button 
              onClick={confirmSubmit} 
              disabled={isUploading}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </div>
              ) : (
                'Publish Listing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}