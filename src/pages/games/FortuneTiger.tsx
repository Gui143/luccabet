import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const FortuneTiger: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-3 sm:px-6 h-[60px] shrink-0 bg-zinc-900 border-b border-amber-500/10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-bold text-lg tracking-tight">
          Brazuca<span className="text-amber-400">Bet</span>
        </span>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold">
          <Wallet className="h-4 w-4 text-amber-400" />
          <span>R$ 500,00</span>
        </div>
      </header>

      <div className="flex-1 w-full flex justify-center lg:items-start lg:pt-6">
        <div className="relative w-full h-[calc(100vh-60px)] lg:max-w-[420px] lg:h-[80vh] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl lg:border lg:border-zinc-800">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950 gap-4">
              <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
              <p className="text-sm text-white/40 animate-pulse">Carregando Fortune Tiger...</p>
            </div>
          )}
          <iframe
            src="https://m.pgsoft-games.com/126/index.html?lang=pt-br"
            className="w-full h-full"
            style={{ border: 'none' }}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

export default FortuneTiger;
