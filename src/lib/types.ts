export interface ImageMetadata {
  id: string;
  path: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  sha256: string | null;
}

export interface Listing {
  id: number; // bigint in DB
  user_id: string; // uuid
  title: string;
  description: string | null;
  price: number;
  category: string;
  location: string;
  created_at: string; // timestamp with time zone
  condition: string | null;
  status: 'active' | 'sold';
  contact: string | null;
  updated_at: string | null; // timestamp with time zone
  is_favorited?: boolean;
  images: ImageMetadata[] | null;
}