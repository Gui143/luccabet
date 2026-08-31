/**
 * Liga o Aviator ao transporte (servidor local / Lovable Cloud / offline).
 * A rodada, o crash point e os prêmios são resolvidos no servidor — aqui só
 * renderizamos o que ele manda. Nenhum jogador falso é criado no cliente.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ensureGameClient, getBackendMode } from '@/lib/net';
import type { AviatorView, GameClient, Unsubscribe } from '@/lib/net/types';
import { recordGameOutcome } from '@/lib/gameOutcomes';
import { soundManager } from '@/lib/soundManager';

export function useAviator() {
  const { user, syncBalance, addBet } = useAuth();
  const [client, setClient] = useState<GameClient | null>(null);
  const [snapshot, setSnapshot] = useState<AviatorView | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [mode, setMode] = useState(getBackendMode());
  const lastRound = useRef(0);
  const lastPhase = useRef<string>('waiting');

  useEffect(() => {
    let alive = true;
    const unsubs: Unsubscribe[] = [];

    (async () => {
      const c = await ensureGameClient();
      if (!alive) return;
      setClient(c);
      setMode(c.mode);
      setStatus('open');

      unsubs.push(c.onStatus(setStatus));
      unsubs.push(c.onWallet((balance) => syncBalance(balance)));
      unsubs.push(c.onError((message) => toast.error(message)));

      unsubs.push(
        c.onAviatorEvent((e) => {
          if (e.type === 'cashed') {
            soundManager.playCashout();
            const p = e.payload ?? {};
            toast.success(`Sacou ${(p.multiplier ?? 1).toFixed(2)}x • ${(p.win ?? 0).toFixed(2)}`);
            addBet({
              game: 'Aviator',
              amount: p.amount ?? 0,
              odds: p.multiplier ?? 1,
              result: 'win',
              profit: (p.win ?? 0) - (p.amount ?? 0),
            });
            void recordGameOutcome({
              userId: user?.id,
              gameName: 'Aviator',
              betAmount: p.amount ?? 0,
              multiplier: p.multiplier ?? 1,
              winAmount: p.win ?? 0,
            });
          }
          if (e.type === 'lost') {
            soundManager.playCrash();
            const p = e.payload ?? {};
            addBet({ game: 'Aviator', amount: p.amount ?? 0, odds: 0, result: 'loss', profit: -(p.amount ?? 0) });
            void recordGameOutcome({
              userId: user?.id,
              gameName: 'Aviator',
              betAmount: p.amount ?? 0,
              multiplier: 0,
              winAmount: 0,
            });
          }
        }),
      );

      unsubs.push(
        c.onAviatorState((snap) => {
          setSnapshot(snap);
          if (snap.phase !== lastPhase.current) {
            if (snap.phase === 'flying') soundManager.playFly();
            lastPhase.current = snap.phase;
          }
          if (snap.roundId !== lastRound.current) lastRound.current = snap.roundId;
        }),
      );

      c.aviator.join();
    })();

    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
  }, [user?.id, syncBalance, addBet]);

  const bet = useCallback((amount: number, auto?: number | null) => client?.aviator.bet(amount, auto), [client]);
  const cancel = useCallback(() => client?.aviator.cancel(), [client]);
  const cashout = useCallback(() => client?.aviator.cashout(), [client]);

  const myBet = snapshot?.bets.find((b) => b.you) ?? null;

  return { mode, status, snapshot, myBet, bet, cancel, cashout };
}
