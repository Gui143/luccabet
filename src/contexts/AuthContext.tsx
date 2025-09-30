import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

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
  login: (email: string, password: string) => boolean;
  signup: (email: string, password: string, username: string) => boolean;
  logout: () => void;
  updateBalance: (amount: number) => void;
  addBet: (bet: Omit<Bet, 'id' | 'userId' | 'timestamp'>) => void;
  getBetHistory: () => Bet[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signup = (email: string, password: string, username: string): boolean => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.find((u: any) => u.email === email)) {
      toast.error('Email already registered');
      return false;
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      username,
      balance: 1000, // Starting balance
    };

    const userWithPassword = { ...newUser, password };
    users.push(userWithPassword);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    setUser(newUser);
    toast.success('Account created successfully!');
    return true;
  };

  const login = (email: string, password: string): boolean => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userWithPassword = users.find((u: any) => u.email === email && u.password === password);

    if (!userWithPassword) {
      toast.error('Invalid email or password');
      return false;
    }

    const { password: _, ...userWithoutPassword } = userWithPassword;
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    setUser(userWithoutPassword);
    toast.success('Welcome back!');
    return true;
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateBalance = (amount: number) => {
    if (!user) return;

    const updatedUser = { ...user, balance: user.balance + amount };
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    // Update in users array
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: any) => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], balance: updatedUser.balance };
      localStorage.setItem('users', JSON.stringify(users));
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
    <AuthContext.Provider value={{ user, login, signup, logout, updateBalance, addBet, getBetHistory }}>
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
