import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { healthCheck, createOrRestoreSession, clearStoredToken, setStoredName } from '@/lib/net/localClient';
import { withTimeout } from '@/lib/net';

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

export type AuthMode = 'supabase' | 'local' | 'offline' | 'loading';

interface AuthContextType {
  user: User | null;
  /** 'supabase' = Lovable Cloud, 'local' = servidor do repo, 'offline' = sem rede */
  authMode: AuthMode;
  /** modo local/demo: troca o apelido do convidado */
  renameGuest: (name: string) => Promise<void>;
  /** atualiza o saldo na tela (usado pelos eventos de wallet do servidor) */
  syncBalance: (balance: number) => void;
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
  const [authMode, setAuthMode] = useState<AuthMode>('loading');

  useEffect(() => {
    // Check active session on mount — com timeout: se o Lovable Cloud não
    // responder (preview sem rede), caímos para a sessão local em 4s.
    withTimeout(supabase.auth.getSession(), 4000, null as never)
      .then(({ data: { session } }: any) => {
        if (session?.user) {
          setAuthMode('supabase');
          loadUserProfile(session.user.id);
        } else {
          // Sem sessão no Lovable Cloud: cai para o servidor de jogos local
          // (server/index.ts) para o preview/desenvolvimento continuar jogável.
          void bootstrapLocalSession();
        }
      })
      .catch(() => {
        void bootstrapLocalSession();
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

  // Realtime subscription for balance changes (e.g. from admin panel)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-balance-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newBalance = typeof payload.new.balance === 'string'
            ? parseFloat(payload.new.balance)
            : payload.new.balance;
          setUser(prev => prev ? { ...prev, balance: newBalance } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  /** Cria/restaura a sessão de convidado no servidor local (modo demonstração). */
  const bootstrapLocalSession = async () => {
    try {
      const health = await healthCheck();
      if (!health?.ok) {
        setAuthMode('offline');
        return;
      }
      const session = await createOrRestoreSession();
      setAuthMode('local');
      setUser({
        id: session.playerId,
        email: 'convidado@brazucabet.local',
        username: session.name,
        balance: session.balance,
      });
    } catch {
      setAuthMode('offline');
    }
  };

  const renameGuest = async (name: string) => {
    const clean = name.trim().slice(0, 18);
    if (!clean) return;
    setStoredName(clean);
    setUser((prev) => (prev ? { ...prev, username: clean } : prev));
    if (authMode === 'local') {
      try {
        await createOrRestoreSession(clean);
      } catch {
        /* melhor esforço */
      }
    }
  };

  const syncBalance = useCallback((balance: number) => {
    setUser((prev) => (prev ? { ...prev, balance } : prev));
  }, []);

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
      const referralCode = localStorage.getItem('referral_code') || undefined;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, referral_code: referralCode },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error(error.message);
        return false;
      }

      if (data.user) {
        toast.success('Account created successfully!');
        localStorage.removeItem('referral_code');
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

    if (authMode === 'supabase') await supabase.auth.signOut();
    else clearStoredToken();
    setUser(null);
    setIsCEO(false);
    setAuthMode('loading');
    toast.success('Logged out successfully');
  };

  const updateBalance = async (amount: number) => {
    if (!user) return;

    // No modo local o saldo dos jogos é controlado pelo servidor de jogos;
    // aqui só refletimos na tela (o servidor emite eventos `wallet`).
    if (authMode !== 'supabase') {
      const newLocalBalance = Math.max(0, Math.round((user.balance + amount) * 100) / 100);
      setUser({ ...user, balance: newLocalBalance });
      return;
    }

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
      authMode,
      renameGuest,
      syncBalance,
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