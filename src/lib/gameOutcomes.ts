import { supabase } from '@/integrations/supabase/client';

/**
 * Registra o resultado de uma rodada na tabela game_wins.
 * - winAmount = valor total devolvido à banca do jogador (0 em caso de perda)
 * - multiplier = multiplicador de retorno (0 na perda, 1 em empate/push)
 *
 * As perdas também são registradas para que o painel admin (lucro da casa,
 * volume por jogo e ranking) reflita 100% das rodadas.
 */
export const recordGameOutcome = async (params: {
  userId?: string;
  gameName: string;
  betAmount: number;
  multiplier: number;
  winAmount: number;
}) => {
  const { userId, gameName, betAmount, multiplier, winAmount } = params;
  if (!userId) return;
  try {
    await supabase.from('game_wins').insert({
      user_id: userId,
      game_name: gameName,
      bet_amount: Math.round(betAmount * 100) / 100,
      multiplier: Math.round(multiplier * 100) / 100,
      win_amount: Math.round(winAmount * 100) / 100,
    });
  } catch {
    // estatística é best-effort, nunca deve quebrar o jogo
  }
};
