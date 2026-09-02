import React, { useState } from 'react';
import {
  Bot,
  Crown,
  History,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatBRLShort } from '@/lib/formatCurrency';

interface PokerSidebarProps {
  isSeated: boolean;
  minBuyIn: number;
  maxBuyIn: number;
  buyIn: number;
  userBalance: number;
  nickname: string;
  botsEnabled: boolean;
  log: string[];
  chipsInPlay: number;
  onSetBuyIn: (val: number) => void;
  onSit: () => void;
  onRename: (nick: string) => void;
  onToggleBots: (val: boolean) => void;
}

export const PokerSidebar: React.FC<PokerSidebarProps> = ({
  isSeated,
  minBuyIn,
  maxBuyIn,
  buyIn,
  userBalance,
  nickname,
  botsEnabled,
  log,
  chipsInPlay,
  onSetBuyIn,
  onSit,
  onRename,
  onToggleBots,
}) => {
  const [nickInput, setNickInput] = useState(nickname);

  return (
    <div className="space-y-3">
      {/* -------------------- Painel de Entrada / Buy-in (quando não está sentado) */}
      {!isSeated && (
        <Card className="bg-gradient-to-b from-neutral-900/90 via-stone-950/90 to-black/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-black text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" /> ENTRAR NA MESA VIP
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                Com Fichas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 space-y-3">
            {/* Slider de Buy-in */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Seu Buy-in:</span>
                <span className="font-black text-amber-300 tabular-nums">
                  {formatBRLShort(buyIn)}
                </span>
              </div>

              <Slider
                value={[buyIn]}
                min={minBuyIn}
                max={maxBuyIn}
                step={Math.max(5, Math.round((maxBuyIn - minBuyIn) / 40))}
                onValueChange={(v) => onSetBuyIn(v[0])}
                className="cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-1 pt-1">
                {[
                  minBuyIn,
                  Math.round(minBuyIn + (maxBuyIn - minBuyIn) * 0.33),
                  Math.round(minBuyIn + (maxBuyIn - minBuyIn) * 0.66),
                  maxBuyIn,
                ].map((v, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] font-bold border-white/20 hover:border-amber-400 hover:text-amber-300 p-0"
                    onClick={() => onSetBuyIn(v)}
                  >
                    {formatBRLShort(v)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Botão Sentar */}
            <Button
              className="w-full h-11 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-xs shadow-[0_0_20px_rgba(251,191,36,0.6)]"
              disabled={userBalance < buyIn}
              onClick={onSit}
            >
              {userBalance < buyIn
                ? 'Saldo insuficiente (Recarregue acima)'
                : `Sentar com ${formatBRLShort(buyIn)} 👑`}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Ou clique diretamente numa cadeira vazia na mesa.
            </p>
          </CardContent>
        </Card>
      )}

      {/* -------------------- Perfil e Apelido VIP */}
      <Card className="bg-neutral-950/80 border border-white/10 shadow-xl backdrop-blur-xl">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-400" /> Seu Apelido VIP:
            </span>
            <span className="text-[10px] text-amber-300 font-bold">💎 HIGH ROLLER</span>
          </div>

          <div className="flex gap-1.5">
            <Input
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              placeholder="Digite seu nome de jogo"
              className="h-8 text-xs bg-neutral-900 border-white/20 text-white font-bold"
              maxLength={18}
            />
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => nickInput.trim() && onRename(nickInput)}
            >
              Salvar
            </Button>
          </div>

          {isSeated && (
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
              <span className="text-muted-foreground">Fichas em jogo:</span>
              <span className="font-black text-emerald-400 tabular-nums">
                {formatBRLShort(chipsInPlay)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* -------------------- Histórico de Ações da Mesa (Dealer Transcript) */}
      <Card className="bg-neutral-950/80 border border-white/10 shadow-xl backdrop-blur-xl">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-black text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" /> HISTÓRICO DA MESA
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">ao vivo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1 max-h-48 overflow-y-auto space-y-1 text-[11px]">
          {log && log.length ? (
            log.map((entry, i) => (
              <div
                key={i}
                className={`p-1 rounded ${
                  i === 0
                    ? 'bg-amber-500/15 border border-amber-400/30 text-amber-200 font-bold'
                    : 'text-muted-foreground'
                }`}
              >
                {entry}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground italic text-[11px]">
              Aguardando os primeiros lances da mesa…
            </div>
          )}
        </CardContent>
      </Card>

      {/* -------------------- Oponentes Bots / IA */}
      <Card className="bg-neutral-950/80 border border-white/10 shadow-xl backdrop-blur-xl">
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white">Preencher Mesa com Bots</div>
              <div className="text-[10px] text-muted-foreground">
                Jogue sempre com mesa cheia
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant={botsEnabled ? 'default' : 'outline'}
            className={`h-7 text-xs font-bold ${
              botsEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-white/20 text-muted-foreground'
            }`}
            onClick={() => onToggleBots(!botsEnabled)}
          >
            {botsEnabled ? 'Ativo' : 'Pausado'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PokerSidebar;
