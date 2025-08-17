import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { client as xmppClient, xml } from '@xmpp/client';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';

const XMPP_WEBSOCKET_URL = import.meta.env.VITE_XMPP_WEBSOCKET_URL || 'wss://chat.nrimarketplace.icu:5281/xmpp-websocket';
const XMPP_DOMAIN = import.meta.env.VITE_XMPP_DOMAIN || 'chat.nrimarketplace.icu';

interface XmppContextType {
  client: any;
  connectionStatus: string;
  sendMessage: (to: string, body: string) => void;
  messages: Map<string, any[]>;
  presences: Map<string, { status: string; statusText?: string }>;
}

const XmppContext = createContext<XmppContextType | null>(null);

export const useXmpp = () => {
  const context = useContext(XmppContext);
  if (!context) {
    throw new Error('useXmpp must be used within an XmppProvider');
  }
  return context;
};

export const XmppProvider = ({ children }: { children: React.ReactNode }) => {
  const session = useSession();
  const [client, setClient] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState<Map<string, any[]>>(new Map());
  const [presences, setPresences] = useState<Map<string, { status: string; statusText?: string }>>(new Map());
  const clientRef = useRef<any>(null);
  const reconnectAttempts = useRef(0);

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session) return null;
      const { data } = await supabase.from('profiles').select('jid, jid_password').eq('id', session.user.id).single();
      return data;
    },
    enabled: !!session,
  });

  const addMessage = useCallback((chatPartnerJid: string, message: any) => {
    setMessages(prevMessages => {
      const newMessages = new Map(prevMessages);
      const currentMessages = newMessages.get(chatPartnerJid) || [];
      newMessages.set(chatPartnerJid, [...currentMessages, message]);
      return newMessages;
    });
  }, []);

  useEffect(() => {
    if (profile?.jid && profile?.jid_password && !clientRef.current) {
      const xmpp = xmppClient({
        service: XMPP_WEBSOCKET_URL,
        domain: XMPP_DOMAIN,
        resource: 'marketplace',
        username: profile.jid.split('@')[0],
        password: profile.jid_password,
      });

      clientRef.current = xmpp;
      setClient(xmpp);
      setConnectionStatus('connecting');

      xmpp.on('error', (err) => {
        console.error('XMPP Error:', err);
        setConnectionStatus('error');
      });

      xmpp.on('offline', () => {
        setConnectionStatus('disconnected');
        clientRef.current = null;
        // Exponential backoff for reconnection
        if (reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          console.log(`XMPP disconnected. Reconnecting in ${delay / 1000}s...`);
          setTimeout(() => {
            if (profile?.jid && profile?.jid_password) { // Re-check profile exists before retry
              reconnectAttempts.current++;
              xmpp.start().catch(console.error);
            }
          }, delay);
        } else {
          console.error("XMPP reconnection failed after 5 attempts.");
        }
      });

      xmpp.on('online', async (address) => {
        console.log('XMPP Online as', address.toString());
        setConnectionStatus('connected');
        reconnectAttempts.current = 0; // Reset on successful connection
        await xmpp.send(xml('presence'));
      });

      xmpp.on('stanza', (stanza) => {
        if (stanza.is('message') && stanza.getChild('body')) {
          const fromJid = stanza.attrs.from.split('/')[0];
          const body = stanza.getChildText('body');
          const isMe = fromJid === profile.jid;
          
          const partnerJid = isMe ? stanza.attrs.to.split('/')[0] : fromJid;

          addMessage(partnerJid, {
            id: stanza.attrs.id || Date.now(),
            from: fromJid,
            body: body,
            timestamp: new Date(),
            isMe,
          });
        } else if (stanza.is('presence')) {
          const from = stanza.attrs.from.split('/')[0];
          const type = stanza.attrs.type;
          const show = stanza.getChildText('show');
          const statusText = stanza.getChildText('status');

          setPresences(prev => {
            const newPresences = new Map(prev);
            if (type === 'unavailable') {
              newPresences.set(from, { status: 'offline' });
            } else {
              newPresences.set(from, { status: show || 'online', statusText });
            }
            return newPresences;
          });
        }
      });

      xmpp.start().catch(console.error);

      return () => {
        if (clientRef.current) {
          const sendUnavailable = async () => {
            try {
              await clientRef.current.send(xml('presence', { type: 'unavailable' }));
            } catch (e) {
              // Ignore errors on cleanup
            } finally {
              clientRef.current.stop();
              clientRef.current = null;
            }
          };
          sendUnavailable();
        }
      };
    }
  }, [profile, addMessage]);

  const sendMessage = (to: string, body: string) => {
    if (client && connectionStatus === 'connected') {
      const message = xml('message', { to, type: 'chat' }, xml('body', {}, body));
      client.send(message);
      addMessage(to.split('/')[0], {
        id: message.attrs.id || Date.now(),
        from: profile.jid,
        body: body,
        timestamp: new Date(),
        isMe: true,
      });
    }
  };

  const value = {
    client,
    connectionStatus,
    sendMessage,
    messages,
    presences,
  };

  return <XmppContext.Provider value={value}>{children}</XmppContext.Provider>;
};