export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
}

export interface Chat {
  id: number;
  created_at: string;
  user1: Profile;
  user2: Profile;
}

export interface Message {
  id: number;
  created_at: string;
  content: string;
  chat_id: number;
  sender_id: string;
  sender: Profile;
}