/**
 * Testes do motor de poker (executados com `npx tsx src/games/poker/engine.test.ts`).
 * O objetivo principal é provar que a mesa NUNCA trava: toda mão precisa chegar
 * em `finished` e o total de fichas da mesa precisa se conservar.
 */
import {
  createState, sitDown, startHand, tick, applyAction, legalActions,
  evaluateHand, buildPots, isRoundComplete, type PokerState, type ActionType,
} from './engine';

let failures = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) {
    console.log(`  ✔ ${name}`);
  } else {
    failures += 1;
    console.log(`  ✘ ${name}`, extra ?? '');
  }
};

// ---------------------------------------------------------------- avaliação
console.log('Avaliação de mãos:');
const hv = (s: string) => evaluateHand(s.split(' '));
check('royal flush > quadra', hv('as ks qs js ts 2c 3d').category === 8);
check('straight flush detectado', hv('9s 8s 7s 6s 5s 2c 3d').category === 8);
check('wheel (A2345) é sequência', hv('as 2h 3s 4c 5d kc 7d').category === 4);
check('quadra > full house', hv('9s 9h 9d 9c 2s 5c 7d').score > hv('9s 9h 9d 2c 2s 5c 7d').score);
check('full house > flush', hv('9s 9h 9d 2c 2s 5c 7d').score > hv('2s 5s 9s js ks 5c 7d').score);
check('flush > sequência', hv('2s 5s 9s js ks 5c 7d').score > hv('9s 8h 7d 6c 5s 2c 3d').score);
check('dois pares > par', hv('as ah 3d 3c 5s 7c 8d').score > hv('as ah 3d 4c 5s 7c 8d').score);
check('par com kicker maior vence', hv('as ah 3d 4c 9s 7c 8d').score > hv('as ah 3d 4c 6s 7c 8d').score);
check('7 cartas escolhe a melhor combinação', hv('as ks qs js ts 2c 3d').name === 'Straight Flush');

// ------------------------------------------------- simulação completa de mesa
console.log('\nSimulação de 300 mãos (4 jogadores, ações aleatórias):');
let stuck = 0;
let chipsMismatch = 0;
let handsPlayed = 0;
let showdowns = 0;
let allInRuns = 0;

const rand = (() => {
  let seed = 42;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
})();

for (let game = 0; game < 60; game++) {
  let state: PokerState = createState({ maxSeats: 6, smallBlind: 2, bigBlind: 5, minBuyIn: 100, maxBuyIn: 500 });
  const players = [
    { playerId: 'p1', name: 'Ana', buyIn: 500 },
    { playerId: 'p2', name: 'Bruno', buyIn: 500 },
    { playerId: 'p3', name: 'Caio', buyIn: 300 },
    { playerId: 'p4', name: 'Duda', buyIn: 500 },
  ];
  players.forEach((p, i) => {
    const r = sitDown(state, i, p);
    state = r.state;
  });
  let tableChipsTable = state.seats.reduce((a, s) => a + s.chips, 0);
  const tableChips = () => tableChipsTable;

  for (let hand = 0; hand < 5; hand++) {
    // o servidor (tick) é quem inicia a próxima mão — o cliente nunca chama startHand direto
    // rebuy de quem quebrou (mantém a mesa cheia para o teste)
    state.seats.forEach((seat) => {
      if (seat.playerId && seat.chips <= 0) {
        const r = sitDown(state, seat.index, { playerId: seat.playerId, name: seat.name, buyIn: 200 });
        state = r.state;
        tableChipsTable += 200;
      }
    });

    state = tick({ ...state, nextHandAt: 1 }, Date.now() + 10000).state;
    if (state.phase === 'idle') break;

    let guard = 0;
    while (state.phase !== 'finished' && guard < 400) {
      guard += 1;
      if (state.turnSeat !== null) {
        const seat = state.seats[state.turnSeat];
        const legal = legalActions(state, state.turnSeat);
        const roll = rand();
        let action: ActionType = 'check';
        let amount = 0;
        if (legal.canCheck) {
          action = roll < 0.25 && legal.canRaise ? 'raise' : 'check';
          if (action === 'raise') amount = Math.min(legal.maxRaiseTo, legal.minRaiseTo + Math.floor(rand() * 40));
        } else if (legal.canCall) {
          action = roll < 0.15 ? 'fold' : roll < 0.65 ? 'call' : roll < 0.85 && legal.canRaise ? 'raise' : 'allin';
          if (action === 'raise') amount = Math.min(legal.maxRaiseTo, legal.minRaiseTo + Math.floor(rand() * 60));
        } else {
          action = 'check';
        }
        if (action === 'allin' && !legal.canRaise) action = legal.canCall ? 'call' : 'check';
        const res = applyAction(state, state.turnSeat, action, amount, Date.now());
        if (!res.ok) {
          // ação inválida cai para call/check — nunca deve travar
          const fallback = applyAction(state, state.turnSeat, legal.canCheck ? 'check' : 'call', 0, Date.now());
          state = fallback.ok ? fallback.state : state;
        } else {
          state = res.state;
        }
        if (action === 'allin') allInRuns += 1;
      } else {
        const t = tick(state, Date.now());
        if (!t.changed) {
          // avança o relógio para estourar o tempo do jogador
          const t2 = tick({ ...state, actionDeadline: 1 }, Date.now() + 1000);
          state = t2.state;
          if (!t2.changed) break;
        } else {
          state = t.state;
        }
      }
    }

    if (state.phase !== 'finished') {
      stuck += 1;
      console.log('   MÃO TRAVADA!', { phase: state.phase, turn: state.turnSeat, round: isRoundComplete(state) });
      break;
    }
    handsPlayed += 1;
    if (state.community.length === 5) showdowns += 1;

    const total = state.seats.reduce((a, s) => a + s.chips, 0);
    if (Math.abs(total - tableChips()) > 0.001) {
      chipsMismatch += 1;
      console.log('   Divergência de fichas:', total, 'vs', tableChips());
    }
  }
}

check(`300 mãos simuladas (${handsPlayed} concluídas) sem travar`, stuck === 0 && handsPlayed === 300);
check('nenhuma divergência de fichas (conservação do pote)', chipsMismatch === 0);
check(`showdowns completos ocorreram (${showdowns})`, showdowns > 50);
check(`all-ins processados (${allInRuns})`, allInRuns > 10);

// --------------------------------------------------------------- potes laterais
console.log('\nPotes laterais (side pots):');
{
  let s: PokerState = createState({ maxSeats: 4, smallBlind: 2, bigBlind: 5, minBuyIn: 10, maxBuyIn: 500 });
  s = sitDown(s, 0, { playerId: 'a', name: 'A', buyIn: 500 }).state;
  s = sitDown(s, 1, { playerId: 'b', name: 'B', buyIn: 100 }).state;
  s = sitDown(s, 2, { playerId: 'c', name: 'C', buyIn: 40 }).state;
  s = startHand(s, Date.now());
  // A aposta 200, B vai all-in 100, C vai all-in 40
  // A só pode aumentar até o stack total do maior adversário (100)
  let res = applyAction(s, s.turnSeat!, 'raise', 100, Date.now());
  check('raise até 100 aceito', res.ok, res.error);
  s = res.ok ? res.state : s;
  const seatB = s.seats.findIndex((x) => x.playerId === 'b');
  const seatC = s.seats.findIndex((x) => x.playerId === 'c');
  res = applyAction(s, seatB, 'allin', 0, Date.now());
  s = res.ok ? res.state : s;
  res = applyAction(s, seatC, 'allin', 0, Date.now());
  s = res.ok ? res.state : s;
  const pots = buildPots(s);
  check('2 potes criados (principal + 1 lateral)', pots.length === 2, pots);
  check('pote principal = 40*3 = 120', pots[0].amount === 120, pots[0]);
  check('pote lateral 1 = (100-40)*2 = 120', pots[1]?.amount === 120, pots[1]);
  check('pote lateral 1 elegível só para A e B', pots[1]?.eligible.length === 2, pots[1]);
  check('soma dos potes = total apostado', pots.reduce((a, p) => a + p.amount, 0) === s.seats.reduce((a, x) => a + x.committed, 0), pots);
}

console.log(failures === 0 ? '\n✅ Todos os testes passaram' : `\n❌ ${failures} teste(s) falharam`);
process.exit(failures === 0 ? 0 : 1);
