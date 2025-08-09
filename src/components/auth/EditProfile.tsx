import { useState, useEffect } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Loader2, MapPin, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { countries } from '@/lib/countries';
import { validateText } from '@/lib/profanity';
import { ProfanityViolationModal } from '@/components/marketplace/ProfanityViolationModal';
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
import { parsePhoneNumber } from '@/lib/utils';

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  countryCode: z.string().min(1, "Country code is required"),
  phoneNumber: z.string().min(1, "Phone number is required").regex(/^\d+$/, "Phone number must contain only digits"),
  dob: z.date().optional(),
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

  const { countryCode: initialCountryCode, localNumber: initialPhoneNumber } = parsePhoneNumber(profile.phone_number);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      countryCode: initialCountryCode,
      phoneNumber: initialPhoneNumber,
      dob: profile.dob ? new Date(profile.dob) : undefined,
      gender: profile.gender,
      location: profile.location || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      if (!session) throw new Error("Not authenticated");

      let avatar_url = profile.avatar_url; // Keep existing avatar URL

      const fullPhoneNumber = `${values.countryCode}${values.phoneNumber.replace(/\D/g, '')}`;

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          phone_number: fullPhoneNumber,
          dob: values.dob?.toISOString().split('T')[0],
          avatar_url: avatar_url, // Use the existing avatar URL
          gender: values.gender,
          location: values.location,
        })
        .eq('id', session.user.id);

      if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

      if (session?.user?.id) {
        try {
          const { data: userListings, error: listingsFetchError } = await supabaseClient
            .from('listings')
            .select('id');

          if (listingsFetchError) throw listingsFetchError;

          if (userListings && userListings.length > 0) {
            const newContact = fullPhoneNumber;
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
              toast({ title: "Partial Update Warning", description: "Profile updated, but some listings could not be updated.", variant: "default" });
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
      <DialogContent className="w-screen h-dvh max-w-full p-0 gap-0 rounded-none sm:max-w-2xl sm:h-auto sm:max-h-[95vh] sm:rounded-lg flex flex-col overflow-hidden [&>button]:hidden">
        
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4">
          <div className="space-y-1">
            <DialogTitle className="text-xl">Edit Profile</DialogTitle>
            <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto hide-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="p-4 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarPreview || undefined} alt={fullName} />
                  <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{fullName}</h3>
                  <p className="text-sm text-muted-foreground">{session?.user.email}</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <Label className="font-semibold">Personal Information</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField name="firstName" control={form.control} render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="lastName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="font-semibold">Contact & Location</Label>
                <div className="flex items-center gap-2">
                  <FormField
                    name="countryCode"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map(c => <SelectItem key={c.code} value={c.dial_code}>{`${c.code} ${c.dial_code}`}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField name="phoneNumber" control={form.control} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField name="location" control={form.control} render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Your City, State" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="p-4 border-t bg-background sticky bottom-0 z-10 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={updateProfileMutation.isPending} onClick={form.handleSubmit((data) => updateProfileMutation.mutate(data))}>
            {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}