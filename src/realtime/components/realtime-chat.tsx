'use client'

import { ChatMessageItem } from '@/realtime/components/chat-message'
import { useChatScroll } from '@/realtime/hooks/use-chat-scroll'
import type { ChatMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Paperclip, X } from 'lucide-react'
import { useCallback, useEffect, useState, useRef } from 'react'

interface RealtimeChatProps {
  username: string
  messages: ChatMessage[]
  onSend: (text: string | null, image: File | null) => Promise<void>
}

export const RealtimeChat = ({
  username,
  messages = [],
  onSend,
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()
  const [newMessage, setNewMessage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if ((!newMessage.trim() && !imageFile) || isSending) return

      setIsSending(true)
      await onSend(newMessage.trim(), imageFile)
      setNewMessage('')
      setImageFile(null)
      setIsSending(false)
    },
    [newMessage, imageFile, isSending, onSend]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground pt-4">
            No messages yet. Start the conversation!
          </div>
        )}
        <div className="space-y-1">
          {messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null
            const showHeader = !prevMessage || prevMessage.user.name !== message.user.name

            return (
              <div
                key={message.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <ChatMessageItem
                  message={message}
                  isOwnMessage={message.user.name === username}
                  showHeader={showHeader}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t p-4">
        {imageFile && (
          <div className="relative w-24 h-24 mb-2 p-1 border rounded-md">
            <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover rounded" />
            <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setImageFile(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="size-5" />
          </Button>
          <Input
            className="rounded-full bg-background text-sm"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
          />
          <Button
            className="aspect-square rounded-full"
            type="submit"
            disabled={isSending || (!newMessage.trim() && !imageFile)}
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}