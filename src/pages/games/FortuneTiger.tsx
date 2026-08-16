import React, { useState, useEffect } from 'react';
import { ArrowLeft, Maximize, Heart, Wallet, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';

const GAME_URL = 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=vs20olympgate\&lang=pt\&cur=BRL';

const GatesOfOlympus: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const toggleFullscreen = () => {
    const el = document.getElementById('game-container');
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f15] text-white flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 border-b border-white/5 bg-[#1a1a2e]/95 backdrop-blur-md">
        <Link to="/games">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="text-lg sm:text-xl font-black tracking-tight text-primary">Brazuca</span>
          <span className="text-lg sm:text-xl font-black tracking-tight text-red-500">Bet</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 border border-white/5">
          <Wallet className="h-4 w-4 text-green-400" />
          <span className="text-sm font-bold">{user ? formatBRLShort(user.balance) : 'R$ 0,00'}</span>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center px-0 sm:px-4 pb-0 sm:pb-4">
        <div className="hidden sm:flex items-center gap-3 w-full max-w-5xl mt-4 mb-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold">Gates of Olympus</h1>
            <p className="text-xs text-white/50">Pragmatic Play</p>
          </div>
        </div>
        <div id="game-container" className="relative w-full sm:max-w-5xl sm:mx-auto sm:rounded-xl overflow-hidden shadow-2xl border border-white/5 flex-1 sm:flex-none sm:aspect-video bg-[#000]">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0f] gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-primary animate-spin" />
                <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-red-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Carregando Gates of Olympus...</p>
                <p className="text-xs text-white/40 mt-1">Pragmatic Play</p>
              </div>
            </div>
          )}
          <iframe src={GAME_URL} className={`w-full h-full absolute inset-0 transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'} brightness-105 contrast-105`} frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ border: 'none' }} />
        </div>
        <div className="w-full sm:max-w-5xl sm:mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:mt-3 border-t sm:border-t-0 border-white/5 bg-[#0f0f15] sm:bg-transparent">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleFullscreen} className="gap-1.5 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white">
              <Maximize className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isFullscreen ? 'Sair' : 'Tela Cheia'}</span>
            </Button>
            <Button variant={favorited ? 'default' : 'outline'} size="sm" onClick={() => setFavorited(!favorited)} className={`gap-1.5 text-xs ${favorited ? 'bg-red-600 hover:bg-red-700' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
              <Heart className={`h-3.5 w-3.5 ${favorited ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Favorito</span>
            </Button>
          </div>
          <p className="text-xs text-white/40 font-medium">Original Pragmatic Play • Seguro</p>
        </div>
      </div>
    </div>
  );
};
export default GatesOfOlympus;