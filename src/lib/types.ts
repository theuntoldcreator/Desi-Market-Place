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