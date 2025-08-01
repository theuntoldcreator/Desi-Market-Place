import { useParams } from "react-router-dom";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { MessageSquare } from "lucide-react";

export function ChatLayout() {
  const { chatId } = useParams<{ chatId: string }>();

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[320px_1fr]">
      <div className="hidden border-r bg-background md:block">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <h1 className="text-xl font-bold">Inbox</h1>
          </div>
          <div className="flex-1 overflow-auto">
            <ChatList selectedChatId={chatId} />
          </div>
        </div>
      </div>
      <div className="flex flex-col bg-muted/40">
        {chatId ? (
          <ChatWindow chatId={chatId} key={chatId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-semibold">Select a conversation</h2>
            <p className="max-w-xs">Choose from your existing conversations, or start a new one by messaging a seller from a listing page.</p>
          </div>
        )}
      </div>
    </div>
  );
}