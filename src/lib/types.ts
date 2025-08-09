export interface Listing {
  id: number; // bigint in DB
  user_id: string; // uuid in DB
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

  // Enriched properties from joins
  profile?: { // Optional because it might not always be joined or might be null
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  isFavorited?: boolean; // Optional because it's only added conditionally
}