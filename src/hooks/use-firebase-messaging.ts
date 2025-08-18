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
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/integrations/firebase/client';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ConversationPreview, Message, UserProfile } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from './use-toast';

// Helper to fetch Supabase profiles
const getSupabaseProfiles = async (userIds: string[]): Promise<Map<string, UserProfile>> => {
  const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds);
  if (error) throw error;
  const profileMap = new Map<string, UserProfile>();
  data.forEach(p => profileMap.set(p.id, { id: p.id, firstName: p.first_name || '', lastName: p.last_name || '', avatarUrl: p.avatar_url }));
  return profileMap;
};

// Define the shape of the raw conversation data from Firestore
interface FirebaseConversation {
  participants: string[];
  listingId: string;
  listingTitle: string;
  listingImageUrl: string;
  lastMessage: string | null;
  lastMessageAt: Timestamp;
  lastMessageSenderId: string;
  readBy?: string[];
}

// Hook to get all conversations for the current user
export const useConversations = () => {
  const { user } = useAuth();
  return useQuery<ConversationPreview[]>({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, 'conversations'), where('participants', 'array-contains', user.id), orderBy('lastMessageAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      // Cast the data to our defined type
      const conversations = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() as FirebaseConversation 
      }));

      const otherUserIds = conversations.map(c => c.participants.find((id: string) => id !== user.id)).filter(Boolean) as string[];
      const profiles = await getSupabaseProfiles(otherUserIds);

      return conversations.map(c => {
        const otherUserId = c.participants.find((id: string) => id !== user.id)!;
        const otherUser = profiles.get(otherUserId) || { id: '', firstName: 'Unknown', lastName: 'User', avatarUrl: null };
        return {
          id: c.id,
          listingId: c.listingId,
          listingTitle: c.listingTitle,
          listingImageUrl: c.listingImageUrl,
          otherUser,
          lastMessage: c.lastMessage ? {
            text: c.lastMessage,
            createdAt: c.lastMessageAt,
            senderId: c.lastMessageSenderId,
            read: c.lastMessageSenderId === user.id || (c.readBy?.includes(user.id) ?? false),
          } : null,
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
      await addDoc(messagesCol, {
        senderId: user.id,
        text,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      // Update last message on conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: text || 'Image',
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.id,
        readBy: [user.id],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    }
  });
};

// Hook to ensure a conversation exists and get its ID
export const useEnsureConversation = () => {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ listingId, sellerId }: { listingId: number; sellerId: string }) => {
      if (!user) throw new Error("You must be logged in.");
      if (!firebaseUser) {
        toast({
          title: "Chat Error",
          description: "Could not connect to the chat service. Please try logging out and back in.",
          variant: "destructive",
        });
        throw new Error("Not authenticated with chat service.");
      }
      if (user.id === sellerId) throw new Error("Cannot start conversation with yourself.");

      const participants = [user.id, sellerId].sort();
      const conversationId = `${listingId}-${participants[0]}-${participants[1]}`;
      const conversationRef = doc(db, 'conversations', conversationId);
      
      const docSnap = await getDoc(conversationRef);

      if (!docSnap.exists()) {
        const listing = await supabase.from('listings').select('title, image_urls').eq('id', listingId).single();
        if (listing.error) throw listing.error;

        await setDoc(conversationRef, {
          listingId: String(listingId),
          listingTitle: listing.data.title,
          listingImageUrl: listing.data.image_urls[0],
          participants,
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastMessageAt: serverTimestamp(),
        });
      }

      return conversationId;
    },
  });
};