import { useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Phone, MapPin, Loader2, Info, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { moderateImage } from '@/lib/imageModeration';

interface CreateListingProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImagePreview {
  id: string;
  file: File;
  url: string;
  status: 'moderating' | 'safe' | 'blocked';
  message?: string;
}

const categories = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books & Study' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'gaming', label: 'Gaming' },
];

export function CreateListing({ isOpen, onClose }: CreateListingProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '', description: '', price: '', category: '', location: '', countryCode: '+1', phoneNumber: '', condition: ''
  });
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', category: '', location: '', countryCode: '+1', phoneNumber: '', condition: '' });
    imagePreviews.forEach(p => URL.revokeObjectURL(p.url));
    setImagePreviews([]);
  };

  const createListingMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("You must be logged in to create a listing.");
      const safeImages = imagePreviews.filter(p => p.status === 'safe').map(p => p.file);
      if (safeImages.length === 0) throw new Error("Please upload at least one valid image.");
      if (!validateForm()) throw new Error("Please fill all required fields.");

      const imageUrls = await Promise.all(
        safeImages.map(async (file) => {
          const filePath = `${session.user.id}/${Date.now()}-${file.name}`;
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
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const processAndModerateImage = async (file: File) => {
    const id = `${file.name}-${file.lastModified}`;
    const url = URL.createObjectURL(file);
    setImagePreviews(prev => [...prev, { id, file, url, status: 'moderating' }]);

    try {
      const img = document.createElement('img');
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const result = await moderateImage(img);
      setImagePreviews(prev => prev.map(p => p.id === id ? { ...p, status: result.isSafe ? 'safe' : 'blocked', message: result.message } : p));
    } catch (error) {
      console.error("Moderation failed:", error);
      setImagePreviews(prev => prev.map(p => p.id === id ? { ...p, status: 'blocked', message: 'Could not analyze image.' } : p));
    }
  };

  const handleImageUpload = (files: FileList) => {
    const newFiles = Array.from(files).slice(0, 5 - imagePreviews.length);
    newFiles.forEach(processAndModerateImage);
  };

  const removeImage = (id: string) => {
    const imageToRemove = imagePreviews.find(p => p.id === id);
    if (imageToRemove) URL.revokeObjectURL(imageToRemove.url);
    setImagePreviews(prev => prev.filter(p => p.id !== id));
  };

  const validateForm = () => {
    const requiredFields = ['title', 'price', 'category', 'location', 'phoneNumber', 'condition'];
    if (formData.price === '0') {
        const freeRequired = ['title', 'price', 'location', 'phoneNumber', 'condition'];
        return freeRequired.every(field => !!(formData as any)[field]);
    }
    return requiredFields.every(field => !!(formData as any)[field]);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = e.target.value;
    setFormData(prev => {
        if (newPrice === '0') return { ...prev, price: newPrice, category: 'free' };
        if (prev.price === '0' && newPrice !== '0') return { ...prev, price: newPrice, category: '' };
        return { ...prev, price: newPrice };
    });
  };

  const isModerating = imagePreviews.some(p => p.status === 'moderating');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (resetForm(), onClose())}>
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-2xl sm:h-auto sm:max-h-[95vh] sm:rounded-lg flex flex-col overflow-hidden [&>button]:hidden">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4">
          <div className="space-y-1"><DialogTitle className="text-xl">Create New Listing</DialogTitle><DialogDescription>Fill in the details to sell your item.</DialogDescription></div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
        </div>
        <div className="flex-grow overflow-y-auto hide-scrollbar">
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label className="font-semibold">Images (up to 5) *</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {imagePreviews.map((preview) => (
                  <div key={preview.id} className="relative group aspect-square">
                    <img src={preview.url} alt={`Upload preview`} className="w-full h-full object-cover rounded-lg border" />
                    {preview.status === 'moderating' && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white rounded-lg"><Loader2 className="w-6 h-6 animate-spin" /><p className="text-xs mt-1">Checking...</p></div>}
                    {preview.status === 'blocked' && <div className="absolute inset-0 bg-destructive/80 flex flex-col items-center justify-center text-white p-2 text-center rounded-lg"><AlertCircle className="w-6 h-6" /><p className="text-xs font-semibold mt-1">{preview.message}</p></div>}
                    {preview.status === 'safe' && <div className="absolute top-1 right-1 bg-green-600 text-white rounded-full p-0.5"><CheckCircle2 className="w-4 h-4" /></div>}
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(preview.id)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <label htmlFor="image-upload-create" className="cursor-pointer flex items-center justify-center border-2 border-dashed rounded-lg aspect-square text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                    <Upload className="w-6 h-6" />
                  </label>
                )}
              </div>
              <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} className="hidden" id="image-upload-create" disabled={imagePreviews.length >= 5} />
            </div>
            {imagePreviews.length === 0 && (
              <div className={cn("border-2 border-dashed rounded-lg p-6 text-center transition-all", dragActive && "border-primary bg-primary/5")} onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }} onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files) handleImageUpload(e.dataTransfer.files); }}>
                <label htmlFor="image-upload-create" className={cn("cursor-pointer", imagePreviews.length >= 5 && "cursor-not-allowed opacity-50")}>
                  <div className="flex flex-col items-center gap-2 text-muted-foreground"><ImageIcon className="w-8 h-8" /><p className="font-medium text-primary">Click or drag to upload</p><p className="text-sm">Add up to 5 photos.</p></div>
                </label>
              </div>
            )}
            <div className="space-y-4 pt-4 border-t"><Label className="font-semibold">Listing Details *</Label><Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="What are you selling?" /><Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe your item (optional)" rows={4} /><div className="grid grid-cols-2 gap-4"><Input id="price" type="number" value={formData.price} onChange={handlePriceChange} placeholder="Price ($)" min="0" /><Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))} disabled={formData.price === '0'}><SelectTrigger><SelectValue placeholder="Category">{formData.price === '0' ? 'Free Stuff' : undefined}</SelectValue></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="location" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="Location" className="pl-10" /></div><Select value={formData.condition} onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="like_new">Like New</SelectItem><SelectItem value="used">Used</SelectItem></SelectContent></Select></div></div>
            <div className="space-y-4 pt-4 border-t"><Label className="font-semibold">Contact Info *</Label><div className="flex items-center gap-2"><Select value={formData.countryCode} onValueChange={(value) => setFormData(prev => ({ ...prev, countryCode: value }))}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.dial_code}>{`${c.code} ${c.dial_code}`}</SelectItem>)}</SelectContent></Select><div className="relative flex-1"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="contact" value={formData.phoneNumber} onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))} placeholder="Phone Number" className="pl-10" /></div></div><Alert className="text-xs p-3"><Info className="h-4 w-4" /><AlertDescription>Your number is used for WhatsApp chat. Be respectful and avoid sharing sensitive info.</AlertDescription></Alert></div>
            <Alert><Info className="h-4 w-4" /><AlertDescription>Listings are active for 20 days. You can manage them from 'My Listings'.</AlertDescription></Alert>
          </div>
        </div>
        <DialogFooter className="p-4 border-t bg-background sticky bottom-0 z-10 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={() => createListingMutation.mutate()} disabled={createListingMutation.isPending || !validateForm() || isModerating} className="w-full sm:w-auto">
            {isModerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : createListingMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</> : 'Publish Listing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}