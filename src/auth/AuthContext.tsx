import { createContext, useContext, useState, ReactNode } from 'react';

interface UserProfile {
  id: string;
  tg_user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  verified_at?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  requiresOtp: boolean;
  setSession: (user: UserProfile, token: string) => void;
  setOtpRequired: (required: boolean) => void;
  logout: () => void;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresOtp, setRequiresOtp] = useState(false);

  const setSession = (newUser: UserProfile, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    setIsLoading(false);
  };

  const setOtpRequired = (required: boolean) => {
    setRequiresOtp(required);
    setIsLoading(false);
  };
  
  const updateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsLoading(false);
    setRequiresOtp(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, requiresOtp, setSession, setOtpRequired, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};