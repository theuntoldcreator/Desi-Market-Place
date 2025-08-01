import { useParams } from "react-router-dom";
import { UserList } from "./UserList";
import { Chat } from "./Chat";
import { MessageSquare } from "lucide-react";

export function ChatLayout() {
  const { chatId } = useParams<{ chatId: string }>();

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-background md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <h1 className="text-lg font-semibold">Conversations</h1>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <UserList />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        {chatId ? (
          <Chat chatId={chatId} key={chatId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-white">
            <MessageSquare className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-semibold">Select a conversation</h2>
            <p>Choose from your existing conversations to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}