import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { usePoker, DEFAULT_TABLE_ID } from '@/hooks/usePoker';
import { legalActions } from '@/games/poker/engine';
import { formatBRLShort } from '@/lib/formatCurrency';
import { soundManager } from '@/lib/soundManager';
import type { PokerTableInfo } from '@/lib/net/types';
import { toast } from 'sonner';

import LuxuryPokerTable, { type TableTheme } from '@/components/poker/LuxuryPokerTable';
import PokerBetConsole from '@/components/poker/PokerBetConsole';
import PokerSidebar from '@/components/poker/PokerSidebar';
import PokerTopBar from '@/components/poker/PokerTopBar';
import PokerWinCelebration from '@/components/poker/PokerWinCelebration';

const Poker: React.FC = () => {
  const { user, renameGuest, updateBalance } = useAuth();
  const poker = usePoker(DEFAULT_TABLE_ID);
  const {
    state,
    view,
    mySeat,
    sit,
    leave,
    act,
    setBots,
    tables,
    setTableId,
    tableId,
    status,
    serverNow,
  } = poker;

  const [currentTheme, setCurrentTheme] = useState<TableTheme>('monte-carlo');
  const [buyIn, setBuyIn] = useState(1000);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [winCelebration, setWinCelebration] = useState<{
    show: boolean;
    winnerName: string;
    isYou: boolean;
    amount: number;
    handName: string;
  }>({
    show: false,
    winnerName: '',
    isYou: false,
    amount: 0,
    handName: '',
  });

  const consoleRef = useRef<HTMLDivElement | null>(null);
  const lastMyTurn = useRef(false);

  const table: PokerTableInfo | undefined = useMemo(
    () => tables.find((t) => t.tableId === tableId),
    [tables, tableId],
  );

  const minBuyIn = table?.minBuyIn ?? state?.minBuyIn ?? 100;
  const maxBuyIn = table?.maxBuyIn ?? state?.maxBuyIn ?? 5000;

  useEffect(() => {
    setBuyIn((prev) => Math.min(maxBuyIn, Math.max(minBuyIn, prev || minBuyIn * 5)));
  }, [minBuyIn, maxBuyIn]);

  const my = mySeat >= 0 && state ? state.seats[mySeat] : null;
  const isSeated = !!my;
  const isMyTurn = !!state && state.turnSeat === mySeat && mySeat >= 0;

  const actions = useMemo(
    () => (state && mySeat >= 0 ? legalActions(state, mySeat) : null),
    [state, mySeat],
  );

  const potTotal = state ? state.seats.reduce((a, s) => a + s.committed, 0) : 0;

  // Som + rolagem suave até o console quando chega a sua vez
  useEffect(() => {
    if (isMyTurn && !lastMyTurn.current) {
      soundManager.playTurnAlert();
      consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    lastMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  // Efeito ao finalizar mão e detectar vencedor
  useEffect(() => {
    if (state?.phase === 'finished' && state.winners && state.winners.length > 0) {
      const mainWinner = state.winners[0];
      const isYou = !!user?.id && mainWinner.playerId === user.id;

      setWinCelebration({
        show: true,
        winnerName: mainWinner.name,
        isYou,
        amount: mainWinner.amount,
        handName: mainWinner.handName || 'Melhor Mão',
      });

      const timer = setTimeout(() => {
        setWinCelebration((prev) => ({ ...prev, show: false }));
      }, 5500);

      return () => clearTimeout(timer);
    }
  }, [state?.phase, state?.handNo, state?.winners, user?.id]);

  const handleSit = (seatIndex?: number) => {
    const seat =
      typeof seatIndex === 'number'
        ? seatIndex
        : selectedSeat ?? state?.seats.findIndex((s) => !s.playerId) ?? 0;

    if (seat < 0) return;
    if ((user?.balance ?? 0) < buyIn) {
      toast.error('Saldo insuficiente! Clique em "+ Saldo" no topo para recarregar.');
      return;
    }
    soundManager.playChipSplash();
    sit(seat, buyIn);
    setSelectedSeat(null);
  };

  const handleAddVipFunds = async (amount: number) => {
    try {
      const token = localStorage.getItem('luccabet:guest-token');
      if (token) {
        await fetch('/api/faucet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, amount }),
        });
      }
    } catch {
      /* fallback */
    }
    await updateBalance(amount);
    soundManager.playCashout();
    toast.success(`+ ${formatBRLShort(amount)} adicionados ao saldo!`);
  };

  const tableNameDisplay = table?.tableName ?? state?.tableName ?? 'Texas Hold\u2019em';
  const blindsDisplay = state
    ? `R$ ${state.smallBlind} / R$ ${state.bigBlind}`
    : table
      ? `R$ ${table.smallBlind} / R$ ${table.bigBlind}`
      : 'R$ 2 / R$ 5';

  return (
    <Layout>
      <div className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto space-y-3 pb-6 px-1 sm:px-2">
        {/* -------------------- Barra superior: mesa, saldo e controles */}
        <PokerTopBar
          tableName={tableNameDisplay}
          blinds={blindsDisplay}
          userBalance={user?.balance ?? 0}
          isSeated={isSeated}
          status={status}
          currentTheme={currentTheme}
          tables={tables}
          currentTableId={tableId}
          onSelectTheme={setCurrentTheme}
          onSelectTable={setTableId}
          onAddVipFunds={handleAddVipFunds}
          onLeaveTable={leave}
        />

        {/* -------------------- Layout principal: mesa + console + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] xl:grid-cols-[1fr_310px] gap-3 items-start">
          {/* Mesa + Console */}
          <div className="space-y-3">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-black p-2 sm:p-3 border border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <LuxuryPokerTable
                state={state}
                userId={user?.id}
                theme={currentTheme}
                serverNow={serverNow}
                onSit={(seatIndex) => handleSit(seatIndex)}
              />
            </div>

            {/* Console de apostas */}
            {isSeated && (
              <div ref={consoleRef} id="poker-bet-console" className="scroll-mt-16 sm:scroll-mt-0">
                <PokerBetConsole
                  isMyTurn={isMyTurn}
                  actions={actions}
                  currentBet={state?.currentBet ?? 0}
                  potTotal={potTotal}
                  bigBlind={state?.bigBlind ?? 5}
                  playerChips={my?.chips ?? 0}
                  myHole={my?.hole ?? []}
                  communityCards={state?.community ?? []}
                  waitingMessage={
                    state?.phase === 'finished'
                      ? 'Mão encerrada — preparando a próxima rodada…'
                      : state?.phase === 'idle'
                        ? 'Aguardando pelo menos 2 competidores na mesa…'
                        : undefined
                  }
                  onAct={act}
                />
              </div>
            )}
          </div>

          {/* Sidebar: entrada, perfil e histórico */}
          <PokerSidebar
            isSeated={isSeated}
            minBuyIn={minBuyIn}
            maxBuyIn={maxBuyIn}
            buyIn={buyIn}
            userBalance={user?.balance ?? 0}
            nickname={user?.username ?? 'Jogador'}
            botsEnabled={view?.botsEnabled ?? true}
            log={state?.log ?? []}
            chipsInPlay={my?.chips ?? 0}
            onSetBuyIn={setBuyIn}
            onSit={() => handleSit()}
            onRename={renameGuest}
            onToggleBots={setBots}
          />
        </div>

        {/* -------------------- Celebração de vitória */}
        <PokerWinCelebration
          show={winCelebration.show}
          winnerName={winCelebration.winnerName}
          isYou={winCelebration.isYou}
          amount={winCelebration.amount}
          handName={winCelebration.handName}
          onDismiss={() => setWinCelebration((prev) => ({ ...prev, show: false }))}
        />
      </div>
    </Layout>
  );
};

export default Poker;
