import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "./Message";
import { useSession } from "@supabase/auth-helpers-react";
import { useEffect, useRef } from "react";
import { Skeleton } from "../ui/skeleton";

const fetchMessages = async (chatId: string) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles(avatar_url, first_name, last_name)")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

interface MessageListProps {
  chatId: string;
}

export function MessageList({ chatId }: MessageListProps) {
  const session = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: () => fetchMessages(chatId),
    enabled: !!chatId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <Skeleton className="h-12 w-3/5" />
        <Skeleton className="h-12 w-3/5 ml-auto" />
        <Skeleton className="h-12 w-2/5" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages?.map((message) => (
        <Message
          key={message.id}
          message={message}
          isSender={message.sender_id === session?.user.id}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}