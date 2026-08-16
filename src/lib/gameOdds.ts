import { supabase } from '@/integrations/supabase/client';

export interface GameOddsSetting {
  id: string;
  game_key: string;
  display_name: string;
  win_chance: number;
  is_active: boolean;
}

const DEFAULT_WIN_CHANCE = 45;
const CACHE_TTL = 20_000;

let cache: Record<string, GameOddsSetting> = {};
let cachedAt = 0;
let inflight: Promise<void> | null = null;

const refresh = async () => {
  const { data } = await supabase
    .from('game_odds_settings')
    .select('id, game_key, display_name, win_chance, is_active');

  if (data) {
    cache = {};
    for (const row of data as any[]) {
      cache[row.game_key] = { ...row, win_chance: Number(row.win_chance) };
    }
    cachedAt = Date.now();
  }
};

export const loadGameOdds = async (): Promise<GameOddsSetting[]> => {
  await refresh();
  return Object.values(cache);
};

/** Percentual de vitória configurado no painel admin (0-100). */
export const getWinChance = async (gameKey: string): Promise<number> => {
  if (Date.now() - cachedAt > CACHE_TTL) {
    inflight = inflight || refresh().finally(() => { inflight = null; });
    await inflight;
  }
  const setting = cache[gameKey];
  if (!setting || !setting.is_active) return DEFAULT_WIN_CHANCE;
  return Math.min(100, Math.max(0, setting.win_chance));
};

/**
 * Decide se a rodada deve favorecer o jogador, respeitando o percentual
 * de ganho/perda definido pelo admin.
 */
export const shouldPlayerWin = async (gameKey: string): Promise<boolean> => {
  const chance = await getWinChance(gameKey);
  return Math.random() * 100 < chance;
};
