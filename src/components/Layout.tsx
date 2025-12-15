import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Gamepad2, ListOrdered, User, LogOut, Wallet, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { formatBRLShort } from '@/lib/formatCurrency';
import CEOPanel from '@/components/CEOPanel';
import GlobalChat from '@/components/GlobalChat';
import MobileAdminPanel from '@/components/MobileAdminPanel';
import { useIsMobile } from '@/hooks/use-mobile';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout, isCEO } = useAuth();
  const [showCEOPanel, setShowCEOPanel] = useState(false);
  const [showMobileAdmin, setShowMobileAdmin] = useState(false);
  const isMobile = useIsMobile();

  // Check if user is the specific CEO
  const isAdminEmail = user?.email === 'prudencioguilherme7@gmail.com';

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // CTRL + ALT + U - Admin shortcut (desktop only)
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'u') {
        if (isCEO && !isMobile) {
          e.preventDefault();
          setShowCEOPanel(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isCEO, isMobile]);

  // Base nav items
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

  // If showing mobile admin panel
  if (showMobileAdmin && isMobile && isAdminEmail) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="w-full max-w-7xl mx-auto px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setShowMobileAdmin(false)} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-base font-bold text-primary-foreground">LB</span>
                </div>
                <span className="text-lg font-bold text-gradient">LUCCABET</span>
              </button>
              <Button onClick={() => setShowMobileAdmin(false)} variant="outline" size="sm">
                Voltar
              </Button>
            </div>
          </div>
        </header>

        <main className="w-full max-w-7xl mx-auto px-3 py-4">
          <MobileAdminPanel />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <span className="text-base sm:text-xl font-bold text-primary-foreground">LB</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-gradient hidden xs:block">LUCCABET</h1>
            </Link>

            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 transition-colors text-sm lg:text-base ${
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-muted border border-border">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <span className="font-bold text-primary text-sm sm:text-base">{formatBRLShort(user.balance)}</span>
              </div>
              <Button onClick={logout} variant="outline" size="sm" className="h-8 sm:h-9 px-2 sm:px-3">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
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
                  <span className="text-[10px] sm:text-xs">{item.label}</span>
                </Link>
              );
            })}

            {/* Mobile Admin Button - Only visible on mobile for specific admin */}
            {isMobile && isAdminEmail && (
              <button
                onClick={() => setShowMobileAdmin(true)}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors text-secondary"
              >
                <Settings className="w-5 h-5" />
                <span className="text-[10px] sm:text-xs">Admin</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 LUCCABET. Plataforma 100% simulada. Moeda fictícia.
            </p>
          </div>
        </div>
      </footer>

      <GlobalChat />
      <CEOPanel isOpen={showCEOPanel} onClose={() => setShowCEOPanel(false)} />
    </div>
  );
};

export default Layout;
