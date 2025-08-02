import { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Loader2, Upload, X, MapPin, Info, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { countries } from '@/lib/countries';
import { useNsfwCheck } from '../../hooks/useNsfwCheck';
import { validateText } from '@/lib/profanity';
import { ProfanityViolationModal } from './ProfanityViolationModal';

interface EditListingProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
}

const categories = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books & Study' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'gaming', label: 'Gaming' },
];

export function EditListing({ isOpen, onClose, listing }: EditListingProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({ title: '', description: '', price: '', category: '', location: '', countryCode: '+1', phoneNumber: '', condition: '' });
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [isCheckingImages, setIsCheckingImages] = useState(false);
  const { checkImage, isModelLoading } = useNsfwCheck();
  const [violation, setViolation] = useState<{ field?: 'title' | 'description'; word?: string } | null>(null);

  useEffect(() => {
    if (listing) {
      const contact = listing.contact?.replace(/\s+/g, '') || '';
      const sortedCountries = [...countries].sort((a, b) => b.dial_code.length - a.dial_code.length);
      let foundCountry = sortedCountries.find(c => contact.startsWith(c.dial_code));

      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price?.toString() || '',
        category: listing.category || '',
        location: listing.location || '',
        countryCode: foundCountry?.dial_code || '+1',
        phoneNumber: foundCountry ? contact.substring(foundCountry.dial_code.length) : contact,
        condition: listing.condition || '',
      });
      setExistingImageUrls(listing.image_urls || []);
      setNewImages([]);
      setImagesToDelete([]);
      setViolation(null);
    }
  }, [listing]);

  const updateListingMutation = useMutation({
    mutationFn: async () => {
      if (!listing || !session) throw new Error("Authentication error.");

      if (imagesToDelete.length > 0) {
        const imagePaths = imagesToDelete.map(url => new URL(url).pathname.split('/listing_images/')[1]);
        const { error: deleteError } = await supabase.storage.from('listing_images').remove(imagePaths);
        if (deleteError) console.warn(`Partial image deletion failed: ${deleteError.message}`);
      }

      const newUploadedUrls = await Promise.all(
        newImages.map(async (file) => {
          const filePath = `${session.user.id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from('listing_images').upload(filePath, file);
          if (error) throw new Error(`Image upload failed: ${error.message}`);
          const { data: { publicUrl } } = supabase.storage.from('listing_images').getPublicUrl(filePath);
          return publicUrl;
        })
      );

      const finalImageUrls = [...existingImageUrls, ...newUploadedUrls];
      if (finalImageUrls.length === 0) throw new Error("Listing must have at least one image.");

      const { title, description, price, category, location, countryCode, phoneNumber, condition } = formData;
      const { error } = await supabase
        .from('listings')
        .update({ 
          title, description, category, location, condition,
          price: parseFloat(price), 
          image_urls: finalImageUrls,
          contact: `${countryCode}${phoneNumber.replace(/\D/g, '')}`,
        })
        .eq('id', listing.id);

      if (error) throw new Error(`Failed to update listing: ${error.message}`);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Your listing has been updated." });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveChanges = () => {
    const finalImageUrls = [...existingImageUrls, ...newImages];
    if (finalImageUrls.length === 0) {
      toast({ title: "Missing Images", description: "Listing must have at least one image.", variant: "destructive" });
      return;
    }

    const textValidationResult = validateText(formData.title, formData.description);
    if (textValidationResult.isProfane) {
      setViolation({ field: textValidationResult.field, word: textValidationResult.word });
      return;
    }

    updateListingMutation.mutate();
  };

  const handleImageUpload = async (files: FileList) => {
    const newFiles = Array.from(files).slice(0, 5 - (existingImageUrls.length + newImages.length));
    if (newFiles.length === 0) return;

    setIsCheckingImages(true);
    const safeImages: File[] = [];

    for (const file of newFiles) {
      const isSafe = await checkImage(file);
      if (isSafe) {
        safeImages.push(file);
      }
    }

    setNewImages(prev => [...prev, ...safeImages]);
    setIsCheckingImages(false);
  };

  const removeExistingImage = (url: string) => {
    setExistingImageUrls(prev => prev.filter(u => u !== url));
    setImagesToDelete(prev => [...prev, url]);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = e.target.value;
    setFormData(prev => {
        if (newPrice === '0') {
            return { ...prev, price: newPrice, category: 'free' };
        }
        if (prev.price === '0' && newPrice !== '0') {
            return { ...prev, price: newPrice, category: '' };
        }
        return { ...prev, price: newPrice };
    });
  };

  if (!listing) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-2xl sm:h-auto sm:max-h-[95vh] sm:rounded-lg flex flex-col overflow-hidden [&>button]:hidden">
        
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4">
          <div className="space-y-1">
            <DialogTitle className="text-xl">Edit Listing</DialogTitle>
            <DialogDescription>Update the details for your item.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto hide-scrollbar">
          <div className="p-4 space-y-6">
            {/* Image Management Section */}
            <div className="space-y-3">
              <Label className="font-semibold">Images (up to 5) *</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {existingImageUrls.map((url) => (
                  <div key={url} className="relative group aspect-square">
                    <img src={url} alt="Existing listing" className="w-full h-full object-cover rounded-lg border" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExistingImage(url)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
                {newImages.map((image, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img src={URL.createObjectURL(image)} alt={`New upload ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setNewImages(prev => prev.filter((_, i) => i !== index))}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
                {(existingImageUrls.length + newImages.length) < 5 && (
                  <>
                    <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} className="hidden" id="image-update-upload" />
                    <label htmlFor="image-update-upload" className="cursor-pointer flex items-center justify-center border-2 border-dashed rounded-lg aspect-square text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                      <Upload className="w-6 h-6" />
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Form Fields Section */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="font-semibold">Listing Details *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="What are you selling?" />
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe your item (optional)" rows={4} />
              <div className="grid grid-cols-2 gap-4">
                <Input id="price" type="number" value={formData.price} onChange={handlePriceChange} placeholder="Price ($)" min="0" />
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))} disabled={formData.price === '0'}>
                  <SelectTrigger>
                      <SelectValue placeholder="Category">
                          {formData.price === '0' ? 'Free Stuff' : undefined}
                      </SelectValue>
                  </SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="location" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="Location" className="pl-10" />
                </div>
                <Select value={formData.condition} onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}>
                  <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="like_new">Like New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="font-semibold">Contact Info *</Label>
              <div className="flex items-center gap-2">
                <Select value={formData.countryCode} onValueChange={(value) => setFormData(prev => ({ ...prev, countryCode: value }))}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.dial_code}>{`${c.code} ${c.dial_code}`}</SelectItem>)}</SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="contact" value={formData.phoneNumber} onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))} placeholder="Phone Number" className="pl-10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-background sticky bottom-0 z-10 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={updateListingMutation.isPending || isCheckingImages || isModelLoading} className="w-full sm:w-auto">
            {(updateListingMutation.isPending || isCheckingImages || isModelLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isModelLoading ? 'Scanner loading...' : isCheckingImages ? 'Checking images...' : 'Save Changes'}
          </Button>
        </DialogFooter>
        <ProfanityViolationModal 
          isOpen={!!violation} 
          onClose={() => setViolation(null)} 
          violation={violation!} 
        />
      </DialogContent>
    </Dialog>
  );
}