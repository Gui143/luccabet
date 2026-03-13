import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type BetChoice = 'player' | 'banker' | 'tie' | null;
type GameState = 'betting' | 'dealing' | 'result';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface PlayingCard {
  suit: string;
  rank: string;
  value: number;
}

const getCardValue = (rank: string): number => {
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
  if (rank === 'A') return 1;
  return parseInt(rank);
};

const randomCard = (): PlayingCard => {
  const suit = SUITS[Math.floor(Math.random() * 4)];
  const rank = RANKS[Math.floor(Math.random() * 13)];
  return { suit, rank, value: getCardValue(rank) };
};

const handTotal = (cards: PlayingCard[]): number => {
  return cards.reduce((sum, c) => sum + c.value, 0) % 10;
};

const CHIP_VALUES = [5, 10, 25, 50, 100];
const PAYOUTS: Record<string, number> = { player: 2, banker: 1.95, tie: 8 };

const CardDisplay: React.FC<{ card: PlayingCard; delay: number }> = ({ card, delay }) => {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div
      className="w-14 h-20 sm:w-16 sm:h-24 rounded-lg bg-card border-2 border-border flex flex-col items-center justify-center shadow-lg animate-in slide-in-from-top-4 fade-in"
      style={{ animationDelay: `${delay}ms`, animationDuration: '400ms', animationFillMode: 'both' }}
    >
      <span className={`text-lg sm:text-xl font-bold ${isRed ? 'text-destructive' : 'text-foreground'}`}>
        {card.rank}
      </span>
      <span className={`text-lg ${isRed ? 'text-destructive' : 'text-foreground'}`}>
        {card.suit}
      </span>
    </div>
  );
};

const Baccarat: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const [betAmount, setBetAmount] = useState(10);
  const [betChoice, setBetChoice] = useState<BetChoice>(null);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [playerCards, setPlayerCards] = useState<PlayingCard[]>([]);
  const [bankerCards, setBankerCards] = useState<PlayingCard[]>([]);
  const [winner, setWinner] = useState<string>('');

  const placeBet = useCallback((choice: BetChoice) => {
    if (gameState !== 'betting' || !choice) return;
    if (betAmount <= 0 || betAmount > (user?.balance || 0)) {
      toast.error('Saldo insuficiente');
      return;
    }
    setBetChoice(choice);
  }, [gameState, betAmount, user]);

  const deal = useCallback(async () => {
    if (!betChoice || gameState !== 'betting') return;
    if (betAmount > (user?.balance || 0)) {
      toast.error('Saldo insuficiente');
      return;
    }

    await updateBalance(-betAmount);
    setGameState('dealing');

    // Deal initial 2 cards each
    const pCards = [randomCard(), randomCard()];
    const bCards = [randomCard(), randomCard()];

    setPlayerCards(pCards);
    setBankerCards(bCards);

    // Baccarat third card rules (simplified)
    setTimeout(() => {
      let pTotal = handTotal(pCards);
      let bTotal = handTotal(bCards);

      // Natural - no more cards
      if (pTotal >= 8 || bTotal >= 8) {
        finishRound(pCards, bCards);
        return;
      }

      // Player draws on 0-5
      let playerDrew: PlayingCard | null = null;
      if (pTotal <= 5) {
        playerDrew = randomCard();
        pCards.push(playerDrew);
        setPlayerCards([...pCards]);
      }

      // Banker rules
      setTimeout(() => {
        bTotal = handTotal(bCards);
        if (!playerDrew) {
          // Player stood, banker draws on 0-5
          if (bTotal <= 5) {
            bCards.push(randomCard());
            setBankerCards([...bCards]);
          }
        } else {
          // Banker draws based on player's third card
          const p3v = playerDrew.value;
          let bankerDraws = false;
          if (bTotal <= 2) bankerDraws = true;
          else if (bTotal === 3 && p3v !== 8) bankerDraws = true;
          else if (bTotal === 4 && [2, 3, 4, 5, 6, 7].includes(p3v)) bankerDraws = true;
          else if (bTotal === 5 && [4, 5, 6, 7].includes(p3v)) bankerDraws = true;
          else if (bTotal === 6 && [6, 7].includes(p3v)) bankerDraws = true;

          if (bankerDraws) {
            bCards.push(randomCard());
            setBankerCards([...bCards]);
          }
        }

        setTimeout(() => finishRound(pCards, bCards), 800);
      }, 600);
    }, 1200);
  }, [betChoice, betAmount, user, gameState]);

  const finishRound = async (pCards: PlayingCard[], bCards: PlayingCard[]) => {
    const pTotal = handTotal(pCards);
    const bTotal = handTotal(bCards);

    let result: string;
    if (pTotal > bTotal) result = 'player';
    else if (bTotal > pTotal) result = 'banker';
    else result = 'tie';

    setWinner(result);
    setGameState('result');

    const won = result === betChoice;
    if (won) {
      const payout = betAmount * PAYOUTS[betChoice!];
      await updateBalance(payout);
      addBet({ game: 'Baccarat', amount: betAmount, odds: PAYOUTS[betChoice!], result: 'win', profit: payout - betAmount });
      toast.success(`🎉 Você ganhou ${formatBRLShort(payout)}!`);

      if (user) {
        await supabase.from('game_wins').insert({
          user_id: user.id,
          game_name: 'Baccarat',
          bet_amount: betAmount,
          multiplier: PAYOUTS[betChoice!],
          win_amount: payout,
        }).then(() => {});
      }
    } else {
      addBet({ game: 'Baccarat', amount: betAmount, odds: PAYOUTS[betChoice!], result: 'loss', profit: -betAmount });
      toast.error(`Perdeu! ${result === 'tie' ? 'Empate' : result === 'player' ? 'Jogador' : 'Banqueiro'} ganhou.`);
    }
  };

  const newRound = () => {
    setGameState('betting');
    setBetChoice(null);
    setPlayerCards([]);
    setBankerCards([]);
    setWinner('');
  };

  const choiceLabel = (c: string) => c === 'player' ? 'Jogador' : c === 'banker' ? 'Banqueiro' : 'Empate';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className="card-gradient border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              🃏 Baccarat do Macedo
            </CardTitle>
            <CardDescription>Aposte no Jogador, Banqueiro ou Empate. A mão mais perto de 9 vence!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Table */}
            <div className="relative bg-[hsl(var(--primary)/0.15)] border-2 border-primary/30 rounded-2xl p-6 min-h-[280px]">
              {/* Banker area */}
              <div className="text-center mb-6">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Banqueiro</span>
                <div className="flex justify-center gap-2 mt-2 min-h-[96px] items-center">
                  {bankerCards.length > 0 ? (
                    bankerCards.map((c, i) => <CardDisplay key={i} card={c} delay={i * 300 + 300} />)
                  ) : (
                    <div className="w-14 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30" />
                  )}
                </div>
                {bankerCards.length > 0 && (
                  <div className="mt-1 text-lg font-bold text-foreground">{handTotal(bankerCards)}</div>
                )}
              </div>

              {/* VS divider */}
              <div className="flex items-center justify-center my-2">
                <div className="h-px flex-1 bg-primary/20" />
                <span className="px-4 text-sm font-bold text-primary">VS</span>
                <div className="h-px flex-1 bg-primary/20" />
              </div>

              {/* Player area */}
              <div className="text-center mt-6">
                <div className="flex justify-center gap-2 min-h-[96px] items-center">
                  {playerCards.length > 0 ? (
                    playerCards.map((c, i) => <CardDisplay key={i} card={c} delay={i * 300} />)
                  ) : (
                    <div className="w-14 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30" />
                  )}
                </div>
                {playerCards.length > 0 && (
                  <div className="mt-1 text-lg font-bold text-foreground">{handTotal(playerCards)}</div>
                )}
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Jogador</span>
              </div>

              {/* Result overlay */}
              {gameState === 'result' && (
                <div className="absolute inset-0 bg-background/70 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center space-y-2">
                    <div className={`text-3xl font-black ${winner === betChoice ? 'text-primary' : 'text-destructive'}`}>
                      {winner === betChoice ? '🎉 VOCÊ GANHOU!' : '💔 PERDEU'}
                    </div>
                    <div className="text-lg text-muted-foreground">
                      {choiceLabel(winner)} venceu ({handTotal(winner === 'player' ? playerCards : bankerCards)} pontos)
                    </div>
                    <Button onClick={newRound} className="mt-4 glow-primary">Nova Rodada</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Chips */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ficha selecionada</span>
                <span className="text-lg font-bold text-primary">{formatBRLShort(betAmount)}</span>
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                {CHIP_VALUES.map(v => (
                  <button
                    key={v}
                    onClick={() => setBetAmount(v)}
                    className={`w-12 h-12 rounded-full border-2 font-bold text-sm transition-all ${
                      betAmount === v
                        ? 'border-primary bg-primary text-primary-foreground scale-110 shadow-lg'
                        : 'border-border bg-card text-foreground hover:border-primary/50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Betting areas */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => gameState === 'betting' ? placeBet('player') : null}
                disabled={gameState !== 'betting'}
                variant={betChoice === 'player' ? 'default' : 'outline'}
                className={`h-20 flex flex-col gap-1 ${betChoice === 'player' ? 'ring-2 ring-primary glow-primary' : ''}`}
              >
                <span className="text-lg font-bold">Jogador</span>
                <span className="text-xs text-muted-foreground">2.00x</span>
              </Button>
              <Button
                onClick={() => gameState === 'betting' ? placeBet('tie') : null}
                disabled={gameState !== 'betting'}
                variant={betChoice === 'tie' ? 'default' : 'outline'}
                className={`h-20 flex flex-col gap-1 ${betChoice === 'tie' ? 'ring-2 ring-accent' : ''}`}
              >
                <span className="text-lg font-bold">Empate</span>
                <span className="text-xs text-muted-foreground">8.00x</span>
              </Button>
              <Button
                onClick={() => gameState === 'betting' ? placeBet('banker') : null}
                disabled={gameState !== 'betting'}
                variant={betChoice === 'banker' ? 'default' : 'outline'}
                className={`h-20 flex flex-col gap-1 ${betChoice === 'banker' ? 'ring-2 ring-primary glow-primary' : ''}`}
              >
                <span className="text-lg font-bold">Banqueiro</span>
                <span className="text-xs text-muted-foreground">1.95x</span>
              </Button>
            </div>

            {/* Deal button */}
            {gameState === 'betting' && betChoice && (
              <Button onClick={deal} className="w-full h-12 text-lg font-bold glow-primary">
                Distribuir Cartas
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Baccarat;
