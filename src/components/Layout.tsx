import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Gamepad2, ListOrdered, User, LogOut, Wallet, Settings, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { formatBRLShort } from '@/lib/formatCurrency';
import MobileAdminPanel from '@/components/MobileAdminPanel';
import SoundToggle from '@/components/SoundToggle';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout, isCEO } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  const isAdminEmail = user?.email === 'prudencioguilherme7@gmail.com';

  const navItems = [
    { path: '/', label: 'Início', icon: Home },
    { path: '/games', label: 'Jogos', icon: Gamepad2 },
    { path: '/wallet', label: 'Carteira', icon: Wallet },
    { path: '/my-bets', label: 'Apostas', icon: ListOrdered },
    { path: '/affiliates', label: 'Afiliados', icon: Users },
    { path: '/account', label: 'Conta', icon: User },
  ];

  if (!user) {
    return <>{children}</>;
  }

  if (showAdmin && isAdminEmail) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="w-full max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setShowAdmin(false)} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">BB</span>
                </div>
                <span className="text-lg font-bold text-gradient">BRAZUCABET</span>
              </button>
              <Button onClick={() => setShowAdmin(false)} variant="outline" size="sm">
                Voltar
              </Button>
            </div>
          </div>
        </header>

        <main className="w-full max-w-4xl mx-auto px-4 py-6">
          <MobileAdminPanel />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-sm sm:text-lg font-bold text-primary-foreground">BB</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-gradient hidden xs:block">BRAZUCABET</h1>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 transition-colors text-sm font-medium ${
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {isAdminEmail && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <SoundToggle />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
                <Wallet className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-primary text-sm">{formatBRLShort(user.balance)}</span>
              </div>
              <Button onClick={logout} variant="outline" size="sm" className="h-8 px-2 sm:px-3">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline text-sm">Sair</span>
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center justify-around mt-3 pt-3 border-t border-border -mx-3 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                    isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              );
            })}

            {isAdminEmail && (
              <button
                onClick={() => setShowAdmin(true)}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors text-primary"
              >
                <Settings className="w-5 h-5" />
                <span className="text-[10px]">Admin</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            © 2026 BRAZUCABET – Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
