import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";
import { MessageList } from "./MessageList";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatProps {
  chatId: string;
}

export function Chat({ chatId }: ChatProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [content, setContent] = useState("");

  const { data: chatDetails } = useQuery({
    queryKey: ['chatDetails', chatId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('*, buyer_id, seller_id').eq('id', chatId).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!chatId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (newContent: string) => {
      if (!session || !chatDetails) throw new Error("Session or chat details not found");
      const receiverId = session.user.id === chatDetails.buyer_id ? chatDetails.seller_id : chatDetails.buyer_id;
      const { error } = await supabase.from("messages").insert({
        content: newContent,
        chat_id: parseInt(chatId),
        sender_id: session.user.id,
        receiver_id: receiverId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setContent("");
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      sendMessageMutation.mutate(content.trim());
    }
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList chatId={chatId} />
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}