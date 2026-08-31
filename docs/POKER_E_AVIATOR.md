# Poker Texas Hold'em & Aviator — novo motor, sprites reais e multiplayer

Este documento explica o que mudou, como rodar e como ligar o backend de
produção (Lovable Cloud / Supabase).

---

## 1. O que foi corrigido

### Poker — o travamento em "Pré-flop: Distribuição de cartas"

**Causa:** o jogo antigo (`src/games/pokerEngine.ts`, removido) guardava o estado
em ~12 `useState` e avançava a mesa com `setTimeout` + closures obsoletas. Como o
`nextPhase` lia um `players` desatualizado, a condição de "rodada completa" nunca
era satisfeita: o flop nunca era virado, mas o buy-in de R$ 500 **já tinha sido
descontado**.

**Solução:** um motor novo e puro em `src/games/poker/engine.ts`:

- estado único e serializável (`PokerState`);
- `tick(state, now)` **idempotente** — pode ser chamado quantas vezes quiser; ele
  sempre faz a mesa avançar (vira flop/turn/river, corre o board quando todos
  estão all-in, resolve o showdown e paga os potes). É impossível travar;
- pote principal + potes laterais (side pots) corretos, com divisão de resto;
- avaliador de mão reescrito (straight flush, quadra, full house, flush,
  sequência A-2-3-4-5, trinca, dois pares, par, carta alta) com desempate por
  kickers;
- tempo por jogador (30s) com ação automática (mesa, ou fold) quando expira;
- **o servidor é autoritativo**: baralho, cartas e pagamentos nunca saem dele.

Prova: `npm run test:poker` roda 300 mãos simuladas e verifica que nenhuma trava
e que as fichas da mesa se conservam.

### Valores reais de mesa

| Mesa | Blinds | Buy-in | BBs |
|---|---|---|---|
| Mesa Rio | R$ 2 / R$ 5 | R$ 100 – R$ 500 | até 100 BB no buy-in de R$ 500 |
| Mesa Vegas | R$ 5 / R$ 10 | R$ 200 – R$ 1.000 | até 100 BB |

O buy-in padrão é **R$ 500** e o saldo é devolvido integralmente ao sair da mesa
(fichas da mesa + o que estiver em jogo é estornado na carteira).

### Cartas reais (sem emoji, sem texto)

Os naipes agora são desenhados como **paths vetoriais** e as 52 cartas são
geradas em PNG (`tools/generate-cards.mjs`):

```
public/cards/<rank><naipe>.png   → ah.png (Ás de copas), ts.png (10 de espadas)…
public/cards/atlas.png           → sprite atlas 13x4 (52 cartas, 1 request só)
public/cards/atlas.json          → coordenadas de cada frame
public/cards/back.png            → verso
```

O componente `src/components/poker/PlayingCard.tsx` usa o **atlas** via
`background-position` (alta performance na web) e cai para o PNG individual se o
atlas não existir. Regere os assets com:

```bash
npm run cards
```

### Aviator — sem bots

Removidos: lista de nomes falsos, apostas inventadas e saques automáticos de
bots. A lista "Apostas da rodada" mostra **somente jogadores reais conectados**
(nome, valor e multiplicador do saque). A rodada é gerada no servidor com
**provably fair**: o hash SHA-256 é publicado antes do voo e o seed é revelado
depois do crash.

### Multiplayer de verdade

Poker e Aviator rodam em um servidor de jogos Node (`server/`) que guarda o
estado, o saldo e resolve tudo. Abra duas abas (ou dois navegadores) e jogue na
mesma mesa.

---

## 2. Como rodar

```bash
npm install
npm run dev:all      # sobe o site (Vite) + o servidor de jogos (porta 8787)
```

Ou separadamente:

```bash
npm run server       # servidor de jogos (ws://localhost:8787/ws)
npm run dev          # site
```

O Vite faz proxy de `/api` e `/ws` para o servidor de jogos (ver `vite.config.ts`).

Testes:

```bash
npm run test:poker   # 300 mãos simuladas, sem travar e sem perder fichas
npx tsx server/smoke.ts   # teste ponta a ponta (2 jogadores reais + aviator)
```

Sem servidor e sem Supabase o app entra em **modo treino** (motor no navegador,
cadeiras preenchidas por bots) — o jogo continua funcionando e a tela avisa.

---

## 3. Backends

A detecção é automática (`src/lib/net/index.ts`), nesta ordem:

| Modo | Quando | Onde roda a regra |
|---|---|---|
| `supabase` | Lovable Cloud acessível **e** migrations aplicadas | edge function `poker-controller` (service role) |
| `local` | servidor do repo responde em `/api/health` | `server/index.ts` |
| `offline` | sem rede | motor no próprio navegador |

### 3.1 Lovable Cloud (produção)

1. Aplique as migrations, nesta ordem, no SQL editor do projeto:
   - `supabase/migrations/20260831000100_poker_multiplayer.sql`
   - `supabase/migrations/20260831000200_aviator_real_players.sql`
2. Faça o deploy das funções:
   - `supabase/functions/poker-controller` (novo)
   - `supabase/functions/aviator-controller` (reescrito: apostas reais + snapshot)
   - `_shared/poker-engine.ts` e `_shared/poker-bot.ts` vão juntos (gerados por
     `npm run sync:engine`)
3. No cliente, nada muda: o app detecta as tabelas e passa a usar o Realtime.

Modelo de segurança:

- `poker_table_secrets` guarda o estado completo (baralho + mãos) **sem policy de
  SELECT** — só a edge function lê;
- `poker_tables.state` é o estado público (`toPublicState`): cartas alheias viram
  `back`;
- `poker_hole_cards` tem RLS por `user_id`: cada um recebe só as próprias cartas;
- `aviator_bets` é a única fonte da lista de apostas (nada de bots).

---

## 4. Arquitetura (resumo)

```
src/games/poker/engine.ts        motor puro (web + servidor + edge function)
src/games/poker/bot.ts           IA dos bots (só para completar cadeiras)
src/components/poker/PlayingCard.tsx  carta via sprite atlas
src/hooks/usePoker.ts            liga a mesa ao transporte
src/hooks/useAviator.ts          liga o avião ao transporte
src/lib/net/{local,supabase,offline}Client.ts   transportes com a mesma interface
server/index.ts                  servidor HTTP + WebSocket (poker + aviator)
server/rooms/poker.ts            sala autoritativa (tick de 200ms)
server/rooms/aviator.ts          rodada autoritativa (crash point por hash)
tools/generate-cards.mjs         gera as 52 cartas + atlas
tools/sync-engine.mjs            copia o motor para a edge function
```
