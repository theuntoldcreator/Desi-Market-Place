'use client'

import { supabase } from '@/integrations/supabase/client'
import { useCallback, useEffect, useState } from 'react'
import { ChatMessage } from '@/lib/types'

interface UseRealtimeChatProps {
  roomName: string
}

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({ roomName }: UseRealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const newChannel = supabase.channel(roomName, {
      config: {
        broadcast: { self: true }
      }
    })

    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, ({ payload }) => {
        setMessages((current) => {
          if (current.some(m => m.id === (payload as ChatMessage).id)) {
            return current
          }
          return [...current, payload as ChatMessage]
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      })

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [roomName])

  const sendMessage = useCallback(
    async (message: ChatMessage) => {
      if (!channel || !isConnected) return

      await channel.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      })
    },
    [channel, isConnected]
  )

  return { messages, sendMessage, isConnected }
}