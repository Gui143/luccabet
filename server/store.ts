/**
 * Carteiras do servidor local (modo demonstração / preview).
 * Persistido em server/.data/wallets.json para o saldo não sumir ao reiniciar.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '.data');
const FILE = resolve(DATA_DIR, 'wallets.json');

export const START_BALANCE = 1000; // saldo de demonstração (BRL)

export interface Wallet {
  playerId: string;
  name: string;
  balance: number;
  createdAt: number;
  updatedAt: number;
}

type Store = Record<string, Wallet>;

let cache: Store | null = null;

function load(): Store {
  if (cache) return cache;
  try {
    cache = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function save() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(cache ?? {}, null, 2));
}

export function createWallet(name: string): Wallet {
  const store = load();
  const playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
  const now = Date.now();
  const wallet: Wallet = { playerId, name, balance: START_BALANCE, createdAt: now, updatedAt: now };
  store[playerId] = wallet;
  save();
  return wallet;
}

export function getWallet(playerId: string): Wallet | null {
  return load()[playerId] ?? null;
}

export function renameWallet(playerId: string, name: string): Wallet | null {
  const store = load();
  const w = store[playerId];
  if (!w) return null;
  w.name = name;
  w.updatedAt = Date.now();
  save();
  return w;
}

/** Debita (retorna false se não há saldo suficiente — nada é alterado). */
export function debit(playerId: string, amount: number): boolean {
  const store = load();
  const w = store[playerId];
  if (!w || w.balance + 1e-9 < amount) return false;
  w.balance = Math.round((w.balance - amount) * 100) / 100;
  w.updatedAt = Date.now();
  save();
  return true;
}

export function credit(playerId: string, amount: number): number {
  const store = load();
  const w = store[playerId];
  if (!w) return 0;
  w.balance = Math.round((w.balance + amount) * 100) / 100;
  w.updatedAt = Date.now();
  save();
  return w.balance;
}
