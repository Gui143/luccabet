import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Gamepad2, ListOrdered, User, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/games', label: 'Games', icon: Gamepad2 },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/my-bets', label: 'My Bets', icon: ListOrdered },
    { path: '/account', label: 'Account', icon: User },
  ];

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <span className="text-xl font-bold text-primary-foreground">7R</span>
              </div>
              <h1 className="text-2xl font-bold text-gradient">7Reiv BET</h1>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border">
                <Wallet className="w-5 h-5 text-secondary" />
                <span className="font-bold text-secondary">${user.balance.toFixed(2)}</span>
              </div>
              <Button onClick={logout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <nav className="md:hidden flex items-center justify-around mt-4 pt-4 border-t border-border">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
