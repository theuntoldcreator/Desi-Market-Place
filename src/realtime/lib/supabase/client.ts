1import { createClient as createSupabaseClient } from '@supabase/supabase-js'
2
3export function createClient() {
4  return createSupabaseClient(
5    import.meta.env.VITE_SUPABASE_URL!,
6    import.meta.env.VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
7  )
8}