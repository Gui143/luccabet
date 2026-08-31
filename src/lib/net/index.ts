/**
 * Fábrica do cliente de jogos + detecção de backend.
 *
 * Ordem de preferência:
 *   1. supabase → Lovable Cloud (produção): Realtime + edge functions
 *   2. local    → servidor Node do repo (server/index.ts): autoritativo e multiplayer real
 *   3. offline  → motor no navegador (treino, sem rede)
 */
import { supabase } from '@/integrations/supabase/client';
import type { BackendMode, GameClient } from './types';
import { LocalGameClient, createOrRestoreSession, healthCheck, type LocalSession } from './localClient';
import { OfflineGameClient } from './offlineClient';
import { SupabaseGameClient, supabasePokerReady } from './supabaseClient';

export * from './types';
export { LocalGameClient, OfflineGameClient, SupabaseGameClient };

let client: GameClient | null = null;
let mode: BackendMode = 'offline';
let session: LocalSession | null = null;

/** Nunca deixa uma chamada de rede travar a detecção do backend. */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    promise
      .then((v) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(v);
        }
      })
      .catch(() => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

/** O Supabase está acessível e logado? */
async function supabaseSessionReady(): Promise<{ playerId: string; name: string; balance: number } | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (error || !user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, balance')
      .eq('id', user.id)
      .maybeSingle();
    return {
      playerId: user.id,
      name: (profile as any)?.username ?? user.email?.split('@')[0] ?? 'Jogador',
      balance: Number((profile as any)?.balance ?? 0),
    };
  } catch {
    return null;
  }
}

export async function detectBackend(): Promise<BackendMode> {
  // Se o Lovable Cloud estiver fora do ar (ou as migrations ainda não
  // rodaram), não podemos ficar esperando: expira em 3s e cai para o
  // servidor local — o jogo continua funcionando.
  const supa = await withTimeout(supabaseSessionReady(), 3000, null);
  if (supa) {
    const ready = await withTimeout(supabasePokerReady(), 3000, false);
    if (ready) return 'supabase';
  }

  const health = await healthCheck();
  if (health?.ok) return 'local';

  return 'offline';
}

export async function ensureGameClient(): Promise<GameClient> {
  if (client) return client;

  mode = await detectBackend();

  if (mode === 'supabase') {
    const supa = (await supabaseSessionReady())!;
    client = new SupabaseGameClient({ playerId: supa.playerId, name: supa.name, balance: supa.balance });
  } else if (mode === 'local') {
    session = await createOrRestoreSession();
    client = new LocalGameClient(session);
  } else {
    client = new OfflineGameClient();
  }

  await client.connect().catch(() => undefined);
  return client;
}

export function getGameClient(): GameClient | null {
  return client;
}

export function getBackendMode(): BackendMode {
  return mode;
}

export function getLocalSession(): LocalSession | null {
  return session;
}

export function resetGameClient() {
  client?.disconnect();
  client = null;
}
