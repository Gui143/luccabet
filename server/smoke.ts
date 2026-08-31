/**
 * Teste de fumaça do servidor (ponta a ponta).
 * Sobe 2 jogadores reais numa mesa de poker, joga uma mão, e testa o Aviator.
 *
 * Uso: npx tsx server/smoke.ts   (o servidor precisa estar rodando)
 */
import WebSocket from 'ws';

const BASE = process.env.GAME_SERVER_URL ?? 'http://127.0.0.1:8787';
const WS = BASE.replace('http', 'ws') + '/ws';

let failures = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  console.log(`${cond ? '  ✔' : '  ✘'} ${name}`, cond ? '' : extra ?? '');
  if (!cond) failures += 1;
};

async function guest(name: string) {
  const res = await fetch(`${BASE}/api/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return (await res.json()) as { token: string; playerId: string; name: string; balance: number };
}

class Client {
  ws!: WebSocket;
  state: any = null;
  balance = 0;
  wallet = 0;
  aviator: any = null;
  auth: any = null;
  cashed: any = null;
  lost: any = null;

  constructor(public token: string, public name: string) {}

  async connect(): Promise<void> {
    this.ws = new WebSocket(WS);
    await new Promise<void>((resolve, reject) => {
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
    });
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.t === 'poker:state') this.state = msg;
      if (msg.t === 'wallet') this.wallet = msg.balance;
      if (msg.t === 'aviator:state') this.aviator = msg.snapshot;
      if (msg.t === 'auth:ok') this.auth = msg;
      if (msg.t === 'aviator:cashed') this.cashed = msg;
      if (msg.t === 'aviator:lost') this.lost = msg;
    });
    this.send({ t: 'auth', token: this.token });
    await this.waitFor(() => this.auth, 3000);
  }

  send(msg: unknown) {
    this.ws.send(JSON.stringify(msg));
  }

  async waitFor(pred: () => any, timeout = 8000, label = ''): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const v = pred();
      if (v) return v;
      await new Promise((r) => setTimeout(r, 60));
    }
    console.log(`   ⏱ timeout esperando ${label}`);
    return null;
  }

  mySeat() {
    return this.state?.you?.seat ?? -1;
  }

  async autoPlay(maxMs = 25000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const st = this.state?.state;
      if (!st) break;
      if (st.phase === 'finished') return st;
      const me = this.mySeat();
      if (st.turnSeat === me && me >= 0) {
        const seat = st.seats[me];
        const toCall = Math.max(0, st.currentBet - seat.bet);
        this.send({ t: 'poker:action', tableId: 'texas-2-5', action: toCall === 0 ? 'check' : 'call' });
        await new Promise((r) => setTimeout(r, 250));
      } else {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    return this.state?.state;
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('Saúde do servidor:');
  const health = await (await fetch(`${BASE}/api/health`)).json();
  check('servidor responde /api/health', health.ok === true, health);
  check('mesas criadas', health.tables?.length >= 1, health.tables);

  console.log('\nPoker (2 jogadores reais):');
  const g1 = await guest('Alice');
  const g2 = await guest('Beto');
  check('guest criado com saldo inicial', g1.balance > 0, g1);

  const c1 = new Client(g1.token, g1.name);
  const c2 = new Client(g2.token, g2.name);
  await c1.connect();
  await c2.connect();
  check('websocket autenticado', c1.auth?.playerId === g1.playerId && c2.auth?.playerId === g2.playerId);

  const BUY_IN = 500;
  c1.send({ t: 'poker:join', tableId: 'texas-2-5', seat: 0, buyIn: BUY_IN });
  c2.send({ t: 'poker:join', tableId: 'texas-2-5', seat: 3, buyIn: BUY_IN });

  await c1.waitFor(() => c1.state?.state?.seats?.[0]?.playerId === g1.playerId, 5000, 'assento 0');
  await c2.waitFor(() => c2.state?.state?.seats?.[3]?.playerId === g2.playerId, 5000, 'assento 3');
  const seat0 = c1.state?.state?.seats?.[0];
  check('jogadores sentaram', seat0?.playerId === g1.playerId && seat0?.seatChipsIn === BUY_IN, seat0);
  check('buy-in debitado da carteira', c1.wallet === g1.balance - BUY_IN, { wallet: c1.wallet, expected: g1.balance - BUY_IN });

  // desliga os bots para testar só jogadores reais
  c1.send({ t: 'poker:bots', tableId: 'texas-2-5', enabled: false });

  const st = await c1.waitFor(() => c1.state?.state?.phase === 'preflop' || c1.state?.state?.phase === 'flop', 8000, 'início da mão');
  check('mão iniciou sozinha (sem travar no pré-flop)', !!st, c1.state?.state?.phase);
  check('cartas do jogador 1 escondidas para o jogador 2', c2.state?.state?.seats?.[0]?.hole?.every?.((c: string) => c === 'back') === true, c2.state?.state?.seats?.[0]?.hole);
  check('jogador 1 vê as próprias cartas', c1.state?.state?.seats?.[0]?.hole?.length === 2 && c1.state?.state?.seats?.[0]?.hole?.[0] !== 'back', c1.state?.state?.seats?.[0]?.hole);

  // os DOIS jogadores jogam (senão a mão espera o outro até o timeout)
  const finished = (await Promise.all([c1.autoPlay(60000), c2.autoPlay(60000)]))[0];
  check('mão chegou ao fim (showdown/pagamento)', finished?.phase === 'finished', { phase: finished?.phase });
  check('comunitárias reveladas', (finished?.community?.length ?? 0) >= 3, finished?.community);
  const chipsSum = finished?.seats?.reduce((a: number, s: any) => a + s.chips, 0) ?? 0;
  check('fichas conservadas na mesa (2 x 500)', Math.abs(chipsSum - 1000) < 0.01, chipsSum);
  check('vencedor recebeu o pote', (finished?.winners?.length ?? 0) > 0, finished?.winners);

  console.log('\nAviator (sem bots):');
  c1.send({ t: 'aviator:join' });
  await c1.waitFor(() => c1.aviator, 5000, 'estado do aviator');
  check('estado do aviator recebido', !!c1.aviator);

  // aposta só é aceita na janela "waiting" — tenta até conseguir
  let placed = false;
  for (let attempt = 0; attempt < 4 && !placed; attempt++) {
    await c1.waitFor(() => c1.aviator?.phase === 'waiting', 20000, 'fase de apostas');
    const beforeBet = c1.wallet;
    c1.send({ t: 'aviator:bet', amount: 10, auto: 1.02 });
    const ok = await c1.waitFor(() => c1.wallet === beforeBet - 10, 3500, 'débito da aposta');
    placed = c1.wallet === beforeBet - 10;
    if (!placed) await c1.waitFor(() => c1.aviator?.phase === 'waiting', 20000, 'nova rodada');
  }
  const beforeFlight = c1.wallet;
  check('aposta debitada da carteira', placed, { wallet: c1.wallet });
  check('apostas ao vivo mostram só jogadores reais', c1.aviator?.bets?.length === 1 && c1.aviator.bets[0].name === 'Alice', c1.aviator?.bets);
  check('hash publicado antes da rodada (provably fair)', typeof c1.aviator?.serverHash === 'string' && c1.aviator.serverHash.length === 64, c1.aviator?.serverHash);

  await c1.waitFor(() => c1.aviator?.phase === 'flying', 12000, 'decolagem');
  check('avião decolou', c1.aviator?.phase === 'flying');
  c1.send({ t: 'aviator:cashout' }); // saque manual imediato
  await c1.waitFor(() => c1.cashed !== null, 6000, 'cashout');
  check('cash-out registrado', (c1.cashed?.multiplier ?? 0) >= 1.0, c1.cashed);
  check('prêmio = aposta x multiplicador', Math.abs(c1.cashed?.win - 10 * c1.cashed?.multiplier) < 0.05, c1.cashed);
  check('saldo creditado após o cash-out', c1.wallet > beforeFlight, { beforeFlight, now: c1.wallet });

  const names = [...new Set((c1.aviator?.bets ?? []).map((b: any) => b.name))];
  check('nenhum jogador falso na lista de apostas', names.length === 0 || names.every((n) => n === 'Alice'), names);

  c1.close();
  c2.close();

  console.log(failures === 0 ? '\n✅ Servidor OK' : `\n❌ ${failures} falha(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
