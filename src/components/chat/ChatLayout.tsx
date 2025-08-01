import { useParams } from "react-router-dom";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export function ChatLayout() {
  const { chatId } = useParams<{ chatId: string }>();

  return (
    <div className="grid h-full w-full md:grid-cols-[320px_1fr]">
      {/* Sidebar for conversations - hidden on mobile if a chat is selected */}
      <div
        className={cn(
          "flex-col border-r bg-background",
          chatId ? "hidden md:flex" : "flex"
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-bold">Inbox</h1>
        </div>
        <div className="flex-1 overflow-auto">
          <ChatList />
        </div>
      </div>

      {/* Main chat window */}
      <div className={cn("flex-col", chatId ? "flex" : "hidden md:flex")}>
        {chatId ? (
          <ChatWindow chatId={chatId} key={chatId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-semibold">Select a conversation</h2>
            <p className="max-w-xs">
              Choose from your existing conversations to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}