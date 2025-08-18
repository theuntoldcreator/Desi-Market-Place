import { Timestamp } from 'firebase/firestore';

export interface Listing {
  id: number; // bigint in DB
  user_id: string; // uuid
  title: string;
  description: string | null;
  price: number;
  category: string;
  location: string;
  image_urls: string[];
  created_at: string; // timestamp with time zone
  condition: string | null;
  status: 'active' | 'sold';
  contact: string | null;
  updated_at: string | null; // timestamp with time zone
  is_favorited?: boolean;
}

// Firebase-based types
export interface ConversationPreview {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    text: string | null;
    createdAt: Timestamp;
    senderId: string;
    read: boolean;
  } | null;
}

export interface Message {
  id: string;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  createdAt: Timestamp;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

// Generic chat message type for UI components
export interface ChatMessage {
  id: string;
  content: string | null;
  imageUrl: string | null;
  user: { name: string };
  createdAt: string;
}