import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Gamepad2, ListOrdered, User, LogOut, Wallet, Settings, Users, Plus, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { formatBRLShort } from '@/lib/formatCurrency';
import MobileAdminPanel from '@/components/MobileAdminPanel';
import SoundToggle from '@/components/SoundToggle';
import SupportChat from '@/components/SupportChat';
import ThemeBackground from '@/components/ThemeBackground';

import brazucaLogo from '@/assets/brazucabet-logo.png';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  const isAdminEmail = user?.email === 'prudencioguilherme7@gmail.com';

  const navItems = [
    { path: '/', label: 'Início', icon: Home },
    { path: '/games', label: 'Cassino', icon: Gamepad2 },
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
      <div className="min-h-screen w-full overflow-x-hidden">
        <ThemeBackground />
        <header className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-50">
          <div className="w-full max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setShowAdmin(false)} className="flex items-center gap-2">
                <img src={brazucaLogo} alt="BrazucaBet" className="w-8 h-8 rounded-lg object-cover" />
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
    <div className="min-h-screen w-full overflow-x-hidden pb-16 md:pb-0">
      <ThemeBackground />
      {/* Top Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src={brazucaLogo} alt="BrazucaBet" className="w-8 h-8 rounded-md object-cover" />
              <h1 className="text-lg font-extrabold hidden sm:block">
                <span className="text-primary">BRAZUCA</span><span className="text-foreground">BET</span>
              </h1>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.slice(0, 4).map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {isAdminEmail && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  Admin
                </button>
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <SoundToggle />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary border border-border">
                <span className="font-bold text-foreground text-sm">{formatBRLShort(user.balance)}</span>
              </div>
              <Link to="/wallet">
                <Button size="sm" className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Depositar
                </Button>
              </Link>
              <div className="hidden md:flex items-center">
                <Link to="/account" className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Link>
                <Button onClick={logout} variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content (Otimizado com margens seguras anti-overscan para monitores 1920x1080) */}
      <main className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-5">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-8 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={brazucaLogo} alt="BrazucaBet" className="w-6 h-6 rounded object-cover" />
              <span className="text-sm font-bold text-muted-foreground">BRAZUCABET</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 BRAZUCABET – Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around py-1.5 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors min-w-0 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] truncate">{item.label}</span>
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
        </div>
      </nav>

      {/* Support Chat */}
      <SupportChat />
    </div>
  );
};

export default Layout;
