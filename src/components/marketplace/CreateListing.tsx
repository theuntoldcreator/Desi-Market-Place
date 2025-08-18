import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '../ui/alert';
import { validateText } from '@/lib/profanity';
import { ProfanityViolationModal } from './ProfanityViolationModal';
import { useAuth } from '@/context/AuthContext';
import { listingSchema, ListingFormValues } from '@/lib/schemas';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ImageUploader } from './ImageUploader';
import { ImageMetadata } from '@/lib/types';

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
  
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [violation, setViolation] = useState<{ field?: 'title' | 'description'; word?: string } | null>(null);
  const [tempListingId, setTempListingId] = useState<number | null>(null);

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
    setTempListingId(null);
  };

  const createListingMutation = useMutation({
    mutationFn: async (data: ListingFormValues) => {
      if (!user) throw new Error('You must be logged in to create a listing.');
      if (images.length === 0) throw new Error('Please upload at least one image.');

      const textValidationResult = validateText(data.title, data.description || '');
      if (textValidationResult.isProfane) {
        setViolation({ field: textValidationResult.field, word: textValidationResult.word });
        throw new Error('Profanity detected.');
      }

      const { title, description, price, category, location, contact, condition } = data;
      const fullContact = `telegram:${contact}`;
      
      // If we have a temp listing, we just update it. Otherwise, create a new one.
      const { data: listingData, error } = tempListingId
        ? await supabase.from('listings').update({
            title, description, price, category, location, contact: fullContact, condition, status: 'active'
          }).eq('id', tempListingId).select().single()
        : await supabase.from('listings').insert({
            user_id: user.id, title, description, price, category, location, contact: fullContact, condition, status: 'active'
          }).select().single();

      if (error) throw error;
      
      // Associate images with the final listing ID
      await Promise.all(images.map(img => 
        supabase.from('images').update({ listing_id: listingData.id }).eq('id', img.id)
      ));

      return listingData;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Your listing has been created." });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      if (error.message !== 'Profanity detected.') {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  });

  const createTempListing = async () => {
    if (!user || tempListingId) return tempListingId;
    const { data, error } = await supabase.from('listings').insert({
      user_id: user.id,
      title: 'temp',
      price: 0,
      category: 'temp',
      location: 'temp',
      image_urls: [], // This column is now deprecated but might still be required by DB schema
      status: 'draft'
    }).select('id').single();

    if (error) {
      toast({ title: 'Error', description: 'Could not start listing process.', variant: 'destructive' });
      return null;
    }
    setTempListingId(data.id);
    return data.id;
  };

  const handleUploadComplete = (image: ImageMetadata) => {
    setImages(prev => [...prev, image]);
  };

  const handleDeleteImage = async (path: string) => {
    const { error } = await supabase.from('images').delete().eq('path', path);
    if (error) {
      toast({ title: 'Error', description: 'Could not delete image.', variant: 'destructive' });
    } else {
      setImages(prev => prev.filter(img => img.path !== path));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (resetForm(), onClose())}>
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-2xl sm:h-auto sm:max-h-[95vh] sm:rounded-lg flex flex-col overflow-hidden [&>button]:hidden">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
          <DialogTitle className="text-lg font-semibold">Create Listing</DialogTitle>
          <Button onClick={form.handleSubmit((data) => createListingMutation.mutate(data))} disabled={createListingMutation.isPending} size="sm">
            {createListingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
          </Button>
        </div>
        <Form {...form}>
          <form className="flex-grow overflow-y-auto hide-scrollbar">
            <div className="p-4 space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
              <div className="space-y-3">
                <FormLabel className="font-semibold">Images (up to 5) *</FormLabel>
                <ImageUploader
                  listingId={tempListingId!}
                  onUploadComplete={handleUploadComplete}
                  onDelete={handleDeleteImage}
                  existingImages={images}
                />
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
              </div>
            </div>
          </form>
        </Form>
        <ProfanityViolationModal isOpen={!!violation} onClose={() => setViolation(null)} violation={violation!} />
      </DialogContent>
    </Dialog>
  );
}