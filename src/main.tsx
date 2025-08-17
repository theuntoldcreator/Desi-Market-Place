import { createRoot } from 'react-dom/client'
import Root from './App.tsx'
import './index.css'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from './integrations/supabase/client.ts'

createRoot(document.getElementById("root")!).render(
  <SessionContextProvider supabaseClient={supabase}>
    <Root />
  </SessionContextProvider>
);