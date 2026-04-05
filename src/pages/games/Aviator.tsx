import React from 'react';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import brazucaLogo from '@/assets/brazucabet-logo.png';

const Aviator: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="h-screen bg-[#14141c] text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-3 sm:px-6 h-[60px] shrink-0 bg-[#1a1a2e] border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src={brazucaLogo} alt="BrazucaBet" className="w-7 h-7 rounded-md object-cover" />
          <span className="font-bold text-lg tracking-tight">
            Brazuca<span className="text-red-500">Bet</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold">
          <Wallet className="h-4 w-4 text-green-400" />
          <span>{formatBRLShort(user?.balance || 0)}</span>
        </div>
      </header>

      <div className="flex-1 w-full lg:flex lg:justify-center lg:items-start lg:pt-6 lg:pb-6">
        <iframe
          src="https://demo.spribe.io/launch/aviator?currency=BRL&lang=pt"
          className="w-full h-[calc(100vh-60px)] lg:h-[80vh] lg:max-w-4xl lg:rounded-xl lg:shadow-2xl"
          style={{ border: 'none' }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default Aviator;
