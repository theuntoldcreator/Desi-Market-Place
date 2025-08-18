import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { auth as firebaseAuth } from '@/integrations/firebase/client';
import { signInWithCustomToken, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  firebaseUser: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        await signInToFirebase(session);
      }
      setLoading(false);
    };

    const signInToFirebase = async (currentSession: Session) => {
      try {
        const { data } = await supabase.functions.invoke('create-firebase-token', {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        });
        if (data.error) throw new Error(data.error);
        
        const userCredential = await signInWithCustomToken(firebaseAuth, data.firebaseToken);
        setFirebaseUser(userCredential.user);
      } catch (error) {
        console.error("Firebase sign-in error:", error);
        setFirebaseUser(null);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        await signInToFirebase(session);
      } else {
        if (firebaseAuth.currentUser) await firebaseSignOut(firebaseAuth);
        setFirebaseUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);