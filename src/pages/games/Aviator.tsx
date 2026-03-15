import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Loader2, Maximize, Plane } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';

const IFRAME_SRC = 'https://demo.spribe.io/launch/aviator?currency=BRL&lang=pt';
const LOAD_DELAY = 1800;

const Aviator: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), LOAD_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const handleDeposit = () => {
    if ((user?.balance ?? 0) < 100) return;
    updateBalance(-100);
  };

  const handleWithdraw = () => {
    updateBalance(250);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#14141c] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-3 sm:px-6 py-3 bg-[#1a1a2e]/95 backdrop-blur border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-red-500" />
          <span className="font-bold text-lg tracking-tight">
            Brazuca<span className="text-red-500">Bet</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold">
          <Wallet className="h-4 w-4 text-primary" />
          <span>{formatBRLShort(user?.balance ?? 0)}</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-2 sm:p-4 max-w-7xl mx-auto w-full">
        {/* Game Container */}
        <div ref={containerRef} className="flex-1 relative rounded-xl overflow-hidden shadow-2xl bg-black min-h-[60vh] lg:min-h-0">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#14141c] gap-4">
              <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
              <p className="text-sm text-white/50 animate-pulse">Conectando aos servidores Spribe...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={IFRAME_SRC}
            className="w-full h-full absolute inset-0"
            style={{ border: 'none', minHeight: '100%' }}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>

        {/* Sidebar / Controls */}
        <div className="lg:w-72 shrink-0 space-y-3">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/5 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Ações da Conta (Simulação)</h3>
            <p className="text-xs text-white/40">Simule depósitos e saques entre sua conta BrazucaBet e o jogo demo.</p>
            <Button onClick={handleDeposit} variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300" disabled={(user?.balance ?? 0) < 100}>
              Simular Depósito no Jogo (- R$ 100)
            </Button>
            <Button onClick={handleWithdraw} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              Simular Saque do Jogo (+ R$ 250)
            </Button>
          </div>
          <Button onClick={toggleFullscreen} variant="ghost" className="w-full text-white/50 hover:text-white text-xs gap-2">
            <Maximize className="h-4 w-4" /> {fullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Aviator;
