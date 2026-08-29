import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spade, Trophy, Volume2, VolumeX, ArrowLeft, RefreshCcw, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { soundManager } from '@/lib/soundManager';
import { recordGameOutcome } from '@/lib/gameOutcomes';
import { toast } from 'sonner';
import { createDeck, evaluate7Cards, Card as PokerCard, Player, GamePhase, EvaluatedHand } from '@/games/pokerEngine';

const SMALL_BLIND = 5;
const BIG_BLIND = 10;
const BUY_IN = 500; // 50x BB

const CardView: React.FC<{ card: PokerCard; size?: 'sm' | 'md' }> = ({ card, size = 'md' }) => {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const w = size === 'sm' ? 'w-10 h-14 text-xs' : 'w-14 h-20 text-sm sm:w-16 sm:h-24 sm:text-base';
  
  if (card.hidden) {
    return (
      <div className={`${w} rounded-lg border border-border bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center shadow-md`}>
        <span className="font-bold text-primary-foreground/60">?</span>
      </div>
    );
  }

  return (
    <div className={`${w} rounded-lg border border-border bg-card flex flex-col items-center justify-between p-1 shadow-md transition-all duration-300`}>
      <div className={`font-bold self-start ${isRed ? 'text-destructive' : 'text-foreground'}`}>
        {card.value}
      </div>
      <div className={`text-lg sm:text-2xl ${isRed ? 'text-destructive' : 'text-foreground'}`}>
        {card.suit}
      </div>
      <div className={`font-bold self-end rotate-180 ${isRed ? 'text-destructive' : 'text-foreground'}`}>
        {card.value}
      </div>
    </div>
  );
};

const Poker: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const [inGame, setInGame] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('finished');
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [communityCards, setCommunityCards] = useState<PokerCard[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(BIG_BLIND);
  const [players, setPlayers] = useState<Player[]>([
    { id: 'user', name: 'Você', isBot: false, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
    { id: 'bot1', name: '****lherme', isBot: true, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
    { id: 'bot2', name: 'L****s', isBot: true, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
    { id: 'bot3', name: 'M*****s', isBot: true, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
  ]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [raiseAmount, setRaiseAmount] = useState(BIG_BLIND * 2);
  const [dealerIndex, setDealerIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [showdownResult, setShowdownResult] = useState<string | null>(null);
  const [muted, setMuted] = useState(soundManager.isMuted);

  const toggleSound = () => {
    const m = soundManager.toggle();
    setMuted(m);
  };

  const startBuyIn = () => {
    if (!user || user.balance < BUY_IN) {
      toast.error('Saldo insuficiente para o Buy-in de R$ 500 (50x BB)');
      return;
    }
    updateBalance(-BUY_IN);
    soundManager.playBet();
    setInGame(true);
    setPlayers([
      { id: 'user', name: 'Você', isBot: false, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
      { id: 'bot1', name: '****lherme', isBot: true, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
      { id: 'bot2', name: 'L****s', isBot: true, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
      { id: 'bot3', name: 'M*****s', isBot: true, chips: BUY_IN, bet: 0, hand: [], folded: false, allIn: false, actedInRound: false },
    ]);
    startNewHand(0);
  };

  const leaveTable = () => {
    const userPlayer = players.find(p => p.id === 'user');
    if (userPlayer && userPlayer.chips > 0) {
      updateBalance(userPlayer.chips);
      toast.info(`Você saiu da mesa. Devolvido R$ ${userPlayer.chips} para a carteira.`);
    }
    setInGame(false);
    setPhase('finished');
  };

  const startNewHand = (nextDealer: number) => {
    const newDeck = createDeck();
    const dIdx = nextDealer % players.length;
    setDealerIndex(dIdx);

    // Deal 2 cards to each player
    let currentDeck = [...newDeck];
    const updatedPlayers = players.map(p => {
      const hand = [currentDeck.pop()!, currentDeck.pop()!];
      return {
        ...p,
        hand,
        bet: 0,
        folded: p.chips <= 0,
        allIn: false,
        actedInRound: false,
        statusText: undefined,
        bestHand: undefined,
      };
    });

    // Post blinds
    const sbIndex = (dIdx + 1) % players.length;
    const bbIndex = (dIdx + 2) % players.length;
    let totalPot = 0;

    updatedPlayers.forEach((p, idx) => {
      if (idx === sbIndex) {
        const amt = Math.min(p.chips, SMALL_BLIND);
        p.chips -= amt;
        p.bet = amt;
        totalPot += amt;
        p.statusText = 'SB';
      } else if (idx === bbIndex) {
        const amt = Math.min(p.chips, BIG_BLIND);
        p.chips -= amt;
        p.bet = amt;
        totalPot += amt;
        p.statusText = 'BB';
      }
    });

    setDeck(currentDeck);
    setCommunityCards([]);
    setPot(totalPot);
    setCurrentBet(BIG_BLIND);
    setPlayers(updatedPlayers);
    setPhase('pre-flop');
    setShowdownResult(null);
    setMessage('Pré-flop: Distribuição de cartas');

    // First to act pre-flop is after BB (dIdx + 3)
    const firstActor = (bbIndex + 1) % players.length;
    setActivePlayerIndex(firstActor);
    soundManager.playBet();
  };

  const nextPhase = useCallback((currentPhase: GamePhase, currentDeck: PokerCard[], currentCommunity: PokerCard[]) => {
    // Reset bets and acted flags
    const resetPlayers = players.map(p => ({ ...p, bet: 0, actedInRound: false, statusText: undefined }));

    if (currentPhase === 'pre-flop') {
      const [flopCards, rem] = [currentDeck.slice(0, 3), currentDeck.slice(3)];
      setCommunityCards(flopCards);
      setDeck(rem);
      setPlayers(resetPlayers);
      setCurrentBet(0);
      setPhase('flop');
      setMessage('Flop revelado');
      soundManager.playBet();
      setActivePlayerIndex((dealerIndex + 1) % players.length);
    } else if (currentPhase === 'flop') {
      const [turnCard, rem] = [currentDeck[0], currentDeck.slice(1)];
      const newComm = [...currentCommunity, turnCard];
      setCommunityCards(newComm);
      setDeck(rem);
      setPlayers(resetPlayers);
      setCurrentBet(0);
      setPhase('turn');
      setMessage('Turn revelado');
      soundManager.playBet();
      setActivePlayerIndex((dealerIndex + 1) % players.length);
    } else if (currentPhase === 'turn') {
      const [riverCard, rem] = [currentDeck[0], currentDeck.slice(1)];
      const newComm = [...currentCommunity, riverCard];
      setCommunityCards(newComm);
      setDeck(rem);
      setPlayers(resetPlayers);
      setCurrentBet(0);
      setPhase('river');
      setMessage('River revelado');
      soundManager.playBet();
      setActivePlayerIndex((dealerIndex + 1) % players.length);
    } else if (currentPhase === 'river') {
      setPhase('showdown');
      handleShowdown(resetPlayers, currentCommunity);
    }
  }, [dealerIndex, players]);

  const handleShowdown = (finalPlayers: Player[], commCards: PokerCard[]) => {
    setMessage('Showdown!');
    const active = finalPlayers.filter(p => !p.folded);
    
    if (active.length === 1) {
      const winner = active[0];
      winner.chips += pot;
      setShowdownResult(`${winner.name} venceu o pote de ${formatBRLShort(pot)} (oponentes desistiram)!`);
      if (winner.id === 'user') {
        soundManager.playWin();
        toast.success(`Você ganhou ${formatBRLShort(pot)}!`);
        addBet({ game: 'Poker', amount: BUY_IN, odds: 2, result: 'win', profit: pot - BUY_IN });
        recordGameOutcome({ userId: user?.id, gameName: 'Poker', betAmount: BUY_IN, multiplier: 2, winAmount: pot });
      } else {
        soundManager.playLose();
        toast.error(`${winner.name} venceu a mão.`);
        addBet({ game: 'Poker', amount: BUY_IN, odds: 0, result: 'loss', profit: -BUY_IN });
        recordGameOutcome({ userId: user?.id, gameName: 'Poker', betAmount: BUY_IN, multiplier: 0, winAmount: 0 });
      }
      setPhase('finished');
      setPlayers(finalPlayers);
      return;
    }

    // Evaluate 7 cards for each active player
    let bestScore = -1;
    let winners: Player[] = [];

    const evaluated = finalPlayers.map(p => {
      if (p.folded) return p;
      const best = evaluate7Cards([...p.hand, ...commCards]);
      return { ...p, bestHand: best };
    });

    evaluated.forEach(p => {
      if (!p.folded && p.bestHand) {
        if (p.bestHand.score > bestScore) {
          bestScore = p.bestHand.score;
          winners = [p];
        } else if (p.bestHand.score === bestScore) {
          winners.push(p);
        }
      }
    });

    const share = Math.floor(pot / winners.length);
    winners.forEach(w => {
      w.chips += share;
    });

    const winnerNames = winners.map(w => w.name).join(', ');
    const winningHandName = winners[0]?.bestHand?.name || '';
    setShowdownResult(`${winnerNames} venceu com ${winningHandName}! Pote: ${formatBRLShort(pot)}`);

    const userWon = winners.some(w => w.id === 'user');
    if (userWon) {
      soundManager.playWin();
      toast.success(`Você venceu a mão e levou ${formatBRLShort(share)}!`);
      addBet({ game: 'Poker', amount: BUY_IN, odds: 2, result: 'win', profit: share - BUY_IN });
      recordGameOutcome({ userId: user?.id, gameName: 'Poker', betAmount: BUY_IN, multiplier: 2, winAmount: share });
    } else {
      soundManager.playLose();
      toast.error(`${winnerNames} venceu a rodada.`);
      addBet({ game: 'Poker', amount: BUY_IN, odds: 0, result: 'loss', profit: -BUY_IN });
      recordGameOutcome({ userId: user?.id, gameName: 'Poker', betAmount: BUY_IN, multiplier: 0, winAmount: 0 });
    }

    setPhase('finished');
    setPlayers(evaluated);
  };

  // Turn advance logic
  const advanceTurn = useCallback((updatedPlayers: Player[], nextIdx: number) => {
    const active = updatedPlayers.filter(p => !p.folded);
    if (active.length <= 1) {
      handleShowdown(updatedPlayers, communityCards);
      return;
    }

    // Check if betting round is complete (all non-folded have acted and match currentBet or are all-in)
    const allActed = active.every(p => p.actedInRound || p.allIn || p.chips === 0);
    const allEqual = active.every(p => p.bet === currentBet || p.allIn || p.chips === 0);

    if (allActed && allEqual) {
      // Move to next phase
      setTimeout(() => {
        nextPhase(phase, deck, communityCards);
      }, 800);
      return;
    }

    // Find next non-folded, non-allin player
    let idx = nextIdx % updatedPlayers.length;
    let loopCount = 0;
    while ((updatedPlayers[idx].folded || updatedPlayers[idx].allIn || updatedPlayers[idx].chips === 0) && loopCount < updatedPlayers.length) {
      idx = (idx + 1) % updatedPlayers.length;
      loopCount++;
    }

    setActivePlayerIndex(idx);
    setPlayers(updatedPlayers);

    // If next is bot, trigger bot action
    if (updatedPlayers[idx].isBot && phase !== 'finished' && phase !== 'showdown') {
      setTimeout(() => {
        executeBotAction(updatedPlayers, idx);
      }, 700);
    }
  }, [currentBet, communityCards, deck, phase, nextPhase]);

  const executeBotAction = (currentPlayers: Player[], botIdx: number) => {
    const bot = currentPlayers[botIdx];
    const callAmount = currentBet - bot.bet;

    // Simple bot logic
    const rand = Math.random();
    let updated = [...currentPlayers];

    if (callAmount === 0) {
      // Check or bet
      if (rand > 0.7 && bot.chips >= BIG_BLIND) {
        const betAmt = BIG_BLIND;
        bot.chips -= betAmt;
        bot.bet += betAmt;
        setPot(p => p + betAmt);
        setCurrentBet(bot.bet);
        bot.statusText = 'Aposta';
        soundManager.playBet();
      } else {
        bot.statusText = 'Mesa';
      }
    } else {
      // Call, fold or raise
      if (rand < 0.15 && callAmount > BIG_BLIND * 2) {
        bot.folded = true;
        bot.statusText = 'Fold';
      } else if (rand > 0.85 && bot.chips > callAmount + BIG_BLIND) {
        const raiseAmt = callAmount + BIG_BLIND * 2;
        const actual = Math.min(bot.chips, raiseAmt);
        bot.chips -= actual;
        bot.bet += actual;
        setPot(p => p + actual);
        setCurrentBet(bot.bet);
        bot.statusText = 'Raise';
        soundManager.playBet();
      } else {
        const actual = Math.min(bot.chips, callAmount);
        bot.chips -= actual;
        bot.bet += actual;
        setPot(p => p + actual);
        bot.statusText = actual === bot.chips ? 'All-in' : 'Paga';
        if (bot.chips === 0) bot.allIn = true;
        soundManager.playBet();
      }
    }
    bot.actedInRound = true;
    advanceTurn(updated, botIdx + 1);
  };

  const handleUserAction = (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', customRaise?: number) => {
    const userPlayer = players[0];
    const callAmount = currentBet - userPlayer.bet;
    let updated = [...players];

    if (action === 'fold') {
      userPlayer.folded = true;
      userPlayer.statusText = 'Fold';
    } else if (action === 'check') {
      if (callAmount > 0) {
        toast.error('Você deve pagar a aposta para continuar.');
        return;
      }
      userPlayer.statusText = 'Mesa';
    } else if (action === 'call') {
      const actual = Math.min(userPlayer.chips, callAmount);
      userPlayer.chips -= actual;
      userPlayer.bet += actual;
      setPot(p => p + actual);
      userPlayer.statusText = userPlayer.chips === 0 ? 'All-in' : 'Paga';
      if (userPlayer.chips === 0) userPlayer.allIn = true;
      soundManager.playBet();
    } else if (action === 'raise') {
      const rAmt = customRaise || raiseAmount;
      const totalNeeded = rAmt - userPlayer.bet;
      if (totalNeeded > userPlayer.chips) {
        handleUserAction('allin');
        return;
      }
      userPlayer.chips -= totalNeeded;
      userPlayer.bet = rAmt;
      setPot(p => p + totalNeeded);
      setCurrentBet(rAmt);
      userPlayer.statusText = 'Raise';
      soundManager.playBet();
    } else if (action === 'allin') {
      const all = userPlayer.chips;
      userPlayer.chips = 0;
      userPlayer.bet += all;
      setPot(p => p + all);
      if (userPlayer.bet > currentBet) {
        setCurrentBet(userPlayer.bet);
      }
      userPlayer.allIn = true;
      userPlayer.statusText = 'All-in!';
      soundManager.playBet();
    }

    userPlayer.actedInRound = true;
    advanceTurn(updated, 1);
  };

  const userCallAmount = currentBet - players[0].bet;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="/games"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</a>
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Spade className="h-6 w-6 text-primary" /> Poker Texas Hold'em
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">NOVO</span>
              </h1>
              <p className="text-xs text-muted-foreground">Mesa oficial com blinds R$ {SMALL_BLIND}/R$ {BIG_BLIND}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleSound}>
              {muted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
            </Button>
            {inGame && (
              <Button variant="destructive" size="sm" onClick={leaveTable}>
                Sair da Mesa
              </Button>
            )}
          </div>
        </div>

        {!inGame ? (
          <Card className="card-gradient border-border text-center py-12">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold">Entre na Mesa de Poker</CardTitle>
              <CardDescription className="text-base">
                Buy-in fixo: <span className="text-primary font-bold">R$ 500</span> (50x Big Blind). Jogue contra bots astutos e leve o pote!
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-lg border border-border">
                <DollarSign className="w-4 h-4 text-primary" /> Seu Saldo: <span className="font-bold text-foreground">{formatBRLShort(user?.balance || 0)}</span>
              </div>
              <Button onClick={startBuyIn} size="lg" className="glow-primary font-bold text-lg px-8 py-6">
                Sentar à Mesa (R$ 500)
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Felt Table */
          <div className="relative rounded-3xl bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 border-8 border-amber-950/80 shadow-2xl p-6 sm:p-10 min-h-[580px] flex flex-col items-center justify-between">
            {/* Table Header Info */}
            <div className="absolute top-4 left-6 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs text-white/90 font-medium">
              Fase: <span className="text-primary uppercase font-bold">{phase}</span>
            </div>
            <div className="absolute top-4 right-6 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs text-white/90 font-medium flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" /> Pote: <span className="text-amber-400 font-bold text-sm">{formatBRLShort(pot)}</span>
            </div>

            {/* Bots / Seats Around */}
            <div className="w-full flex justify-around items-center pt-6">
              {players.slice(1).map((bot, idx) => {
                const actualIdx = idx + 1;
                const isActive = activePlayerIndex === actualIdx;
                return (
                  <div key={bot.id} className={`flex flex-col items-center transition-all ${isActive ? 'scale-105' : 'opacity-90'}`}>
                    <div className="flex gap-1 mb-1">
                      <CardView card={bot.hand[0] || { suit: '♠', value: '2', hidden: phase !== 'showdown' }} size="sm" />
                      <CardView card={bot.hand[1] || { suit: '♠', value: '2', hidden: phase !== 'showdown' }} size="sm" />
                    </div>
                    <div className={`px-3 py-1 rounded-xl border text-xs font-bold shadow-md ${bot.folded ? 'bg-destructive/30 border-destructive/50 text-destructive-foreground' : isActive ? 'bg-primary border-primary-foreground text-primary-foreground animate-pulse' : 'bg-card/90 border-border text-foreground'}`}>
                      {bot.name} {bot.chips === 0 ? '(All-in)' : `(${formatBRLShort(bot.chips)})`}
                    </div>
                    {bot.statusText && (
                      <span className="text-[10px] text-amber-300 font-semibold mt-0.5 bg-black/50 px-2 rounded">{bot.statusText}</span>
                    )}
                    {bot.bet > 0 && (
                      <span className="text-xs text-emerald-300 font-bold mt-1">Aposta: {formatBRLShort(bot.bet)}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Center Community Cards & Pot */}
            <div className="flex flex-col items-center justify-center my-6 bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-4 sm:p-6 shadow-inner w-full max-w-lg">
              <div className="text-xs uppercase tracking-wider text-emerald-200/80 mb-2 font-semibold">
                Cartas Comunitárias • Pote: <span className="text-amber-400 font-bold">{formatBRLShort(pot)}</span>
              </div>
              <div className="flex gap-2 min-h-[70px] items-center justify-center">
                {communityCards.length > 0 ? (
                  communityCards.map((c, i) => <CardView key={i} card={c} />)
                ) : (
                  <span className="text-emerald-300/50 text-sm italic">Aguardando Flop...</span>
                )}
              </div>
              {message && (
                <div className="mt-3 text-xs sm:text-sm font-bold text-amber-200 bg-black/40 px-3 py-1 rounded-full">
                  {message}
                </div>
              )}
            </div>

            {/* User Seat (Bottom) */}
            <div className="w-full flex flex-col items-center pb-2">
              {showdownResult && (
                <div className="mb-3 bg-amber-500/20 border border-amber-500 text-amber-200 px-4 py-2 rounded-xl text-sm font-bold text-center animate-bounce">
                  {showdownResult}
                </div>
              )}

              <div className="flex items-center gap-4 mb-2">
                <div className="flex gap-2">
                  {players[0].hand.map((c, i) => <CardView key={i} card={c} />)}
                </div>
                <div className="flex flex-col text-left bg-card/90 border border-border px-4 py-2 rounded-xl shadow-lg">
                  <span className="text-sm font-bold">{players[0].name}</span>
                  <span className="text-xs text-muted-foreground">Fichas: <span className="text-primary font-bold">{formatBRLShort(players[0].chips)}</span></span>
                  {players[0].bet > 0 && <span className="text-xs text-emerald-400 font-semibold">Mesa: {formatBRLShort(players[0].bet)}</span>}
                </div>
              </div>

              {/* Action Bar */}
              {phase !== 'finished' && phase !== 'showdown' && activePlayerIndex === 0 && !players[0].folded && !players[0].allIn && (
                <div className="w-full max-w-xl bg-card/95 border border-border p-4 rounded-2xl shadow-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Aposta Atual: <strong className="text-foreground">{formatBRLShort(currentBet)}</strong></span>
                    <span>Para pagar: <strong className="text-primary">{formatBRLShort(userCallAmount)}</strong></span>
                  </div>

                  {/* Raise slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Raise: R$ {raiseAmount}</span>
                      <span>Max: R$ {players[0].chips}</span>
                    </div>
                    <Slider
                      value={[raiseAmount]}
                      min={currentBet + BIG_BLIND}
                      max={Math.max(currentBet + BIG_BLIND, players[0].chips)}
                      step={BIG_BLIND}
                      onValueChange={(val) => setRaiseAmount(val[0])}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleUserAction('fold')}
                      className="font-bold"
                    >
                      Desistir (Fold)
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleUserAction(userCallAmount === 0 ? 'check' : 'call')}
                      className="font-bold"
                    >
                      {userCallAmount === 0 ? 'Mesa (Check)' : `Pagar (${formatBRLShort(userCallAmount)})`}
                    </Button>
                    <Button
                      onClick={() => handleUserAction('raise', raiseAmount)}
                      className="bg-primary hover:bg-primary/90 font-bold"
                    >
                      Aumentar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUserAction('raise', Math.floor(pot / 2))}
                      className="font-bold text-xs"
                    >
                      ½ Pote
                    </Button>
                    <Button
                      onClick={() => handleUserAction('allin')}
                      className="bg-amber-600 hover:bg-amber-700 font-bold text-white col-span-2 sm:col-span-1"
                    >
                      All-in!
                    </Button>
                  </div>
                </div>
              )}

              {phase === 'finished' && (
                <Button
                  onClick={() => startNewHand(dealerIndex + 1)}
                  size="lg"
                  className="glow-primary font-bold text-lg px-8 py-6 mt-2"
                >
                  <RefreshCcw className="w-5 h-5 mr-2" /> Próxima Mão
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Poker;
