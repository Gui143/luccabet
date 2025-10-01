import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  username: string;
  balance: number;
}

interface Bet {
  id: string;
  userId: string;
  game: string;
  amount: number;
  odds: number;
  result: 'win' | 'loss' | 'pending';
  profit: number;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateBalance: (amount: number) => Promise<void>;
  addBet: (bet: Omit<Bet, 'id' | 'userId' | 'timestamp'>) => void;
  getBetHistory: () => Bet[];
  isCEO: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isCEO, setIsCEO] = useState(false);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
        
        // Update online status
        supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', session.user.id)
          .then();
      } else {
        setUser(null);
        setIsCEO(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update online status every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const loadUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser({
        id: profile.id,
        email: profile.email,
        username: profile.username,
        balance: typeof profile.balance === 'string' ? parseFloat(profile.balance) : profile.balance
      });

      // Check if CEO
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const isAdmin = roles?.some(r => r.role === 'ceo');
      setIsCEO(!!isAdmin);
    }
  };

  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error(error.message);
        return false;
      }

      if (data.user) {
        toast.success('Account created successfully!');
        // Check if CEO email
        if (email === 'prudencioguilherme7@gmail.com') {
          await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role: 'ceo' as any });
        }
        return true;
      }

      return false;
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error('Invalid email or password');
        return false;
      }

      if (data.user) {
        toast.success('Welcome back!');
        return true;
      }

      return false;
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      return false;
    }
  };

  const logout = async () => {
    if (user) {
      // Set offline before logout
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }

    await supabase.auth.signOut();
    setUser(null);
    setIsCEO(false);
    toast.success('Logged out successfully');
  };

  const updateBalance = async (amount: number) => {
    if (!user) return;

    const newBalance = user.balance + amount;
    
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, balance: newBalance });
    }
  };

  const addBet = (bet: Omit<Bet, 'id' | 'userId' | 'timestamp'>) => {
    if (!user) return;

    const newBet: Bet = {
      ...bet,
      id: Date.now().toString(),
      userId: user.id,
      timestamp: Date.now(),
    };

    const bets = JSON.parse(localStorage.getItem('bets') || '[]');
    bets.push(newBet);
    localStorage.setItem('bets', JSON.stringify(bets));
  };

  const getBetHistory = (): Bet[] => {
    if (!user) return [];
    const bets = JSON.parse(localStorage.getItem('bets') || '[]');
    return bets.filter((bet: Bet) => bet.userId === user.id).reverse();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      updateBalance, 
      addBet, 
      getBetHistory,
      isCEO 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};