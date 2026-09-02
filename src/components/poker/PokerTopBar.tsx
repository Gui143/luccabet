import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Coins,
  Crown,
  LogOut,
  Palette,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatBRLShort } from '@/lib/formatCurrency';
import { soundManager } from '@/lib/soundManager';
import type { TableTheme } from './LuxuryPokerTable';
import type { PokerTableInfo } from '@/lib/net/types';

interface PokerTopBarProps {
  tableName: string;
  blinds: string;
  userBalance: number;
  isSeated: boolean;
  status: 'connecting' | 'open' | 'closed';
  mode: string;
  currentTheme: TableTheme;
  tables: PokerTableInfo[];
  currentTableId: string;
  onSelectTheme: (theme: TableTheme) => void;
  onSelectTable: (tableId: string) => void;
  onOpenStory: () => void;
  onAddVipFunds: (amount: number) => void;
  onLeaveTable: () => void;
}

const THEMES: { id: TableTheme; label: string; iconColor: string }[] = [
  { id: 'monte-carlo', label: 'Monte Carlo Emerald 🟢', iconColor: 'bg-emerald-600' },
  { id: 'bellagio-obsidian', label: 'Bellagio Obsidian & Gold ⚫', iconColor: 'bg-neutral-900 border border-amber-400' },
  { id: 'macau-ruby', label: 'Macau Imperial Ruby 🔴', iconColor: 'bg-rose-900' },
  { id: 'dubai-sapphire', label: 'Dubai Royal Sapphire 🔵', iconColor: 'bg-blue-900' },
  { id: 'monaco-amethyst', label: 'Monaco Royal Amethyst 🟣', iconColor: 'bg-purple-900' },
];

export const PokerTopBar: React.FC<PokerTopBarProps> = ({
  tableName,
  blinds,
  userBalance,
  isSeated,
  status,
  mode,
  currentTheme,
  tables,
  currentTableId,
  onSelectTheme,
  onSelectTable,
  onOpenStory,
  onAddVipFunds,
  onLeaveTable,
}) => {
  const [muted, setMuted] = useState(soundManager.isMuted);
  const [faucetOpen, setFaucetOpen] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(false);

  const toggleSound = () => {
    const next = soundManager.toggle();
    setMuted(next);
  };

  return (
    <>
      <div className="w-full bg-gradient-to-r from-neutral-950 via-stone-900 to-neutral-950 border-b border-amber-500/30 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xl backdrop-blur-xl">
        {/* Lado Esquerdo: Voltar + Info da Mesa VIP */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-white/20 bg-black/40 hover:bg-white/10 text-white font-bold h-9"
          >
            <a href="/games">
              <ArrowLeft className="w-4 h-4 mr-1 text-amber-400" />
              <span className="hidden sm:inline">Cassino</span>
            </a>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 flex items-center gap-1.5 drop-shadow">
                <Crown className="w-4 h-4 text-amber-400" />
                {tableName}
              </h1>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-[10px] py-0 px-2 font-bold">
                {blinds}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
              <span>LuccaBet VIP High Roller Suite</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {status === 'open' ? 'Ao Vivo' : 'Conectando'}
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Saldo + Faucet + Temas + Story Flex + Sair */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Saldo do Jogador */}
          <div className="px-3 py-1 rounded-xl bg-black/60 border border-amber-400/40 flex items-center gap-1.5 shadow-inner">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
                Banca VIP
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-300 tabular-nums leading-tight">
                {formatBRLShort(userBalance)}
              </span>
            </div>
          </div>

          {/* Botão de Recarregar Banca VIP (+Fichas para Story Flex) */}
          <Button
            size="sm"
            onClick={() => setFaucetOpen(true)}
            className="h-9 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-md"
            title="Recarregar Fichas VIP para jogar e postar no story"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
            <span className="hidden sm:inline">+ Banca VIP</span>
          </Button>

          {/* Botão Story Flex (O Destaque do Pedido!) */}
          <Button
            size="sm"
            onClick={onOpenStory}
            className="h-9 px-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-xs shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse"
          >
            <Camera className="w-4 h-4 mr-1.5" />
            <span>Story Flex</span>
          </Button>

          {/* Seletor de Mesas */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTablesOpen(true)}
            className="h-9 px-2.5 border-white/20 bg-black/40 hover:bg-white/10 text-white text-xs font-bold"
          >
            <Users className="w-3.5 h-3.5 mr-1 text-amber-400" />
            <span className="hidden sm:inline">Mesas</span>
          </Button>

          {/* Seletor de Tema do Feltro */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-white/20 bg-black/40 hover:bg-white/10 text-amber-300"
                title="Trocar Cor do Feltro da Mesa"
              >
                <Palette className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-950 border-amber-500/40 text-white">
              <DropdownMenuLabel className="text-xs text-amber-300 font-bold">
                Ambiente da Mesa
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {THEMES.map((th) => (
                <DropdownMenuItem
                  key={th.id}
                  onClick={() => onSelectTheme(th.id)}
                  className={`cursor-pointer text-xs flex items-center justify-between ${
                    currentTheme === th.id ? 'bg-amber-500/20 text-amber-300 font-bold' : ''
                  }`}
                >
                  <span>{th.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Som */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            className="h-9 w-9 text-amber-300 hover:bg-white/10"
          >
            {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          {/* Sair da Mesa */}
          {isSeated && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onLeaveTable}
              className="h-9 px-2.5 font-bold text-xs bg-red-900/80 hover:bg-red-800 border border-red-700/60"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Recarga de Banca VIP (Faucet Instantâneo) */}
      <Dialog open={faucetOpen} onOpenChange={setFaucetOpen}>
        <DialogContent className="bg-gradient-to-b from-neutral-900 via-stone-950 to-black border-2 border-amber-400/60 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-amber-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Recarregar Banca VIP
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adicione fichas de alta cotação para jogar nas mesas de High Roller e tirar prints milionários para o Story!
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2.5 py-3">
            {[
              { amount: 10000, label: 'R$ 10.000', desc: 'Starter High Roller' },
              { amount: 50000, label: 'R$ 50.000', desc: 'VIP Lounge Regular' },
              { amount: 250000, label: 'R$ 250.000', desc: 'Diamond Whale 💎' },
              { amount: 1000000, label: 'R$ 1.000.000', desc: 'Bilionário Macau 👑' },
            ].map((pkg, i) => (
              <Button
                key={i}
                onClick={() => {
                  onAddVipFunds(pkg.amount);
                  setFaucetOpen(false);
                }}
                className="h-16 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 hover:from-amber-500/20 hover:to-amber-600/30 border border-amber-400/40 rounded-xl p-2 transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                <span className="text-sm font-black text-amber-300">{pkg.label}</span>
                <span className="text-[10px] text-muted-foreground">{pkg.desc}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Escolha de Mesas */}
      <Dialog open={tablesOpen} onOpenChange={setTablesOpen}>
        <DialogContent className="bg-gradient-to-b from-neutral-900 via-stone-950 to-black border-2 border-amber-400/60 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-amber-300 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" /> Salas de Poker VIP
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha seu nível de limites e entre nas melhores mesas com jogadores e bots
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
            {tables.map((t) => (
              <button
                key={t.tableId}
                onClick={() => {
                  onSelectTable(t.tableId);
                  setTablesOpen(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  t.tableId === currentTableId
                    ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'bg-neutral-900/60 border-white/10 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">{t.tableName}</span>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-[10px]">
                      R$ {t.smallBlind} / R$ {t.bigBlind}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.players}/{t.maxSeats} jogadores
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                  <span>Buy-in: {formatBRLShort(t.minBuyIn)} – {formatBRLShort(t.maxBuyIn)}</span>
                  <span className="text-emerald-400 font-bold">Entrar na Sala →</span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PokerTopBar;
