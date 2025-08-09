import { useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Phone, MapPin, Loader2, Info, Image as ImageIcon, Camera, GalleryHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { countries } from '@/lib/countries';
import { Alert, AlertDescription } from '../ui/alert';
import { validateText } from '@/lib/profanity';
import { ProfanityViolationModal } from './ProfanityViolationModal';
import imageCompression from 'browser-image-compression';

interface CreateListingProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books & Study' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'gaming', 'label': 'Gaming' },
];

export function CreateListing({ isOpen, onClose }: CreateListingProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '', description: '', price: '', category: '', location: '', countryCode: '+1', phoneNumber: '', condition: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [violation, setViolation] = useState<{ field?: 'title' | 'description'; word?: string } | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', category: '', location: '', countryCode: '+1', phoneNumber: '', condition: '' });
    setImages([]);
    setViolation(null);
  };

  const createListingMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("You must be logged in to create a listing.");

      const imageUrls = await Promise.all(
        images.map(async (file) => {
          const filePath = `${session.user.id}/${Date.now()}-${file.name.split('.').slice(0, -1).join('.')}.webp`; // Ensure .webp extension
          const { error: uploadError } = await supabase.storage.from('listing_images').upload(filePath, file);
          if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
          const { data: { publicUrl } } = supabase.storage.from('listing_images').getPublicUrl(filePath);
          return publicUrl;
        })
      );

      const { title, description, price, category, location, countryCode, phoneNumber, condition } = formData;
      const { error: insertError } = await supabase.from('listings').insert({
        title, description, category, location, condition,
        price: parseFloat(price),
        image_urls: imageUrls,
        user_id: session.user.id,
        contact: `${countryCode}${phoneNumber.replace(/\D/g, '')}`,
      });

      if (insertError) throw new Error(`Failed to create listing: ${insertError.message}`);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Your listing has been created." });
      console.log('Invalidating listings query after successful creation.'); // Debugging log
      queryClient.invalidateQueries({ queryKey: ['listings', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handlePublish = () => {
    if (!validateForm()) {
      toast({ title: "Missing Fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (images.length === 0) {
      toast({ title: "Missing Images", description: "Please upload at least one image.", variant: "destructive" });
      return;
    }

    const textValidationResult = validateText(formData.title, formData.description);
    if (textValidationResult.isProfane) {
      setViolation({ field: textValidationResult.field, word: textValidationResult.word });
      return;
    }

    createListingMutation.mutate();
  };

  const handleImageUpload = async (files: FileList) => {
    const newFilesToProcess = Array.from(files);
    if (newFilesToProcess.length === 0) return;

    setIsProcessingImages(true);
    toast({ title: "Processing images...", description: "Optimizing and converting images." });

    const processedFiles: File[] = [];
    const maxTargetSize = 4 * 1024 * 1024; // 4MB

    for (const file of newFilesToProcess) {
      if (images.length + processedFiles.length >= 5) {
        toast({ title: "Image Limit Reached", description: "You can upload a maximum of 5 images.", variant: "destructive" });
        break;
      }

      let finalFile = file;
      if (file.size > maxTargetSize) {
        try {
          const options = {
            maxSizeMB: 4, // Target max size
            maxWidthOrHeight: 2560, // Max long edge
            useWebWorker: true,
            fileType: 'image/webp', // Convert to WebP
            quality: 0.8, // 80% quality
          };
          const compressedFile = await imageCompression(file, options);
          finalFile = compressedFile;
          
          // After compression, re-check if it's within the acceptable range
          if (finalFile.size > maxTargetSize) {
            toast({ title: "Compression Failed", description: `Image '${file.name}' could not be compressed to the required size (max 4MB). Current: ${(finalFile.size / (1024 * 1024)).toFixed(2)} MB.`, variant: "destructive" });
            continue;
          }
          toast({ title: "Image Compressed", description: `Image '${file.name}' compressed to ${(finalFile.size / (1024 * 1024)).toFixed(2)} MB.` });
        } catch (error) {
          console.error("Image compression error:", error);
          toast({ title: "Processing Failed", description: `Could not process image '${file.name}'. Please try another image.`, variant: "destructive" });
          continue;
        }
      } else {
        // Image is already within 4MB
        toast({ title: "Image Accepted", description: `Image '${file.name}' accepted at ${(file.size / (1024 * 1024)).toFixed(2)} MB.` });
      }

      processedFiles.push(finalFile);
    }

    setImages(prev => [...prev, ...processedFiles]);
    if (processedFiles.length > 0) {
      toast({ title: "Images Ready", description: `${processedFiles.length} image(s) processed successfully.` });
    } else {
      toast({ title: "No Images Added", description: "No images met the size requirements." });
    }
    setIsProcessingImages(false);
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const validateForm = () => {
    const requiredFields = ['title', 'price', 'category', 'location', 'phoneNumber', 'condition'];
    if (formData.price === '0') {
        const freeRequired = ['title', 'price', 'location', 'phoneNumber', 'condition'];
        return freeRequired.every(field => !!(formData as any)[field]);
    }
    return requiredFields.every(field => !!(formData as any)[field]);
  };

  const handlePriceChange = (e: React.ChangeEvent<IHTMLInputElement>) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (resetForm(), onClose())}>
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-2xl sm:h-auto sm:max-h-[95vh] sm:rounded-lg flex flex-col overflow-hidden [&>button]:hidden">
        
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4">
          <div className="space-y-1">
            <DialogTitle className="text-xl">Create New Listing</DialogTitle>
            <DialogDescription>Fill in the details to sell your item.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto hide-scrollbar">
          <div className="p-4 space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label className="font-semibold">Images (up to 5) *</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img src={URL.createObjectURL(image)} alt={`Upload ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(index)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label 
                    htmlFor="image-upload-create"
                    className={cn(
                      "border-2 border-dashed rounded-lg py-4 px-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                      images.length === 0 ? "col-span-full aspect-video min-h-[100px]" : "col-span-1 aspect-square min-h-[100px]"
                    )}
                  >
                    <input 
                      id="image-upload-create" 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={async (e) => e.target.files && await handleImageUpload(e.target.files)} 
                      className="hidden" 
                      disabled={images.length >= 5 || isProcessingImages}
                    />
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    <p className="font-medium text-primary text-lg">Add Photos</p>
                    <p className="text-sm text-muted-foreground">Max 5 images.</p>
                  </label>
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
              <Alert className="text-xs p-3">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your number is used for WhatsApp chat. Be respectful and avoid sharing sensitive info.
                </AlertDescription>
              </Alert>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Listings are active for 20 days. You can manage them from 'My Listings'.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-background sticky bottom-0 z-10 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4 flex justify-end gap-2">
          <Button onClick={onClose} className="w-full sm:w-auto" variant="outline">Cancel</Button>
          <Button onClick={handlePublish} disabled={createListingMutation.isPending || !validateForm() || isProcessingImages}>
            {createListingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createListingMutation.isPending ? 'Publishing...' : 'Publish Listing'}
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