import { useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Phone, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  { value: 'gaming', label: 'Gaming' },
];

const locations = [
  'Delhi University North Campus', 'Delhi University South Campus', 'JNU Campus',
  'Jamia Millia Islamia', 'IIT Delhi', 'AIIMS Delhi', 'Other'
];

export function CreateListing({ isOpen, onClose }: CreateListingProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '', description: '', price: '', category: '', location: '', contact: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', category: '', location: '', contact: '' });
    setImages([]);
  };

  const createListingMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("You must be logged in to create a listing.");
      if (!validateForm()) throw new Error("Please fill all required fields.");
      if (images.length === 0) throw new Error("Please upload at least one image.");

      const imageUrls = await Promise.all(
        images.map(async (file) => {
          const filePath = `${session.user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from('listing_images').upload(filePath, file);
          if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
          const { data: { publicUrl } } = supabase.storage.from('listing_images').getPublicUrl(filePath);
          return publicUrl;
        })
      );

      const { error: insertError } = await supabase.from('listings').insert({
        ...formData,
        price: parseFloat(formData.price),
        image_urls: imageUrls,
        user_id: session.user.id,
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

  const handleImageUpload = (files: FileList) => {
    const newImages = Array.from(files).slice(0, 5 - images.length);
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const validateForm = () => {
    return formData.title && formData.price && formData.category && formData.location && formData.contact;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (resetForm(), onClose())}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Listing</DialogTitle>
          <DialogDescription>Fill in the details to publish your item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Image Upload */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Images (1-5) *</Label>
            <div 
              className={cn("border-2 border-dashed rounded-lg p-6 text-center transition-all", dragActive && "border-primary bg-primary/5")}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files) handleImageUpload(e.dataTransfer.files); }}
            >
              <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} className="hidden" id="image-upload" disabled={images.length >= 5} />
              <label htmlFor="image-upload" className={cn("cursor-pointer", images.length >= 5 && "cursor-not-allowed opacity-50")}>
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-6 h-6 text-primary" />
                  <p className="font-medium">Click or drag to upload</p>
                  <p className="text-sm text-muted-foreground">({images.length}/5)</p>
                </div>
              </label>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img src={URL.createObjectURL(image)} alt={`Upload ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100" onClick={() => removeImage(index)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Form Fields */}
          <div className="space-y-4">
            <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Listing Title *" />
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="price" type="number" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} placeholder="Price (₹) *" min="1" />
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger><SelectValue placeholder="Select Category *" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
                <SelectTrigger><SelectValue placeholder="Select Location *" /></SelectTrigger>
                <SelectContent>{locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="contact" value={formData.contact} onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))} placeholder="Contact Number *" className="pl-10" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createListingMutation.mutate()} disabled={createListingMutation.isPending}>
            {createListingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish Listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}