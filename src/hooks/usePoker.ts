/**
 * Liga a mesa de poker ao transporte (servidor local / Lovable Cloud / offline).
 * Toda a regra de jogo roda no servidor — aqui só estado de tela.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ensureGameClient, getBackendMode } from '@/lib/net';
import type { GameClient, PokerTableInfo, PokerView, Unsubscribe } from '@/lib/net/types';
import type { ActionType } from '@/games/poker/engine';
import { recordGameOutcome } from '@/lib/gameOutcomes';
import { soundManager } from '@/lib/soundManager';

export const DEFAULT_TABLE_ID = 'texas-2-5';

export function usePoker(initialTableId: string = DEFAULT_TABLE_ID) {
  const { user, syncBalance } = useAuth();
  const [client, setClient] = useState<GameClient | null>(null);
  const [tableId, setTableId] = useState(initialTableId);
  const [view, setView] = useState<PokerView | null>(null);
  const [tables, setTables] = useState<PokerTableInfo[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [mode, setMode] = useState(getBackendMode());

  const lastHandNo = useRef(0);
  const lastPhase = useRef<string>('idle');

  // ------------------------------------------------------------ conexão
  useEffect(() => {
    let alive = true;
    const unsubs: Unsubscribe[] = [];

    (async () => {
      const c = await ensureGameClient();
      if (!alive) return;
      setClient(c);
      setMode(c.mode);
      setStatus('open');

      try {
        const list = await c.tables();
        if (alive && list.length) setTables(list);
      } catch {
        /* segue com a mesa padrão */
      }

      unsubs.push(c.onStatus(setStatus));
      unsubs.push(c.onWallet((balance) => syncBalance(balance)));
      unsubs.push(c.onError((message) => toast.error(message)));
      unsubs.push(
        c.onPokerState((v) => {
          if (v.tableId !== tableId) return;
          const serverTime = (v as { serverTime?: number }).serverTime;
          if (serverTime) clockOffset.current = serverTime - Date.now();
          setView(v);

          // efeitos sonoros + registro da mão encerrada
          const st = v.state;
          if (st.phase !== lastPhase.current) {
            if (st.phase === 'flop' || st.phase === 'turn' || st.phase === 'river') soundManager.playBet();
            lastPhase.current = st.phase;
          }
          if (st.phase === 'finished' && st.handNo !== lastHandNo.current) {
            lastHandNo.current = st.handNo;
            const me = st.seats[v.you.seat];
            const won = (st.winners ?? []).filter((w) => w.playerId === user?.id).reduce((a, w) => a + w.amount, 0);
            if (me && (me.committed > 0 || won > 0)) {
              soundManager.playWin();
              if (won > 0) toast.success(`Você ganhou R$ ${won.toFixed(2).replace('.', ',')}!`);
              void recordGameOutcome({
                userId: user?.id,
                gameName: 'Poker',
                betAmount: me.committed,
                multiplier: me.committed > 0 ? won / me.committed : 0,
                winAmount: won,
              });
            }
          }
        }),
      );

    })();

    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
  }, [tableId, user?.id, syncBalance]);

  // re-entrar na mesa quando trocar de mesa
  useEffect(() => {
    if (!client) return;
    setView(null);
    client.poker.join(tableId);
  }, [client, tableId]);

  const mySeat = view?.you?.seat ?? -1;

  const sit = useCallback(
    (seat: number, buyIn: number) => {
      client?.poker.join(tableId, { seat, buyIn });
    },
    [client, tableId],
  );

  const leave = useCallback(() => {
    client?.poker.leave(tableId);
  }, [client, tableId]);

  const act = useCallback(
    (action: ActionType, amount?: number) => {
      client?.poker.action(tableId, action, amount);
    },
    [client, tableId],
  );

  const setBots = useCallback(
    (enabled: boolean) => {
      client?.poker.setBots(tableId, enabled);
    },
    [client, tableId],
  );

  const start = useCallback(() => {
    client?.poker.start(tableId);
  }, [client, tableId]);

  const refreshTables = useCallback(async () => {
    if (!client) return;
    try {
      const list = await client.tables();
      if (list.length) setTables(list);
    } catch {
      /* silencioso */
    }
  }, [client]);

  /** relógio do servidor (para o cronômetro da vez não depender do relógio local) */
  const clockOffset = useRef(0);
  const serverNow = useCallback(() => Date.now() + clockOffset.current, []);

  const state = view?.state ?? null;

  const my = useMemo(() => (mySeat >= 0 && state ? state.seats[mySeat] : null), [mySeat, state]);

  return {
    mode,
    status,
    client,
    tableId,
    setTableId,
    tables,
    refreshTables,
    view,
    state,
    mySeat,
    my,
    sit,
    leave,
    act,
    setBots,
    start,
    serverNow,
    clockOffset,
    isMyTurn: !!state && state.turnSeat === mySeat && mySeat >= 0,
  };
}
