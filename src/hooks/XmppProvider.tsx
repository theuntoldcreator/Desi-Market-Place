import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { client as xmppClient, xml } from '@xmpp/client';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';

const XMPP_WEBSOCKET_URL = 'wss://chat.nrimarketplace.icu:5280/xmpp-websocket';

interface XmppContextType {
  client: any;
  connectionStatus: string;
  sendMessage: (to: string, body: string) => void;
  messages: Map<string, any[]>;
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
  const clientRef = useRef<any>(null);

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
        domain: 'chat.nrimarketplace.icu',
        resource: 'marketplace',
        username: profile.jid.split('@')[0],
        password: profile.jid_password,
      });

      clientRef.current = xmpp;
      setClient(xmpp);

      xmpp.on('error', (err) => {
        console.error('XMPP Error:', err);
        setConnectionStatus('error');
      });

      xmpp.on('offline', () => {
        setConnectionStatus('disconnected');
        clientRef.current = null;
      });

      xmpp.on('online', async (address) => {
        console.log('XMPP Online as', address.toString());
        setConnectionStatus('connected');
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
        }
      });

      xmpp.start().catch(console.error);

      return () => {
        if (clientRef.current) {
          clientRef.current.stop();
          clientRef.current = null;
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
  };

  return <XmppContext.Provider value={value}>{children}</XmppContext.Provider>;
};