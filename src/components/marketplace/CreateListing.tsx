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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '../ui/alert';
import { validateText } from '@/lib/profanity';
import { ProfanityViolationModal } from './ProfanityViolationModal';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import { listingSchema, ListingFormValues } from '@/lib/schemas';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [images, setImages] = useState<File[]>([]);
  const [violation, setViolation] = useState<{ field?: 'title' | 'description'; word?: string } | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '', description: '', price: undefined, category: '', location: '', contact: '', condition: ''
    },
    mode: 'onChange',
  });

  const priceValue = form.watch('price');

  useEffect(() => {
    if (priceValue === 0) {
      form.setValue('category', 'free', { shouldValidate: true });
    } else if (form.getValues('category') === 'free') {
      form.setValue('category', '', { shouldValidate: true });
    }
  }, [priceValue, form]);

  const resetForm = () => {
    form.reset();
    setImages([]);
    setViolation(null);
  };

  const createListingMutation = useMutation({
    mutationFn: async (data: ListingFormValues) => {
      if (!user) throw new Error('You must be logged in to create a listing.');

      const imageUploadFolder = uuidv4();
      const imageUrls = await Promise.all(
        images.map(async (file) => {
          const filePath = `${imageUploadFolder}/${Date.now()}-${file.name.split('.').slice(0, -1).join('.')}.webp`;
          const { error: uploadError } = await supabase.storage.from('listing_images').upload(filePath, file);
          if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
          const { data: { publicUrl } } = supabase.storage.from('listing_images').getPublicUrl(filePath);
          return publicUrl;
        })
      );

      const { title, description, price, category, location, contact, condition } = data;
      const fullContact = `telegram:${contact}`;
      const { error: insertError } = await supabase.from('listings').insert({
        user_id: user.id,
        title, description, category, location, condition,
        contact: fullContact,
        price: price,
        image_urls: imageUrls,
      });

      if (insertError) throw new Error(`Failed to create listing: ${insertError.message}`);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Your listing has been created." });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: ListingFormValues) => {
    if (images.length === 0) {
      toast({ title: "Missing Images", description: "Please upload at least one image.", variant: "destructive" });
      return;
    }

    const textValidationResult = validateText(data.title, data.description || '');
    if (textValidationResult.isProfane) {
      setViolation({ field: textValidationResult.field, word: textValidationResult.word });
      return;
    }

    createListingMutation.mutate(data);
  };

  const handleImageUpload = async (files: FileList) => {
    const newFilesToProcess = Array.from(files);
    if (newFilesToProcess.length === 0) return;

    setIsProcessingImages(true);
    toast({ title: "Processing images...", description: "Optimizing and converting images." });

    const imageCompression = (await import('browser-image-compression')).default;
    const processedFiles: File[] = [];
    const maxTargetSize = 4 * 1024 * 1024;

    for (const file of newFilesToProcess) {
      if (images.length + processedFiles.length >= 5) {
        toast({ title: "Image Limit Reached", description: "You can upload a maximum of 5 images.", variant: "destructive" });
        break;
      }

      let finalFile = file;
      if (file.size > maxTargetSize) {
        try {
          const options = {
            maxSizeMB: 4,
            maxWidthOrHeight: 2560,
            useWebWorker: true,
            fileType: 'image/webp',
            quality: 0.8,
          };
          const compressedFile = await imageCompression(file, options);
          finalFile = compressedFile;
          
          if (finalFile.size > maxTargetSize) {
            toast({ title: "Compression Failed", description: `Image '${file.name}' could not be compressed to the required size (max 4MB).`, variant: "destructive" });
            continue;
          }
        } catch (error) {
          console.error("Image compression error:", error);
          toast({ title: "Processing Failed", description: `Could not process image '${file.name}'.`, variant: "destructive" });
          continue;
        }
      }
      processedFiles.push(finalFile);
    }

    setImages(prev => [...prev, ...processedFiles]);
    setIsProcessingImages(false);
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto hide-scrollbar">
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <FormLabel className="font-semibold">Images (up to 5) *</FormLabel>
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

              <div className="space-y-4 pt-4 border-t">
                <FormLabel className="font-semibold">Listing Details *</FormLabel>
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormControl><Input placeholder="What are you selling?" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormControl><Textarea placeholder="Describe your item (optional)" rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Price ($)" min="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="category" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={priceValue === 0}><FormControl><SelectTrigger><SelectValue placeholder="Category">{priceValue === 0 ? 'Free Stuff' : undefined}</SelectValue></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormControl><Input placeholder="Location" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="condition" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger></FormControl><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="like_new">Like New</SelectItem><SelectItem value="used">Used</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <FormField control={form.control} name="contact" render={({ field }) => (<FormItem><FormLabel className="font-semibold">Contact Info *</FormLabel><FormControl><Input placeholder="Enter your Telegram username" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Alert className="text-xs p-3"><Info className="h-4 w-4" /><AlertDescription>Buyers will contact you on Telegram. Please enter your username without the '@' symbol.</AlertDescription></Alert>
                <Alert className="text-xs p-3"><Info className="h-4 w-4" /><AlertDescription>Please be respectful and do not post content that violates or harms other users. All interactions are subject to our community guidelines.</AlertDescription></Alert>
              </div>
              
              <Alert><Info className="h-4 w-4" /><AlertDescription>Listings are active for 7 days.</AlertDescription></Alert>
            </div>
          </form>
        </Form>

        <DialogFooter className="p-4 border-t bg-background sticky bottom-0 z-10 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4 flex justify-end gap-2">
          <Button onClick={onClose} className="w-full sm:w-auto text-destructive border-destructive hover:text-destructive hover:bg-destructive/10" variant="outline">Cancel</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={createListingMutation.isPending || isProcessingImages}>
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