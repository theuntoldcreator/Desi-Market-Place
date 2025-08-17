import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';

export const useFavorite = (listingId: number) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (isFavorited: boolean) => {
      if (!user) {
        navigate('/login');
        throw new Error('User not authenticated');
      }

      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .match({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
      }
    },
    onSuccess: (_, isFavorited) => {
      toast({
        title: isFavorited ? 'Listing Unsaved' : 'Listing Saved',
        description: isFavorited ? 'Removed from your saved items.' : 'Added to your saved items.',
      });
      queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
    },
    onError: (error) => {
      if (error.message !== 'User not authenticated') {
        toast({
          title: 'Error',
          description: 'Could not update favorite status. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  const toggleFavorite = (isFavorited: boolean) => {
    if (!user) {
      navigate('/login');
      return;
    }
    mutation.mutate(isFavorited);
  };

  return {
    toggleFavorite,
    isLoading: mutation.isPending,
  };
};