import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/integrations/firebase/client';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ConversationPreview, Message, UserProfile } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Helper to fetch Supabase profiles
const getSupabaseProfiles = async (userIds: string[]): Promise<Map<string, UserProfile>> => {
  const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds);
  if (error) throw error;
  const profileMap = new Map<string, UserProfile>();
  data.forEach(p => profileMap.set(p.id, { id: p.id, firstName: p.first_name || '', lastName: p.last_name || '', avatarUrl: p.avatar_url }));
  return profileMap;
};

// Hook to get all conversations for the current user
export const useConversations = () => {
  const { user } = useAuth();
  return useQuery<ConversationPreview[]>({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, 'conversations'), where('userIds', 'array-contains', user.id));
      const querySnapshot = await getDocs(q);
      const conversations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const otherUserIds = conversations.map(c => c.userIds.find((id: string) => id !== user.id)).filter(Boolean);
      const profiles = await getSupabaseProfiles(otherUserIds);

      return conversations.map(c => {
        const otherUserId = c.userIds.find((id: string) => id !== user.id);
        const otherUser = profiles.get(otherUserId) || { id: '', firstName: 'Unknown', lastName: 'User', avatarUrl: null };
        return {
          id: c.id,
          listingId: c.listingId,
          listingTitle: c.listingTitle,
          listingImageUrl: c.listingImageUrl,
          otherUser,
          lastMessage: c.lastMessage || null,
        };
      });
    },
    enabled: !!user,
  });
};

// Hook to listen to real-time messages in a conversation
export const useMessages = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;
    const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  return { messages, loading };
};

// Hook to send a message (text or image)
export const useSendMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, text, image }: { conversationId: string; text: string | null; image: File | null }) => {
      if (!user) throw new Error('User not authenticated');
      
      let imageUrl: string | null = null;
      if (image) {
        const storageRef = ref(storage, `chat_images/${conversationId}/${uuidv4()}`);
        const snapshot = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const messagesCol = collection(db, 'conversations', conversationId, 'messages');
      const newMessage = {
        senderId: user.id,
        text,
        imageUrl,
        createdAt: serverTimestamp(),
      };
      await addDoc(messagesCol, newMessage);

      // Update last message on conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: {
          text: text || 'Image',
          createdAt: serverTimestamp(),
          senderId: user.id,
          read: false,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    }
  });
};

// Hook to start a new conversation
export const useStartConversation = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ listingId, sellerId }: { listingId: number; sellerId: string }) => {
      if (!user || user.id === sellerId) throw new Error("Cannot start conversation with yourself.");

      const userIds = [user.id, sellerId].sort();
      const q = query(collection(db, 'conversations'), where('listingId', '==', String(listingId)), where('userIds', '==', userIds));
      const existing = await getDocs(q);

      if (!existing.empty) {
        return existing.docs[0].id;
      }

      const listing = await supabase.from('listings').select('title, image_urls').eq('id', listingId).single();
      if (listing.error) throw listing.error;

      const newConversation = await addDoc(collection(db, 'conversations'), {
        listingId: String(listingId),
        listingTitle: listing.data.title,
        listingImageUrl: listing.data.image_urls[0],
        userIds: userIds,
        createdAt: serverTimestamp(),
      });

      return newConversation.id;
    },
  });
};