import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2, Info, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '../ui/alert';
import { validateText } from '@/lib/profanity';
import { ProfanityViolationModal } from './ProfanityViolationModal';
import imageCompression from 'browser-image-compression';
import { Listing } from '@/lib/types';
import { listingSchema, ListingFormValues } from '@/lib/schemas';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface EditListingProps {
  listing: Listing;
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

export function EditListing({ listing, isOpen, onClose }: EditListingProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [violation, setViolation] = useState<{ field?: 'title' | 'description'; word?: string } | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (listing && isOpen) {
      form.reset({
        title: listing.title,
        description: listing.description || '',
        price: listing.price,
        category: listing.category,
        location: listing.location,
        contact: listing.contact?.split(':')[1] || '',
        condition: listing.condition || '',
      });
      setExistingImages(listing.image_urls);
      setNewImages([]);
      setImagesToRemove([]);
    }
  }, [listing, isOpen, form]);

  const updateListingMutation = useMutation({
    mutationFn: async (data: ListingFormValues) => {
      if (imagesToRemove.length > 0) {
        const filePaths = imagesToRemove.map(url => new URL(url).pathname.split('/listing_images/')[1]);
        const { error: removeError } = await supabase.storage.from('listing_images').remove(filePaths);
        if (removeError) throw new Error(`Failed to remove old images: ${removeError.message}`);
      }

      const uploadedImageUrls = await Promise.all(
        newImages.map(async (file) => {
          const folderPath = new URL(listing.image_urls[0]).pathname.split('/').slice(4, -1).join('/');
          const filePath = `${folderPath}/${Date.now()}-${file.name.split('.').slice(0, -1).join('.')}.webp`;
          const { error: uploadError } = await supabase.storage.from('listing_images').upload(filePath, file);
          if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
          const { data: { publicUrl } } = supabase.storage.from('listing_images').getPublicUrl(filePath);
          return publicUrl;
        })
      );

      const finalImageUrls = [...existingImages.filter(img => !imagesToRemove.includes(img)), ...uploadedImageUrls];

      const { title, description, price, category, location, contact, condition } = data;
      const fullContact = `telegram:${contact}`;
      const { error: updateError } = await supabase.from('listings').update({
        title, description, category, location, condition,
        contact: fullContact,
        price: price,
        image_urls: finalImageUrls,
      }).eq('id', listing.id);

      if (updateError) throw new Error(`Failed to update listing: ${updateError.message}`);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Your listing has been updated." });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['userListings', listing.user_id] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: ListingFormValues) => {
    const textValidationResult = validateText(data.title, data.description || '');
    if (textValidationResult.isProfane) {
      setViolation({ field: textValidationResult.field, word: textValidationResult.word });
      return;
    }
    updateListingMutation.mutate(data);
  };

  const handleImageUpload = async (files: FileList) => {
    const newFilesToProcess = Array.from(files);
    if (newFilesToProcess.length === 0) return;

    setIsProcessingImages(true);
    toast({ title: "Processing images...", description: "Optimizing and converting images." });

    const processedFiles: File[] = [];
    for (const file of newFilesToProcess) {
      if (existingImages.length + newImages.length + processedFiles.length >= 5) {
        toast({ title: "Image Limit Reached", description: "You can upload a maximum of 5 images.", variant: "destructive" });
        break;
      }
      try {
        const options = { maxSizeMB: 4, maxWidthOrHeight: 2560, useWebWorker: true, fileType: 'image/webp', quality: 0.8 };
        const compressedFile = await imageCompression(file, options);
        processedFiles.push(compressedFile);
      } catch (error) {
        toast({ title: "Processing Failed", description: `Could not process image '${file.name}'.`, variant: "destructive" });
      }
    }
    setNewImages(prev => [...prev, ...processedFiles]);
    setIsProcessingImages(false);
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(img => img !== url));
    setImagesToRemove(prev => [...prev, url]);
  };

  const removeNewImage = (index: number) => setNewImages(prev => prev.filter((_, i) => i !== index));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-2xl sm:h-auto sm:max-h-[95vh] sm:rounded-lg flex flex-col overflow-hidden [&>button]:hidden">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
          <DialogTitle className="text-lg font-semibold">Edit Listing</DialogTitle>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={updateListingMutation.isPending || isProcessingImages} size="sm">
            {updateListingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
          </Button>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto hide-scrollbar">
            <div className="p-4 space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
              <div className="space-y-3">
                <FormLabel className="font-semibold">Images (up to 5) *</FormLabel>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {existingImages.map((url) => (
                    <div key={url} className="relative group aspect-square">
                      <img src={url} alt="Existing listing" className="w-full h-full object-cover rounded-lg border" />
                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100" onClick={() => removeExistingImage(url)}><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  {newImages.map((file, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={URL.createObjectURL(file)} alt={`New upload ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100" onClick={() => removeNewImage(index)}><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  {existingImages.length + newImages.length < 5 && (
                    <label htmlFor="image-upload-edit" className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer aspect-square min-h-[100px]">
                      <input id="image-upload-edit" type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} className="hidden" disabled={isProcessingImages} />
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-primary">Add Photos</p>
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t">
                <FormLabel className="font-semibold">Listing Details *</FormLabel>
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="category" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="condition" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="like_new">Like New</SelectItem><SelectItem value="used">Used</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t">
                <FormField control={form.control} name="contact" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Contact Info *</FormLabel><FormControl><Input placeholder="Enter your Telegram username" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Alert className="text-xs p-3"><Info className="h-4 w-4" /><AlertDescription>Buyers will contact you on Telegram. Please enter your username without the '@' symbol.</AlertDescription></Alert>
              </div>
            </div>
          </form>
        </Form>
        <ProfanityViolationModal isOpen={!!violation} onClose={() => setViolation(null)} violation={violation!} />
      </DialogContent>
    </Dialog>
  );
}