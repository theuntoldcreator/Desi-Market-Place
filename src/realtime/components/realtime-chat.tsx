'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/realtime/components/chat-message'
import { useChatScroll } from '@/realtime/hooks/use-chat-scroll'
import { useRealtimeChat } from '@/realtime/hooks/use-realtime-chat'
import type { ChatMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'

interface RealtimeChatProps {
  roomName: string
  username: string
  initialMessages: ChatMessage[]
  onSendMessage: (content: string) => Promise<ChatMessage | null>
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

export const RealtimeChat = ({
  roomName,
  username,
  initialMessages = [],
  onSendMessage,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 })

  const {
    messages: realtimeMessages,
    sendMessage,
    isConnected,
  } = useRealtimeChat({
    roomName,
  })
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const allMessages = useMemo(() => {
    const messageMap = new Map<string, ChatMessage>()
    initialMessages.forEach(msg => messageMap.set(msg.id, msg))
    realtimeMessages.forEach(msg => messageMap.set(msg.id, msg))
    
    const uniqueMessages = Array.from(messageMap.values())
    return uniqueMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [initialMessages, realtimeMessages])

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (isSending) {
      scrollToBottom()
    }
  }, [allMessages.length, scrollToBottom, isSending])

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newMessage.trim() || !isConnected || isSending) return

      setIsSending(true)
      const persistedMessage = await onSendMessage(newMessage)
      if (persistedMessage) {
        sendMessage(persistedMessage)
        setNewMessage('')
      }
      setIsSending(false)
    },
    [newMessage, isConnected, isSending, onSendMessage, sendMessage]
  )

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center p-2">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        )}
        {allMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : null}
        <div className="space-y-1">
          {allMessages.map((message, index) => {
            const prevMessage = index > 0 ? allMessages[index - 1] : null
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
          disabled={!isConnected || isSending}
        />
        <Button
          className="aspect-square rounded-full"
          type="submit"
          disabled={!isConnected || isSending || !newMessage.trim()}
        >
          {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  )
}