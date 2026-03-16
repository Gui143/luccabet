import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Loader2, Maximize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';

const IFRAME_SRC = 'https://demo.spribe.io/launch/aviator?currency=BRL&lang=pt';
const LOAD_DELAY = 1500;

const Aviator: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), LOAD_DELAY);
    return () => clearTimeout(timer);
  }, []);

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
      {/* Header - 60px */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-3 sm:px-6 h-[60px] bg-[#1a1a2e]/95 backdrop-blur border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-bold text-lg tracking-tight">
          Brazuca<span className="text-red-500">Bet</span>
        </span>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold">
          <Wallet className="h-4 w-4 text-primary" />
          <span>{formatBRLShort(user?.balance ?? 0)}</span>
        </div>
      </header>

      {/* Game Container */}
      <div className="flex-1 flex flex-col items-center">
        <div
          ref={containerRef}
          className="relative w-full h-[calc(100vh-60px)] lg:max-w-5xl lg:mx-auto lg:h-[80vh] lg:rounded-xl lg:overflow-hidden lg:mt-6 lg:shadow-2xl"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#14141c] gap-4">
              <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
              <p className="text-sm text-white/50 animate-pulse">Conectando aos servidores Spribe...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={IFRAME_SRC}
            className="w-full h-full"
            style={{ border: 'none' }}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>

        {/* Fullscreen button - desktop only */}
        <div className="hidden lg:flex justify-center mt-3">
          <Button onClick={toggleFullscreen} variant="ghost" className="text-white/50 hover:text-white text-xs gap-2">
            <Maximize className="h-4 w-4" /> {fullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Aviator;
