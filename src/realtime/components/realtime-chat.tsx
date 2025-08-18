'use client'

import { ChatMessageItem } from '@/realtime/components/chat-message'
import { useChatScroll } from '@/realtime/hooks/use-chat-scroll'
import type { ChatMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

interface RealtimeChatProps {
  username: string
  messages: ChatMessage[]
  onSend: (content: string) => Promise<void>
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

export const RealtimeChat = ({
  username,
  messages = [],
  onSend,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 })

  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    // Auto-scroll when a new message is sent by the current user
    if (isSending) {
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom, isSending])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newMessage.trim() || isSending) return

      setIsSending(true)
      await onSend(newMessage)
      setNewMessage('')
      setIsSending(false)
    },
    [newMessage, isSending, onSend]
  )

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center p-2">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        )}
        {messages.length === 0 && !isFetchingNextPage && (
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

      <form onSubmit={handleSendMessage} className="flex w-full gap-2 border-t border-border p-4">
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
          disabled={isSending || !newMessage.trim()}
        >
          {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  )
}