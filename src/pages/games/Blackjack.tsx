import React, { useState, useCallback, useRef } from 'react';
import { Spade } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { shouldPlayerWin } from '@/lib/gameOdds';
import { recordGameOutcome } from '@/lib/gameOutcomes';
import { toast } from 'sonner';

type Suit = '♠' | '♥' | '♦' | '♣';
type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface PlayingCard { suit: Suit; value: CardValue; hidden?: boolean; }

type GameState = 'betting' | 'playing' | 'dealer_turn' | 'finished';
type Result = 'win' | 'loss' | 'push' | 'blackjack';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const VALUES: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) for (const value of VALUES) deck.push({ suit, value });
  // Use 6 decks
  const multi = [...deck, ...deck, ...deck, ...deck, ...deck, ...deck];
  for (let i = multi.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [multi[i], multi[j]] = [multi[j], multi[i]];
  }
  return multi;
}

function cardNumericValue(card: PlayingCard): number {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}

function handValue(hand: PlayingCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.hidden) continue;
    total += cardNumericValue(c);
    if (c.value === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isBlackjack(hand: PlayingCard[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

const isRed = (suit: Suit) => suit === '♥' || suit === '♦';

const CardComponent: React.FC<{ card: PlayingCard; index: number; dealing?: boolean }> = ({ card, index, dealing }) => {
  if (card.hidden) {
    return (
      <div
        className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-border bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center shadow-lg transition-all duration-500"
        style={{ animationDelay: `${index * 150}ms`, transform: dealing ? 'translateY(-20px)' : 'translateY(0)', opacity: dealing ? 0 : 1, transition: 'all 0.4s ease' }}
      >
        <span className="text-2xl sm:text-3xl font-bold text-primary-foreground/50">?</span>
      </div>
    );
  }

  return (
    <div
      className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-border bg-card flex flex-col items-center justify-between p-1.5 sm:p-2 shadow-lg hover:shadow-primary/20 transition-all duration-500"
      style={{ animationDelay: `${index * 150}ms`, transform: dealing ? 'translateY(-20px)' : 'translateY(0)', opacity: dealing ? 0 : 1, transition: 'all 0.4s ease' }}
    >
      <div className={`text-xs sm:text-sm font-bold self-start ${isRed(card.suit) ? 'text-destructive' : 'text-foreground'}`}>
        {card.value}
      </div>
      <div className={`text-xl sm:text-2xl ${isRed(card.suit) ? 'text-destructive' : 'text-foreground'}`}>
        {card.suit}
      </div>
      <div className={`text-xs sm:text-sm font-bold self-end rotate-180 ${isRed(card.suit) ? 'text-destructive' : 'text-foreground'}`}>
        {card.value}
      </div>
    </div>
  );
};

const Blackjack: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [gameState, setGameState] = useState<GameState>('betting');
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState('');
  // Percentual de ganho definido no painel admin
  const favorRef = useRef(false);

  const finishGame = (res: Result, pHand: PlayingCard[], dHand: PlayingCard[], amt: number) => {
    setResult(res);
    setGameState('finished');

    let profit = 0;
    let payout = 0;
    let msg = '';
    switch (res) {
      case 'blackjack':
        profit = amt * 1.5;
        payout = amt + profit;
        updateBalance(payout);
        msg = `Blackjack! Você ganhou ${formatBRLShort(profit)}!`;
        toast.success(msg);
        break;
      case 'win':
        profit = amt;
        payout = amt * 2;
        updateBalance(payout);
        msg = `Você venceu! +${formatBRLShort(profit)}`;
        toast.success(msg);
        break;
      case 'push':
        payout = amt;
        updateBalance(amt);
        msg = 'Empate! Aposta devolvida.';
        toast.info(msg);
        break;
      case 'loss':
        profit = -amt;
        msg = `Você perdeu ${formatBRLShort(amt)}`;
        toast.error(msg);
        break;
    }
    setMessage(msg);
    addBet({
      game: 'Blackjack',
      amount: amt,
      odds: res === 'blackjack' ? 2.5 : res === 'win' ? 2 : res === 'push' ? 1 : 0,
      result: res === 'loss' ? 'loss' : 'win',
      profit,
    });
    recordGameOutcome({
      userId: user?.id,
      gameName: 'Blackjack',
      betAmount: amt,
      multiplier: res === 'blackjack' ? 2.5 : res === 'win' ? 2 : res === 'push' ? 1 : 0,
      winAmount: payout,
    });
  };

  const draw = useCallback((currentDeck: PlayingCard[], count: number): [PlayingCard[], PlayingCard[]] => {
    const cards = currentDeck.slice(0, count);
    const remaining = currentDeck.slice(count);
    return [cards, remaining];
  }, []);

  const startGame = async () => {
    const amt = parseFloat(betAmount);
    if (isNaN(amt) || amt <= 0) { toast.error('Valor inválido'); return; }
    if (amt > (user?.balance || 0)) { toast.error('Saldo insuficiente'); return; }

    // Percentual de ganho definido no painel admin
    favorRef.current = await shouldPlayerWin('blackjack');

    updateBalance(-amt);
    const newDeck = createDeck();
    const [initial, remaining] = draw(newDeck, 4);
    const pHand: PlayingCard[] = [initial[0], initial[2]];
    const dHand: PlayingCard[] = [initial[1], { ...initial[3], hidden: true }];

    setDeck(remaining);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setResult(null);
    setMessage('');
    setGameState('playing');

    // Check for natural blackjack
    if (isBlackjack(pHand)) {
      const revealedDealer: PlayingCard[] = dHand.map(c => ({ ...c, hidden: false }));
      setDealerHand(revealedDealer);
      if (isBlackjack(revealedDealer)) {
        finishGame('push', pHand, revealedDealer, amt);
      } else {
        finishGame('blackjack', pHand, revealedDealer, amt);
      }
    }
  };

  const hit = () => {
    const [cards, remaining] = draw(deck, 1);
    const newHand = [...playerHand, cards[0]];
    setPlayerHand(newHand);
    setDeck(remaining);

    if (handValue(newHand) > 21) {
      const revealedDealer: PlayingCard[] = dealerHand.map(c => ({ ...c, hidden: false }));
      setDealerHand(revealedDealer);
      finishGame('loss', newHand, revealedDealer, parseFloat(betAmount));
    }
  };

  const stand = () => {
    setGameState('dealer_turn');
    const revealedDealer: PlayingCard[] = dealerHand.map(c => ({ ...c, hidden: false }));
    let currentDeck = [...deck];
    let dHand = [...revealedDealer];

    const dealerPlay = () => {
      const pVal = handValue(playerHand);
      // Regra ajustada pela % de ganho do painel:
      // favorece jogador → dealer para mais cedo/estoura; casa → dealer joga forte
      const dealerMustHit = (val: number) => {
        if (favorRef.current) return val < 16;
        if (pVal > 17) return val < pVal;
        return val < 17;
      };
      let dealerVal = handValue(dHand);
      const dealCards = () => {
        if (dealerMustHit(dealerVal)) {
          const [cards, remaining] = draw(currentDeck, 1);
          dHand = [...dHand, cards[0]];
          currentDeck = remaining;
          dealerVal = handValue(dHand);
          setDealerHand([...dHand]);
          setDeck([...currentDeck]);
          setTimeout(dealCards, 600);
        } else {
          // Determine winner
          const playerVal = handValue(playerHand);
          const amt = parseFloat(betAmount);
          if (dealerVal > 21) finishGame('win', playerHand, dHand, amt);
          else if (playerVal > dealerVal) finishGame('win', playerHand, dHand, amt);
          else if (playerVal < dealerVal) finishGame('loss', playerHand, dHand, amt);
          else finishGame('push', playerHand, dHand, amt);
        }
      };
      dealCards();
    };

    setDealerHand(revealedDealer);
    setTimeout(dealerPlay, 400);
  };

  const doubleDown = () => {
    const amt = parseFloat(betAmount);
    if (amt > (user?.balance || 0)) { toast.error('Saldo insuficiente para dobrar'); return; }
    updateBalance(-amt);
    setBetAmount((amt * 2).toString());

    const [cards, remaining] = draw(deck, 1);
    const newHand = [...playerHand, cards[0]];
    setPlayerHand(newHand);
    setDeck(remaining);

    if (handValue(newHand) > 21) {
      const revealedDealer: PlayingCard[] = dealerHand.map(c => ({ ...c, hidden: false }));
      setDealerHand(revealedDealer);
      finishGame('loss', newHand, revealedDealer, amt * 2);
    } else {
      // Auto-stand after double
      setGameState('dealer_turn');
      const revealedDealer: PlayingCard[] = dealerHand.map(c => ({ ...c, hidden: false }));
      let currentDeck = [...remaining];
      let dHand = [...revealedDealer];

      setDealerHand(revealedDealer);
      setTimeout(() => {
        const pVal = handValue(newHand);
        const dealerMustHit = (val: number) => {
          if (favorRef.current) return val < 16;
          if (pVal > 17) return val < pVal;
          return val < 17;
        };
        const dealCards = () => {
          const dealerVal = handValue(dHand);
          if (dealerMustHit(dealerVal)) {
            const [newCards, rem] = draw(currentDeck, 1);
            dHand = [...dHand, newCards[0]];
            currentDeck = rem;
            setDealerHand([...dHand]);
            setDeck([...currentDeck]);
            setTimeout(dealCards, 600);
          } else {
            if (dealerVal > 21) finishGame('win', newHand, dHand, amt * 2);
            else if (pVal > dealerVal) finishGame('win', newHand, dHand, amt * 2);
            else if (pVal < dealerVal) finishGame('loss', newHand, dHand, amt * 2);
            else finishGame('push', newHand, dHand, amt * 2);
          }
        };
        dealCards();
      }, 400);
    }
  };

  const playerVal = handValue(playerHand);
  const dealerVal = handValue(dealerHand);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="card-gradient border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Spade className="h-6 w-6 text-primary" />
              Blackjack
              <span className="text-xs font-normal bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">NOVO</span>
            </CardTitle>
            <CardDescription>Chegue o mais perto de 21 sem estourar!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dealer area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Dealer</span>
                <span className="text-sm font-bold text-foreground">{gameState !== 'betting' ? dealerVal : '-'}</span>
              </div>
              <div className="flex gap-2 flex-wrap min-h-[112px] items-center justify-center bg-muted/30 rounded-lg p-4 border border-border">
                {dealerHand.length > 0 ? dealerHand.map((card, i) => (
                  <CardComponent key={i} card={card} index={i} />
                )) : (
                  <span className="text-muted-foreground text-sm">Cartas do dealer aparecerão aqui</span>
                )}
              </div>
            </div>

            {/* Result message */}
            {message && (
              <div className={`text-center py-3 rounded-lg text-lg font-bold ${
                result === 'win' || result === 'blackjack' ? 'bg-success/20 text-success' :
                result === 'loss' ? 'bg-destructive/20 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                {message}
              </div>
            )}

            {/* Player area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Suas Cartas</span>
                <span className={`text-sm font-bold ${playerVal > 21 ? 'text-destructive' : 'text-foreground'}`}>
                  {gameState !== 'betting' ? playerVal : '-'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap min-h-[112px] items-center justify-center bg-muted/30 rounded-lg p-4 border border-border">
                {playerHand.length > 0 ? playerHand.map((card, i) => (
                  <CardComponent key={i} card={card} index={i} />
                )) : (
                  <span className="text-muted-foreground text-sm">Suas cartas aparecerão aqui</span>
                )}
              </div>
            </div>

            {/* Controls */}
            {gameState === 'betting' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Valor da Aposta (R$)</label>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="bg-input"
                    min="1"
                  />
                </div>
                <div className="flex gap-2">
                  {[5, 10, 25, 50, 100].map(v => (
                    <Button key={v} onClick={() => setBetAmount(v.toString())} variant="outline" size="sm" className="flex-1">{v}</Button>
                  ))}
                </div>
                <Button onClick={startGame} className="w-full glow-primary text-lg font-bold h-12">
                  Distribuir Cartas
                </Button>
              </div>
            )}

            {gameState === 'playing' && (
              <div className="grid grid-cols-3 gap-3">
                <Button onClick={hit} className="bg-success hover:bg-success/90 text-success-foreground font-bold h-12">
                  Comprar
                </Button>
                <Button onClick={stand} variant="secondary" className="font-bold h-12">
                  Parar
                </Button>
                <Button onClick={doubleDown} className="bg-primary hover:bg-primary/90 font-bold h-12" disabled={playerHand.length !== 2}>
                  Dobrar
                </Button>
              </div>
            )}

            {gameState === 'dealer_turn' && (
              <div className="text-center py-3 text-muted-foreground animate-pulse font-semibold">
                Vez do Dealer...
              </div>
            )}

            {gameState === 'finished' && (
              <Button onClick={() => { setGameState('betting'); setPlayerHand([]); setDealerHand([]); setResult(null); setMessage(''); }} className="w-full glow-primary text-lg font-bold h-12">
                Jogar Novamente
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Blackjack;
