import { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Loader2, Upload, X, MapPin, Info, Image as ImageIcon, Trash2, Camera, GalleryHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { countries } from '@/lib/countries';
import { validateText } from '@/lib/profanity';
import { ProfanityViolationModal } from './ProfanityViolationModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import imageCompression from 'browser-image-compression';
import { DobPicker } from './DobPicker';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal('')),
  dob: z.date().optional(),
  avatarFile: z.instanceof(File).optional(),
  gender: z.enum(['male', 'female']).optional(),
  location: z.string().min(1, "Location is required").optional().or(z.literal('')),
});

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
}

export function EditProfile({ isOpen, onClose, profile }: EditProfileProps) {
  const { toast } = useToast();
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      phoneNumber: profile.phone_number || '',
      dob: profile.dob ? new Date(profile.dob) : undefined,
      gender: profile.gender,
      location: profile.location || '', // Add location to default values
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('avatarFile', file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      if (!session) throw new Error("Not authenticated");

      let avatar_url = profile.avatar_url;

      if (values.avatarFile) {
        const file = values.avatarFile;
        const filePath = `${session.user.id}/avatar-${Date.now()}`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
        avatar_url = publicUrl;

        if (profile.avatar_url && !profile.avatar_url.includes('cloudinary')) {
            try {
                const oldAvatarPath = new URL(profile.avatar_url).pathname.split('/avatars/')[1];
                if (oldAvatarPath) {
                    await supabaseClient.storage.from('avatars').remove([oldAvatarPath]);
                }
            } catch (e) {
                console.warn("Could not delete old avatar", e);
            }
        }
      }

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          phone_number: values.phoneNumber,
          dob: values.dob?.toISOString().split('T')[0],
          avatar_url: avatar_url,
          gender: values.gender,
          location: values.location, // Update location in profile
        })
        .eq('id', session.user.id);

      if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

      // --- New logic for updating listings ---
      if (session?.user?.id) {
        try {
          const { data: userListings, error: listingsFetchError } = await supabaseClient
            .from('listings')
            .select('id');

          if (listingsFetchError) throw listingsFetchError;

          if (userListings && userListings.length > 0) {
            const newContact = `${form.getValues('countryCode')}${values.phoneNumber.replace(/\D/g, '')}`;
            const newLocation = values.location;

            const updatePromises = userListings.map(listing =>
              supabaseClient
                .from('listings')
                .update({
                  contact: newContact,
                  location: newLocation,
                })
                .eq('id', listing.id)
            );

            const results = await Promise.all(updatePromises);
            const updateErrors = results.filter(r => r.error).map(r => r.error);

            if (updateErrors.length > 0) {
              console.error("Errors updating some listings:", updateErrors);
              toast({ title: "Partial Update Warning", description: "Profile updated, but some listings could not be updated.", variant: "warning" });
            } else {
              toast({ title: "Listings Updated", description: "Your listings have been updated with new contact and location info." });
            }
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            queryClient.invalidateQueries({ queryKey: ['my-listings'] });
          }
        } catch (error: any) {
          console.error("Error updating user listings:", error.message);
          toast({ title: "Listing Update Failed", description: `Could not update all your listings: ${error.message}`, variant: "destructive" });
        }
      }
      // --- End new logic ---
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Your profile has been updated." });
      queryClient.invalidateQueries({ queryKey: ['profile', session?.user?.id] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const fullName = `${form.watch('firstName') || ''} ${form.watch('lastName') || ''}`.trim();
  const fallback = fullName ? fullName[0].toUpperCase() : session?.user.email?.[0].toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarPreview || undefined} alt={fullName} />
                <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
              </Avatar>
              <div>
                <FormLabel>Profile Picture</FormLabel>
                <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField name="firstName" control={form.control} render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField name="lastName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField name="phoneNumber" control={form.control} render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="123-456-7890" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField name="location" control={form.control} render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Your City, State" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="dob"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <DobPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="gender"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}