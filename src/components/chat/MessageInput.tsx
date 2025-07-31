import { useForm } from 'react-hook-form';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty."),
});

export function MessageInput({ chatId, receiverId }: { chatId: string, receiverId?: string }) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ content: string }>({
    resolver: zodResolver(messageSchema),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session || !receiverId) throw new Error("User not authenticated");
      const { error } = await supabase.from('messages').insert({
        content,
        chat_id: chatId,
        sender_id: session.user.id,
        receiver_id: receiverId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });

  const onSubmit = (data: { content: string }) => {
    sendMessageMutation.mutate(data.content);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 border-t bg-white flex items-center gap-2">
      <Input {...register('content')} placeholder="Type a message..." autoComplete="off" disabled={isSubmitting} />
      <Button type="submit" size="icon" disabled={isSubmitting}>
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}