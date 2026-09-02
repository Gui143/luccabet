import React, { useEffect, useMemo, useState } from 'react';
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
import PokerStoryModal from '@/components/poker/PokerStoryModal';
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
    mode,
    status,
    serverNow,
  } = poker;

  const [currentTheme, setCurrentTheme] = useState<TableTheme>('monte-carlo');
  const [buyIn, setBuyIn] = useState(1000);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
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

  const table: PokerTableInfo | undefined = useMemo(
    () => tables.find((t) => t.tableId === tableId),
    [tables, tableId],
  );

  const minBuyIn = table?.minBuyIn ?? state?.minBuyIn ?? 100;
  const maxBuyIn = table?.maxBuyIn ?? state?.maxBuyIn ?? 5000;

  useEffect(() => {
    setBuyIn((prev) => Math.min(maxBuyIn, Math.max(minBuyIn, prev || minBuyIn * 5)));
  }, [minBuyIn, maxBuyIn]);

  // Atualiza relógio para cronômetros suaves
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const my = mySeat >= 0 && state ? state.seats[mySeat] : null;
  const isSeated = !!my;
  const isMyTurn = !!state && state.turnSeat === mySeat && mySeat >= 0;

  const actions = useMemo(
    () => (state && mySeat >= 0 ? legalActions(state, mySeat) : null),
    [state, mySeat],
  );

  const potTotal = state ? state.seats.reduce((a, s) => a + s.committed, 0) : 0;

  // Som ao ser a vez do jogador
  useEffect(() => {
    if (isMyTurn) {
      soundManager.playTurnAlert();
    }
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
      toast.error('Saldo insuficiente! Clique em "+ Banca VIP" no topo para recarregar.');
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
    toast.success(`+ ${formatBRLShort(amount)} adicionados à sua Banca VIP! 💎✨`);
  };

  const tableNameDisplay = table?.tableName ?? state?.tableName ?? 'Monte Carlo VIP Suite';
  const blindsDisplay = state
    ? `R$ ${state.smallBlind} / R$ ${state.bigBlind}`
    : table
      ? `R$ ${table.smallBlind} / R$ ${table.bigBlind}`
      : 'R$ 25 / R$ 50';

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto space-y-3 pb-8">
        {/* -------------------- Top Bar VIP com Navegação, Faucet e Story Flex */}
        <PokerTopBar
          tableName={tableNameDisplay}
          blinds={blindsDisplay}
          userBalance={user?.balance ?? 0}
          isSeated={isSeated}
          status={status}
          mode={mode}
          currentTheme={currentTheme}
          tables={tables}
          currentTableId={tableId}
          onSelectTheme={setCurrentTheme}
          onSelectTable={setTableId}
          onOpenStory={() => setStoryOpen(true)}
          onAddVipFunds={handleAddVipFunds}
          onLeaveTable={leave}
        />

        {/* -------------------- Layout Principal da Sala de Poker VIP */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3.5 items-start">
          {/* Lado Esquerdo: Mesa de Luxo + Console de Apostas */}
          <div className="space-y-3">
            {/* Masterpiece Luxury Poker Table */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-black p-2 sm:p-4 border border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <LuxuryPokerTable
                state={state}
                userId={user?.id}
                theme={currentTheme}
                serverNow={serverNow}
                onSit={(seatIndex) => handleSit(seatIndex)}
              />
            </div>

            {/* Console de Apostas VIP (Bottom Dock) */}
            {isSeated && (
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
                    ? 'Mão encerrada — preparando a próxima rodada VIP…'
                    : state?.phase === 'idle'
                      ? 'Aguardando pelo menos 2 competidores na mesa…'
                      : undefined
                }
                onAct={act}
              />
            )}
          </div>

          {/* Lado Direito: Sidebar VIP com Entrada, Perfil e Histórico */}
          <PokerSidebar
            isSeated={isSeated}
            minBuyIn={minBuyIn}
            maxBuyIn={maxBuyIn}
            buyIn={buyIn}
            userBalance={user?.balance ?? 0}
            nickname={user?.username ?? 'Jogador VIP'}
            botsEnabled={view?.botsEnabled ?? true}
            log={state?.log ?? []}
            chipsInPlay={my?.chips ?? 0}
            onSetBuyIn={setBuyIn}
            onSit={() => handleSit()}
            onRename={renameGuest}
            onToggleBots={setBots}
          />
        </div>

        {/* -------------------- Celebração de Vitória (Confetes + Troféu) */}
        <PokerWinCelebration
          show={winCelebration.show}
          winnerName={winCelebration.winnerName}
          isYou={winCelebration.isYou}
          amount={winCelebration.amount}
          handName={winCelebration.handName}
          onOpenStory={() => {
            setWinCelebration((prev) => ({ ...prev, show: false }));
            setStoryOpen(true);
          }}
          onDismiss={() => setWinCelebration((prev) => ({ ...prev, show: false }))}
        />

        {/* -------------------- Modal Gerador de Stories do Instagram (Story Flex) */}
        <PokerStoryModal
          isOpen={storyOpen}
          onClose={() => setStoryOpen(false)}
          username={user?.username ?? 'Jogador VIP'}
          tableName={tableNameDisplay}
          blinds={blindsDisplay}
          winAmount={winCelebration.amount > 0 ? winCelebration.amount : potTotal > 0 ? potTotal : (my?.chips ?? user?.balance ?? 50000)}
          handName={my?.bestHand?.name ?? winCelebration.handName || 'Mão Vencedora'}
          holeCards={my?.hole && my.hole.length === 2 ? my.hole : ['as', 'ah']}
          communityCards={state?.community ?? []}
          balance={user?.balance ?? 0}
        />
      </div>
    </Layout>
  );
};

export default Poker;
