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

export interface ConversationPreview {
  id: string; // uuid
  updated_at: string;
  listing_id: number;
  listing_title: string;
  listing_image_url: string;
  other_user_id: string; // uuid
  other_user_first_name: string | null;
  other_user_last_name: string | null;
  other_user_avatar_url: string | null;
  last_message_body: string | null;
  last_message_created_at: string | null;
  last_message_sender_id: string | null; // uuid
}

export interface Message {
  id: string; // uuid
  conversation_id: string; // uuid
  sender_id: string; // uuid
  body: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null
}