import { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

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

const locations = [
  'Delhi University North Campus', 'Delhi University South Campus', 'JNU Campus',
  'Jamia Millia Islamia', 'IIT Delhi', 'AIIMS Delhi', 'Other'
];

export function EditListing({ isOpen, onClose, listing }: EditListingProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({ title: '', description: '', price: '', category: '', location: '', contact: '' });
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price?.toString() || '',
        category: listing.category || '',
        location: listing.location || '',
        contact: listing.contact || '',
      });
      setExistingImageUrls(listing.image_urls || []);
      setNewImages([]);
      setImagesToDelete([]);
    }
  }, [listing]);

  const updateListingMutation = useMutation({
    mutationFn: async () => {
      if (!listing || !session) throw new Error("Authentication error.");

      // 1. Delete images marked for removal from storage
      if (imagesToDelete.length > 0) {
        const imagePaths = imagesToDelete.map(url => url.substring(url.lastIndexOf('/') + 1)).map(fileName => `${session.user.id}/${fileName}`);
        await supabase.storage.from('listing_images').remove(imagePaths);
      }

      // 2. Upload new images to storage
      const newUploadedUrls = await Promise.all(
        newImages.map(async (file) => {
          const filePath = `${session.user.id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from('listing_images').upload(filePath, file);
          if (error) throw new Error(`Image upload failed: ${error.message}`);
          const { data: { publicUrl } } = supabase.storage.from('listing_images').getPublicUrl(filePath);
          return publicUrl;
        })
      );

      // 3. Combine image URLs
      const finalImageUrls = [...existingImageUrls, ...newUploadedUrls];
      if (finalImageUrls.length === 0) throw new Error("Listing must have at least one image.");

      // 4. Update listing in DB
      const { error } = await supabase
        .from('listings')
        .update({ ...formData, price: parseFloat(formData.price), image_urls: finalImageUrls })
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

  const handleImageUpload = (files: FileList) => {
    const newFiles = Array.from(files).slice(0, 5 - (existingImageUrls.length + newImages.length));
    setNewImages(prev => [...prev, ...newFiles]);
  };

  const removeExistingImage = (url: string) => {
    setExistingImageUrls(prev => prev.filter(u => u !== url));
    setImagesToDelete(prev => [...prev, url]);
  };

  if (!listing) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Listing</DialogTitle>
          <DialogDescription>Update the details and images for your item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Image Management */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Images</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {existingImageUrls.map((url) => (
                <div key={url} className="relative group aspect-square">
                  <img src={url} alt="Existing listing" className="w-full h-full object-cover rounded-lg" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100" onClick={() => removeExistingImage(url)}><X className="w-3 h-3" /></Button>
                </div>
              ))}
              {newImages.map((image, index) => (
                <div key={index} className="relative group aspect-square">
                  <img src={URL.createObjectURL(image)} alt={`New upload ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100" onClick={() => setNewImages(prev => prev.filter((_, i) => i !== index))}><X className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
            { (existingImageUrls.length + newImages.length) < 5 &&
              <div>
                <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} className="hidden" id="image-update-upload" />
                <label htmlFor="image-update-upload" className="cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 text-center transition-all hover:border-primary">
                  <Upload className="w-4 h-4" /> Add more images
                </label>
              </div>
            }
          </div>
          {/* Form Fields */}
          <div className="space-y-4">
            <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Listing Title *" />
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="price" type="number" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} placeholder="Price (₹) *" min="1" />
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}><SelectTrigger><SelectValue placeholder="Select Category *" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}><SelectTrigger><SelectValue placeholder="Select Location *" /></SelectTrigger><SelectContent>{locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
              <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="contact" value={formData.contact} onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))} placeholder="Contact Number *" className="pl-10" /></div>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => updateListingMutation.mutate()} disabled={updateListingMutation.isPending}>
            {updateListingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}