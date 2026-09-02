/**
 * Servidor de jogos do Brazuca Bet (autoritativo).
 *
 *  - WebSocket em /ws  (poker + aviator em tempo real)
 *  - HTTP: GET /api/health, GET /api/tables, POST /api/guest
 *
 * Ele é usado quando o app roda sem o Supabase (preview / desenvolvimento) e
 * também serve como referência para as edge functions do Supabase
 * (supabase/functions/poker-controller e aviator-controller), que implementam
 * o mesmo protocolo com as tabelas do banco.
 *
 * Rodar: npm run server   (ou npm run dev:all para subir junto com o Vite)
 */
import http from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

import { PokerRoom, type PokerClient, type PokerRoomConfig } from './rooms/poker';
import { AviatorRoom } from './rooms/aviator';
import { createWallet, credit, debit, getWallet, renameWallet, START_BALANCE } from './store';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.GAME_SERVER_PORT ?? 8787);

// --------------------------------------------------------------- autenticação
const DATA_DIR = resolve(__dirname, '.data');
const SECRET_FILE = resolve(DATA_DIR, 'secret');
function loadSecret(): string {
  if (existsSync(SECRET_FILE)) return readFileSync(SECRET_FILE, 'utf8').trim();
  mkdirSync(DATA_DIR, { recursive: true });
  const secret = randomBytes(24).toString('hex');
  writeFileSync(SECRET_FILE, secret);
  return secret;
}
const SECRET = loadSecret();

const sign = (playerId: string) => createHash('sha256').update(`${playerId}.${SECRET}`).digest('hex').slice(0, 24);
const makeToken = (playerId: string) => `${playerId}.${sign(playerId)}`;
const verifyToken = (token: string): string | null => {
  if (typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const playerId = token.slice(0, idx);
  if (sign(playerId) !== token.slice(idx + 1)) return null;
  return getWallet(playerId) ? playerId : null;
};

// -------------------------------------------------------------------- salas
const walletApi = {
  debit,
  credit,
  getBalance: (id: string) => getWallet(id)?.balance ?? 0,
};

const TABLES: PokerRoomConfig[] = [
  {
    tableId: 'texas-2-5',
    tableName: 'Mesa Rio',
    smallBlind: 2,
    bigBlind: 5,
    minBuyIn: 100,
    maxBuyIn: 500,
    maxSeats: 6,
    turnSeconds: 40,
    botsEnabled: true,
  },
  {
    tableId: 'texas-5-10',
    tableName: 'Mesa Vegas',
    smallBlind: 5,
    bigBlind: 10,
    minBuyIn: 200,
    maxBuyIn: 1000,
    maxSeats: 6,
    turnSeconds: 40,
    botsEnabled: true,
  },
  {
    tableId: 'texas-25-50',
    tableName: 'Monte Carlo',
    smallBlind: 25,
    bigBlind: 50,
    minBuyIn: 1000,
    maxBuyIn: 5000,
    maxSeats: 6,
    turnSeconds: 40,
    botsEnabled: true,
  },
  {
    tableId: 'texas-100-200',
    tableName: 'Macau High Roller',
    smallBlind: 100,
    bigBlind: 200,
    minBuyIn: 5000,
    maxBuyIn: 25000,
    maxSeats: 6,
    turnSeconds: 40,
    botsEnabled: true,
  },
  {
    tableId: 'texas-500-1000',
    tableName: 'Bellagio Diamond Suite',
    smallBlind: 500,
    bigBlind: 1000,
    minBuyIn: 20000,
    maxBuyIn: 100000,
    maxSeats: 6,
    turnSeconds: 40,
    botsEnabled: true,
  },
];

const pokerRooms = new Map<string, PokerRoom>();
for (const cfg of TABLES) {
  const room = new PokerRoom(cfg, walletApi);
  room.start();
  pokerRooms.set(cfg.tableId, room);
}

const aviator = new AviatorRoom(walletApi);
aviator.start();

// ------------------------------------------------------------------- HTTP
const json = (res: http.ServerResponse, data: unknown, status = 200) => {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'OPTIONS') return json(res, { ok: true });

  if (url.pathname === '/api/health') {
    return json(res, {
      ok: true,
      uptime: process.uptime(),
      tables: [...pokerRooms.values()].map((r) => r.info()),
      players: wsClients.size,
      startBalance: START_BALANCE,
    });
  }

  if (url.pathname === '/api/faucet' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}') as { token?: string; amount?: number };
        const playerId = verifyToken(parsed.token ?? '');
        if (!playerId) return json(res, { error: 'Sessão expirada' }, 401);
        const amount = Math.max(100, Math.min(1000000, Number(parsed.amount ?? 50000)));
        const newBal = credit(playerId, amount);
        for (const [ws, sess] of wsClients.entries()) {
          if (sess.playerId === playerId) {
            send(ws, { t: 'wallet', balance: newBal });
          }
        }
        return json(res, { ok: true, balance: newBal });
      } catch {
        return json(res, { error: 'Requisição inválida' }, 400);
      }
    });
    return;
  }

  if (url.pathname === '/api/tables') {
    return json(res, { tables: [...pokerRooms.values()].map((r) => r.info()) });
  }

  if (url.pathname === '/api/guest' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}') as { name?: string; token?: string };
        if (parsed.token) {
          const playerId = verifyToken(parsed.token);
          if (!playerId) return json(res, { error: 'Sessão expirada' }, 401);
          const w = getWallet(playerId)!;
          return json(res, { token: parsed.token, playerId, name: w.name, balance: w.balance });
        }
        const name = (parsed.name || 'Convidado').slice(0, 18);
        const w = createWallet(name);
        return json(res, { token: makeToken(w.playerId), playerId: w.playerId, name: w.name, balance: w.balance });
      } catch {
        return json(res, { error: 'Requisição inválida' }, 400);
      }
    });
    return;
  }

  return json(res, { error: 'Not found' }, 404);
});

// --------------------------------------------------------------- WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });

interface Session {
  playerId: string;
  name: string;
  socket: WebSocket;
  rooms: Set<string>;
}

const wsClients = new Map<WebSocket, Session>();

function send(socket: WebSocket, msg: unknown) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
}

function clientFor(session: Session): PokerClient {
  return {
    playerId: session.playerId,
    name: session.name,
    send: (msg) => send(session.socket, msg),
  };
}

wss.on('connection', (socket) => {
  let session: Session | null = null;

  const ping = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) socket.ping();
  }, 25000);

  socket.on('message', (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    // ---- autenticação
    if (msg.t === 'auth') {
      const playerId = verifyToken(msg.token);
      if (!playerId) {
        send(socket, { t: 'auth:error', message: 'Sessão inválida' });
        return;
      }
      const wallet = getWallet(playerId)!;
      session = { playerId, name: wallet.name, socket, rooms: new Set() };
      wsClients.set(socket, session);
      send(socket, {
        t: 'auth:ok',
        playerId,
        name: wallet.name,
        balance: wallet.balance,
        tables: [...pokerRooms.values()].map((r) => r.info()),
      });
      return;
    }

    if (!session) {
      send(socket, { t: 'error', message: 'Autentique-se primeiro' });
      return;
    }

    switch (msg.t) {
      case 'rename': {
        const w = renameWallet(session.playerId, String(msg.name ?? '').slice(0, 18));
        if (w) {
          session.name = w.name;
          send(socket, { t: 'auth:ok', playerId: w.playerId, name: w.name, balance: w.balance });
        }
        break;
      }
      case 'wallet:sync':
        send(socket, { t: 'wallet', balance: getWallet(session.playerId)?.balance ?? 0 });
        break;

      // ------------------------------------------------------------- poker
      case 'poker:join': {
        const room = pokerRooms.get(String(msg.tableId ?? TABLES[0].tableId)) ?? [...pokerRooms.values()][0];
        if (!session.rooms.has(room.tableId)) {
          room.addClient(clientFor(session));
          session.rooms.add(room.tableId);
        }
        if (typeof msg.seat === 'number' && typeof msg.buyIn === 'number') {
          room.sit(clientFor(session), msg.seat, msg.buyIn);
        } else {
          room.broadcastState();
        }
        break;
      }
      case 'poker:leave': {
        const room = pokerRooms.get(String(msg.tableId ?? TABLES[0].tableId));
        room?.leave(clientFor(session));
        break;
      }
      case 'poker:action': {
        const room = pokerRooms.get(String(msg.tableId ?? TABLES[0].tableId));
        room?.action(clientFor(session), msg.action, Number(msg.amount ?? 0));
        break;
      }
      case 'poker:tick': {
        const room = pokerRooms.get(String(msg.tableId ?? TABLES[0].tableId));
        room?.tickNow();
        break;
      }
      case 'poker:start': {

        const room = pokerRooms.get(String(msg.tableId ?? TABLES[0].tableId));
        room?.startNow(clientFor(session));
        break;
      }
      case 'poker:bots': {
        const room = pokerRooms.get(String(msg.tableId ?? TABLES[0].tableId));
        room?.setBots(Boolean(msg.enabled));
        break;
      }
      case 'poker:sync': {
        const room = pokerRooms.get(String(msg.tableId ?? TABLES[0].tableId));
        if (room && !session.rooms.has(room.tableId)) {
          room.addClient(clientFor(session));
          session.rooms.add(room.tableId);
        } else room?.broadcastState();
        break;
      }

      // ----------------------------------------------------------- aviator
      case 'aviator:join':
        aviator.addClient(clientFor(session));
        break;
      case 'aviator:bet':
        aviator.placeBet(clientFor(session), Number(msg.amount), msg.auto != null ? Number(msg.auto) : null);
        break;
      case 'aviator:cancel':
        aviator.cancelBet(clientFor(session));
        break;
      case 'aviator:cashout':
        aviator.cashout(clientFor(session));
        break;
      case 'aviator:sync':
        aviator.addClient(clientFor(session));
        break;

      default:
        send(socket, { t: 'error', message: `Comando desconhecido: ${msg.t}` });
    }
  });

  socket.on('close', () => {
    clearInterval(ping);
    const s = wsClients.get(socket);
    if (s) {
      for (const roomId of s.rooms) pokerRooms.get(roomId)?.removeClient(s.playerId);
      aviator.removeClient(s.playerId);
      wsClients.delete(socket);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Servidor de jogos ouvindo em http://0.0.0.0:${PORT} (ws://0.0.0.0:${PORT}/ws)`);
  console.log(`   Mesas: ${[...pokerRooms.keys()].join(', ')} | Aviator: sem bots`);
});
