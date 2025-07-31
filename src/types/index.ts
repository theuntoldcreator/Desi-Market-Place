export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  avatar_url: string | null;
}

export type ChatStatus = 'pending' | 'active' | 'ended' | 'declined';

export interface Chat {
  id: number;
  created_at: string;
  listing_id: number;
  buyer: Profile;
  seller: Profile;
  status: ChatStatus;
  listing: { title: string, image_urls: string[] };
}

export interface Message {
  id: number;
  created_at: string;
  content: string;
  chat_id: number;
  sender_id: string;
  sender: Profile;
}