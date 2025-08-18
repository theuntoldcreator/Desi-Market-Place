import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RealtimeChatProps {
  username: string;
  messages: ChatMessage[];
  onSend: (text: string | null, image: File | null) => Promise<void>;
}

export function RealtimeChat({ username, messages, onSend }: RealtimeChatProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('div');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!text.trim() && !image) || isSending) return;

    setIsSending(true);
    try {
      await onSend(text.trim(), image);
      setText('');
      setImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isCurrentUser = msg.user.name === username;
            return (
              <div
                key={msg.id}
                className={cn(
                  'flex items-end gap-2',
                  isCurrentUser ? 'justify-end' : 'justify-start'
                )}
              >
                {!isCurrentUser && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{msg.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-sm',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-card text-card-foreground rounded-bl-none'
                  )}
                >
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Uploaded content" className="rounded-md mb-2 max-h-64" />
                  )}
                  {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  <p className="text-xs opacity-70 mt-1 text-right">
                    {format(new Date(msg.createdAt), 'p')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
        {image && (
          <div className="relative w-24 h-24 mb-2">
            <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-full object-cover rounded-md" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={() => {
                setImage(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message..."
            className="flex-grow"
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={(!text.trim() && !image) || isSending}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}