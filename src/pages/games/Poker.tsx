import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Users, Wifi, WifiOff, RefreshCcw, LogOut, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import PlayingCard from '@/components/poker/PlayingCard';
import { useAuth } from '@/contexts/AuthContext';
import { usePoker, DEFAULT_TABLE_ID } from '@/hooks/usePoker';
import { formatBRLShort } from '@/lib/formatCurrency';
import { soundManager } from '@/lib/soundManager';
import { legalActions, type PublicState } from '@/games/poker/engine';
import type { PokerTableInfo } from '@/lib/net/types';

/** Posições (em %) das 6 cadeiras ao redor da mesa */
const SEAT_POSITIONS = [
  { x: 50, y: 86 }, // você (centro inferior)
  { x: 90, y: 62 },
  { x: 76, y: 10 },
  { x: 50, y: 2 },
  { x: 24, y: 10 },
  { x: 10, y: 62 },
];

const MODE_LABEL: Record<string, string> = {
  local: 'Servidor de jogos (multiplayer real)',
  supabase: 'Lovable Cloud (tempo real)',
  offline: 'Modo treino (sem servidor)',
};

const PHASE_LABEL: Record<string, string> = {
  idle: 'Aguardando jogadores',
  preflop: 'Pré-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  finished: 'Mão encerrada',
};

// ------------------------------------------------------------------ cronômetro
const TurnTimer: React.FC<{ deadline: number | null; now: () => number; turnSeconds: number }> = ({
  deadline,
  now,
  turnSeconds,
}) => {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setLeft(0);
      return;
    }
    const update = () => setLeft(Math.max(0, (deadline - now()) / 1000));
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [deadline, now]);

  if (!deadline) return null;
  const pct = Math.max(0, Math.min(100, (left / turnSeconds) * 100));

  return (
    <div className="w-full mt-1">
      <div className="h-1.5 w-full rounded-full bg-black/50 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-100 ${left < 6 ? 'bg-red-500' : left < 12 ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-white/70 mt-0.5 tabular-nums">{left.toFixed(1)}s</div>
    </div>
  );
};

// --------------------------------------------------------------------- assento
interface SeatViewProps {
  seat: PublicState['seats'][number];
  isYou: boolean;
  isTurn: boolean;
  isDealer: boolean;
  showCards: boolean;
  now: () => number;
  turnSeconds: number;
  deadline: number | null;
  winning: boolean;
  cardSize: number;
}

const SeatView: React.FC<SeatViewProps> = ({
  seat, isYou, isTurn, isDealer, showCards, now, turnSeconds, deadline, winning, cardSize,
}) => {
  if (!seat.playerId) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-60">
        <div className="w-11 h-11 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs">
          vazio
        </div>
      </div>
    );
  }

  const folded = seat.status === 'folded';
  const allIn = seat.status === 'allin';

  return (
    <div className={`flex flex-col items-center transition-transform duration-200 ${isTurn ? 'scale-105' : ''}`}>
      {seat.hole.length === 2 && (
        <div className="flex -space-x-2 mb-1">
          {seat.hole.map((c, i) => (
            <PlayingCard
              key={i}
              code={c}
              width={cardSize}
              dimmed={folded}
              className={`${isTurn ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]' : ''}`}
            />
          ))}
        </div>
      )}

      <div
        className={`relative px-2.5 py-1 rounded-xl border text-[11px] font-bold shadow-lg min-w-[92px] text-center ${
          folded
            ? 'bg-red-950/70 border-red-700/60 text-red-300'
            : isTurn
              ? 'bg-amber-400 text-black border-amber-200 shadow-[0_0_18px_rgba(250,204,21,0.7)]'
              : winning
                ? 'bg-emerald-500 text-black border-emerald-200'
                : 'bg-slate-900/90 border-white/20 text-white'
        }`}
      >
        <div className="flex items-center justify-center gap-1">
          {isDealer && <span title="Dealer" className="text-[10px]">●</span>}
          <span className="truncate max-w-[80px]">{seat.name}</span>
          {seat.isBot && <span className="text-[9px] font-normal opacity-70">bot</span>}
        </div>
        <div className={`text-[11px] ${folded ? 'text-red-300' : 'text-emerald-300'} tabular-nums`}>
          {formatBRLShort(seat.chips)}
        </div>
        {seat.bet > 0 && (
          <div className="text-[10px] text-amber-300 font-semibold tabular-nums">
            aposta {formatBRLShort(seat.bet)}
          </div>
        )}
        {allIn && <div className="text-[9px] uppercase tracking-wide text-amber-200">all-in</div>}
        {folded && <div className="text-[9px] uppercase tracking-wide">fold</div>}
        {seat.lastAction && !folded && (
          <div className="text-[9px] uppercase tracking-wide text-white/60">{seat.lastAction}</div>
        )}
        {isTurn && <TurnTimer deadline={deadline} now={now} turnSeconds={turnSeconds} />}
      </div>

      {isYou && <span className="mt-0.5 text-[9px] font-bold uppercase text-sky-300">você</span>}
    </div>
  );
};

// -------------------------------------------------------------------- página
const Poker: React.FC = () => {
  const { user, authMode, renameGuest } = useAuth();
  const poker = usePoker(DEFAULT_TABLE_ID);
  const { state, view, mySeat, sit, leave, act, setBots, start, tables, setTableId, tableId, mode, status, serverNow } = poker;

  const [muted, setMuted] = useState(soundManager.isMuted);
  const [buyIn, setBuyIn] = useState(500);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [showdownTick, setShowdownTick] = useState(0);

  const table: PokerTableInfo | undefined = useMemo(
    () => tables.find((t) => t.tableId === tableId),
    [tables, tableId],
  );

  const minBuyIn = table?.minBuyIn ?? state?.minBuyIn ?? 100;
  const maxBuyIn = table?.maxBuyIn ?? state?.maxBuyIn ?? 500;

  useEffect(() => {
    setBuyIn(Math.min(maxBuyIn, Math.max(minBuyIn, 500)));
  }, [minBuyIn, maxBuyIn]);

  // mantém o cronômetro da vez em dia (o estado do servidor também atualiza)
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (state?.phase === 'finished') setShowdownTick((n) => n + 1);
  }, [state?.phase, state?.handNo]);

  const my = mySeat >= 0 && state ? state.seats[mySeat] : null;
  const isSeated = !!my;
  const isMyTurn = !!state && state.turnSeat === mySeat && mySeat >= 0;

  const actions = useMemo(
    () => (state && mySeat >= 0 ? legalActions(state, mySeat) : null),
    [state, mySeat],
  );

  const toCall = actions?.callAmount ?? 0;
  const potTotal = state
    ? state.pots.reduce((a, p) => a + p.amount, 0) + state.seats.reduce((a, s) => a + s.bet, 0)
    : 0;

  const [raiseTo, setRaiseTo] = useState(0);
  useEffect(() => {
    if (actions) setRaiseTo(Math.min(actions.maxRaiseTo, actions.minRaiseTo));
  }, [actions?.minRaiseTo, actions?.maxRaiseTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const winners = state?.winners ?? [];
  const winningSeats = new Set(winners.map((w) => w.seat));

  const handleSit = () => {
    const seat = selectedSeat ?? state?.seats.findIndex((s) => !s.playerId) ?? 0;
    if (seat < 0) return;
    if ((user?.balance ?? 0) < buyIn) return;
    sit(seat, buyIn);
    setSelectedSeat(null);
  };

  const waitingForPlayers = state && state.phase === 'idle';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-3 p-2 sm:p-4">
        {/* ------------------------------------------------------ cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-card/80 border border-border rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/games">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </a>
            </Button>
            <div>
              <h1 className="text-base sm:text-xl font-black flex items-center gap-2">
                Poker Texas Hold'em
                <Badge variant="secondary" className="text-[10px]">
                  {state ? `R$ ${state.smallBlind} / R$ ${state.bigBlind}` : table?.tableName}
                </Badge>
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Buy-in R$ {minBuyIn} – R$ {maxBuyIn} • {state?.maxSeats ?? 6} cadeiras
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${
                status === 'open'
                  ? 'text-emerald-300 border-emerald-700/40 bg-emerald-950/40'
                  : 'text-amber-300 border-amber-700/40 bg-amber-950/40'
              }`}
              title={MODE_LABEL[mode]}
            >
              {status === 'open' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {mode === 'supabase' ? 'Lovable Cloud' : mode === 'local' ? 'Servidor local' : 'Treino'}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setMuted(soundManager.toggle())}>
              {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
            </Button>
            {isSeated && (
              <Button variant="destructive" size="sm" onClick={leave}>
                <LogOut className="w-3.5 h-3.5 mr-1" /> Sair da mesa
              </Button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ aviso de modo */}
        {authMode !== 'supabase' && (
          <div className="text-[11px] text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
            {authMode === 'local'
              ? 'Modo demonstração: o saldo e as fichas são controlados pelo servidor de jogos do projeto (multiplayer real entre abas/navegadores). No Lovable Cloud o mesmo jogo usa Supabase Realtime.'
              : 'Sem servidor: o motor roda no seu navegador e as cadeiras vazias são preenchidas por bots (treino).'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
          {/* ------------------------------------------------------- mesa */}
          <div className="relative">
            <div className="relative w-full aspect-[16/11] sm:aspect-[16/10] rounded-[50%]/[28%] sm:rounded-[50%] bg-[radial-gradient(ellipse_at_center,#0f5132_0%,#0a3d24_55%,#06281a_100%)] border-[10px] border-amber-900/80 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              {/* centro: comunitárias + pote */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[74%] sm:w-[62%] flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 border border-white/10">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-amber-200 font-black text-sm tabular-nums">{formatBRLShort(potTotal)}</span>
                  <span className="text-[10px] text-white/50 uppercase tracking-wide">pote</span>
                </div>

                <div className="flex gap-1 sm:gap-1.5 justify-center min-h-[54px] sm:min-h-[72px]">
                  {[0, 1, 2, 3, 4].map((i) =>
                    state && state.community[i] ? (
                      <PlayingCard
                        key={`${state.handNo}-${i}`}
                        code={state.community[i]}
                        width={48}
                        className="sm:hidden"
                      />
                    ) : null,
                  )}
                  {[0, 1, 2, 3, 4].map((i) =>
                    state && state.community[i] ? (
                      <PlayingCard
                        key={`lg-${state.handNo}-${i}`}
                        code={state.community[i]}
                        width={64}
                        className="hidden sm:block"
                      />
                    ) : null,
                  )}
                  {(!state || state.community.length === 0) && (
                    <span className="text-emerald-200/40 text-xs italic self-center">
                      {waitingForPlayers ? 'aguardando jogadores…' : 'aguardando o flop…'}
                    </span>
                  )}
                </div>

                <div className="px-3 py-0.5 rounded-full bg-black/40 text-[11px] font-bold text-white/80 uppercase tracking-wide">
                  {state ? PHASE_LABEL[state.phase] : 'carregando'}
                  {state && state.handNo > 0 ? ` • mão #${state.handNo}` : ''}
                </div>

                {state?.pots && state.pots.length > 1 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {state.pots.map((p, i) => (
                      <span key={i} className="text-[10px] bg-black/40 text-amber-200 px-1.5 py-0.5 rounded">
                        {p.label}: {formatBRLShort(p.amount)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* assentos */}
              {state?.seats.map((seat, idx) => {
                const pos = SEAT_POSITIONS[idx % SEAT_POSITIONS.length];
                const isTurn = state.turnSeat === idx;
                return (
                  <div
                    key={idx}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <SeatView
                      seat={seat}
                      isYou={seat.playerId === user?.id}
                      isTurn={isTurn}
                      isDealer={state.dealerSeat === idx}
                      showCards={state.phase === 'showdown' || state.phase === 'finished'}
                      now={serverNow}
                      turnSeconds={state.turnSeconds}
                      deadline={isTurn ? state.actionDeadline : null}
                      winning={winningSeats.has(idx)}
                      cardSize={idx === 0 ? 40 : 34}
                    />
                  </div>
                );
              })}

              {/* balão de resultado */}
              {state?.phase === 'finished' && winners.length > 0 && (
                <div className="absolute left-1/2 bottom-[6%] -translate-x-1/2 bg-amber-400 text-black px-3 py-1.5 rounded-xl text-xs font-black shadow-lg max-w-[90%] text-center">
                  {winners.map((w, i) => (
                    <div key={i}>
                      {w.name} ganhou {formatBRLShort(w.amount)}
                      {w.handName ? ` • ${w.handName}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ----------------------------------------------------- lateral */}
          <div className="space-y-3">
            {/* saldo / apelido */}
            <Card className="card-gradient border-border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Seu saldo</span>
                  <span className="font-black text-primary tabular-nums">{formatBRLShort(user?.balance ?? 0)}</span>
                </div>
                {authMode !== 'supabase' && (
                  <div className="flex gap-1.5">
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder={user?.username ?? 'Seu apelido'}
                      className="h-8 text-xs"
                      maxLength={18}
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => nickname.trim() && renameGuest(nickname)}
                    >
                      OK
                    </Button>
                  </div>
                )}
                {isSeated && my && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fichas na mesa</span>
                    <span className="font-bold text-emerald-400 tabular-nums">{formatBRLShort(my.chips)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* mesas */}
            {!isSeated && (
              <Card className="card-gradient border-border">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Mesas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-1 space-y-1.5">
                  {(tables.length ? tables : [{ tableId, tableName: 'Mesa Rio • R$ 2 / R$ 5', smallBlind: 2, bigBlind: 5, minBuyIn: 100, maxBuyIn: 500, maxSeats: 6, players: 0, phase: 'idle', botsEnabled: true } as PokerTableInfo]).map((t) => (
                    <button
                      key={t.tableId}
                      onClick={() => setTableId(t.tableId)}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-lg border transition-colors ${
                        t.tableId === tableId
                          ? 'bg-primary/15 border-primary text-foreground'
                          : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{t.tableName}</span>
                        <span className="text-[10px] text-muted-foreground">{t.players}/{t.maxSeats}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Buy-in {formatBRLShort(t.minBuyIn)} – {formatBRLShort(t.maxBuyIn)}
                      </div>
                    </button>
                  ))}

                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Buy-in</span>
                      <span className="font-bold tabular-nums">{formatBRLShort(buyIn)}</span>
                    </div>
                    <Slider
                      value={[buyIn]}
                      min={minBuyIn}
                      max={maxBuyIn}
                      step={Math.max(5, Math.round((maxBuyIn - minBuyIn) / 40))}
                      onValueChange={(v) => setBuyIn(v[0])}
                    />
                    <div className="flex gap-1">
                      {[minBuyIn, 200, 300, maxBuyIn].map((v, i) => (
                        <Button key={i} size="sm" variant="outline" className="flex-1 h-7 text-[11px]" onClick={() => setBuyIn(v)}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full mt-2 font-bold"
                    size="lg"
                    disabled={(user?.balance ?? 0) < buyIn}
                    onClick={handleSit}
                  >
                    {(user?.balance ?? 0) < buyIn
                      ? 'Saldo insuficiente'
                      : `Sentar com ${formatBRLShort(buyIn)}`}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Clique numa cadeira vazia da mesa para escolher o lugar.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* log da mão */}
            <Card className="card-gradient border-border">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">Histórico da mesa</CardTitle>
                <CardDescription className="text-[10px]">últimas ações</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-1 max-h-52 overflow-y-auto space-y-0.5">
                {state?.log?.length ? (
                  state.log.map((l, i) => (
                    <div key={i} className={`text-[11px] ${i === 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {l}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-muted-foreground">sem lances ainda</div>
                )}
              </CardContent>
            </Card>

            {/* bots */}
            <Card className="card-gradient border-border">
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold">Preencher com bots</div>
                  <div className="text-[10px] text-muted-foreground">
                    Desligue para jogar só com gente real
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={view?.botsEnabled ? 'default' : 'outline'}
                  onClick={() => setBots(!view?.botsEnabled)}
                >
                  {view?.botsEnabled ? 'Ligado' : 'Desligado'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ----------------------------------------------- barra de ações */}
        {isSeated && state && state.phase !== 'idle' && (
          <div className="sticky bottom-0 z-10 bg-card/95 backdrop-blur border border-border rounded-2xl p-3 shadow-2xl">
            {isMyTurn && actions ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                  <span>
                    Aposta atual: <strong className="tabular-nums">{formatBRLShort(state.currentBet)}</strong>
                  </span>
                  <span>
                    Para pagar:{' '}
                    <strong className="text-primary tabular-nums">{formatBRLShort(toCall)}</strong>
                  </span>
                  <span>
                    Pote: <strong className="text-amber-400 tabular-nums">{formatBRLShort(potTotal)}</strong>
                  </span>
                  {my?.bestHand && (
                    <span className="text-emerald-300">Mão: {my.bestHand.name}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Aumentar para {formatBRLShort(raiseTo)}</span>
                    <span className="text-muted-foreground">máx {formatBRLShort(actions.maxRaiseTo)}</span>
                  </div>
                  <Slider
                    value={[raiseTo]}
                    min={actions.minRaiseTo}
                    max={Math.max(actions.minRaiseTo, actions.maxRaiseTo)}
                    step={Math.max(1, Math.round(state.bigBlind / 2))}
                    onValueChange={(v) => setRaiseTo(v[0])}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <Button variant="destructive" onClick={() => act('fold')} className="font-bold">
                    Desistir
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => act(toCall === 0 ? 'check' : 'call')}
                    className="font-bold"
                  >
                    {toCall === 0 ? 'Mesa' : `Pagar ${formatBRLShort(toCall)}`}
                  </Button>
                  <Button
                    disabled={!actions.canRaise}
                    onClick={() => act('raise', raiseTo)}
                    className="font-bold"
                  >
                    Aumentar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!actions.canRaise}
                    onClick={() => act('raise', Math.max(actions.minRaiseTo, Math.round(state.currentBet + potTotal / 2)))}
                    className="font-bold text-xs"
                  >
                    ½ pote
                  </Button>
                  <Button
                    onClick={() => act('allin')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold col-span-2 sm:col-span-1"
                  >
                    All-in
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {state.phase === 'finished'
                    ? 'Mão encerrada — a próxima começa em instantes.'
                    : waitingForPlayers
                      ? 'Aguardando pelo menos 2 jogadores…'
                      : 'Aguardando a ação dos outros jogadores…'}
                </span>
                <div className="flex items-center gap-1.5">
                  {my && my.chips === 0 && state.phase === 'finished' && (
                    <span className="text-amber-300 font-semibold">Você está sem fichas — saia e faça um novo buy-in.</span>
                  )}
                  {my && state.phase === 'finished' && my.chips > 0 && my.chips < state.bigBlind && (
                    <span className="text-amber-300 font-semibold">
                      Fichas insuficientes para as cegas: faça um rebuy saindo e entrando de novo.
                    </span>
                  )}
                  {state.phase === 'finished' && (
                    <Button size="sm" variant="outline" onClick={() => act('check')}>
                      <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Forçar próxima mão
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* botão "sentar" quando está só assistindo */}
        {!isSeated && state && (
          <div className="text-center text-xs text-muted-foreground">
            Escolha uma cadeira livre na mesa clicando nela para sentar com {formatBRLShort(buyIn)}.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Poker;
