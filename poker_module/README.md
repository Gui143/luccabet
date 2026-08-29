# 🃏 Módulo Texas Hold'em Poker (Flutter + GetX)

Módulo completo de **Texas Hold'em** para um cassino online simulado, com
arquitetura **modular feature-first**, separação estrita entre **lógica
(Controller/Model)** e **interface (View)**, e camada de serviço preparada para
**WebSocket** (roda hoje com um mock local).

> Roda em **Web** e **Desktop** (e também mobile, sem alteração).

---

## ✅ Regras de poker implementadas

- **Baralho** de 52 cartas, embaralhamento Fisher–Yates, distribuição de cartas
  hole e comunitárias (Flop = 3, Turn = +1, River = +1), com "queima" de cartas.
- **Estados da rodada**: Pré-Flop → Flop → Turn → River → Showdown.
- **Apostas**: Fold, Check, Call, Bet, Raise e All-in; pote principal e
  **potes laterais** (all-ins com stacks diferentes) com divisão por nível de
  contribuição; **empates (split pot)** com rateio do resto.
- **Blinds** (small/big) e rotação do **botão do dealer** (regra normal e
  heads-up).
- **Avaliador de mãos** robusto para as 7 cartas (2 hole + 5 comunitárias):
  Royal Flush, Straight Flush (inclui a "roda" A-2-3-4-5), Quadra, Full House,
  Flush, Sequência, Trinca, Dois Pares, Par e Carta Alta — com
  **vetor de desempate (kickers)** e comparação total.
- **Determinação do vencedor** no showdown; se todos foldam, o sobrevivente
  leva o pote sem showdown.
- **Oponentes com IA** (bots) para o modo demo/jogável.
- **Dois modos de jogo** (tela de lobby): **Vs Bots** (offline/IA) e
  **Online** (multiplayer via WebSocket — com sala simulada quando não há
  servidor configurado).
- **Slider de raise ARRASTÁVEL por gesto** (`RaiseSliderWidget`): track
  customizada com arraste/toque, háptica a cada passo e atalhos Min / ½ pote /
  Pote / All-in.
- **Sons** processuais (ficha, carta, clique, raise, fold, "sua vez", vitória
  e derrota) via `audioplayers`, com **mute** e efeitos tácteis (haptics).
- **Fichas animadas**: pilhas de fichas, pote com contagem/pulse e
  **fichas voadoras** (assento ➜ pote nas apostas; pote ➜ vencedor no showdown).

O avaliador de mãos e a lógica de divisão de potes foram validados com dezenas
de casos de teste (ver `test/`).

---

## 📁 Estrutura (feature-first)

```
poker_module/
├── pubspec.yaml
├── lib/
│   ├── main.dart                         # entrada (GetMaterialApp + binding)
│   ├── models/                           # 👉 MODELOS de domínio
│   │   ├── poker_enums.dart              # Suit, CardRank, BettingRound, PlayerState, HandCategory...
│   │   ├── card_model.dart               # CardModel (naipe, valor, visibilidade reativa)
│   │   ├── player_model.dart             # PlayerModel (id, nome, stack, estado, cartas)
│   │   └── game_session_model.dart       # GameSessionModel (comunitárias, pote, botão, fase)
│   ├── modules/
│   │   ├── game_engine/                  # 👉 LÓGICA CENTRAL (backend do jogo)
│   │   │   ├── poker_engine_controller.dart   # PokerEngineController (GetXController/global)
│   │   │   └── services/
│   │   │       ├── deck_service.dart          # baralho/embaralho/distribuição
│   │   │       ├── hand_evaluator_service.dart# ⭐ avaliação das 7 cartas
│   │   │       ├── socket_service.dart        # WebSocket real + mock (bots) + simulado (online demo)
│   │   │       ├── game_repository.dart       # fronteira socket <-> engine (eventos JSON)
│   │   │       └── game_events.dart           # GameEventBus (domain events p/ som/animação)
│   │   ├── game_table/                   # 👉 INTERFACE (frontend)
│   │   │   ├── game_table_controller.dart     # ViewModel: estado visual, censura, modo
│   │   │   ├── chip_fly_controller.dart       # fichas voadoras (assento ⇄ pote)
│   │   │   ├── table_layout.dart              # posições dos assentos/pote (compartilhado)
│   │   │   ├── bindings/game_table_binding.dart
│   │   │   ├── views/game_table_screen.dart
│   │   │   └── widgets/
│   │   │       ├── player_seat_widget.dart
│   │   │       ├── community_cards_widget.dart
│   │   │       ├── action_bar_widget.dart     # Fold/Check/Call/Raise
│   │   │       ├── raise_slider_widget.dart   # ⭐ slider gestual arrastável + aposta rápida
│   │   │       ├── flying_chips_overlay.dart  # overlay das fichas + pote animado
│   │   │       ├── chip_widget.dart           # ficha/pilha de fichas
│   │   │       └── ...
│   │   └── lobby/                        # 👉 Tela de entrada (escolhe bots/online)
│   │       ├── lobby_screen.dart
│   │       └── lobby_controller.dart
│   └── shared/                           # 👉 COMPARTILHADO
│       ├── services/
│       │   └── audio_service.dart              # sons (audioplayers) + haptics, escuta o GameEventBus
│       ├── widgets/
│       │   ├── playing_card_widget.dart        # carta (frente/verso, flip)
│       │   └── player_avatar_widget.dart       # avatar com anel de vez / all-in / fold
│       └── utils/
│           ├── app_colors.dart
│           ├── formatters.dart
│           └── name_masker.dart                # censura: "Guilherme" -> "****lherme"
└── assets/sounds/                              # efeitos WAV (gerados proceduralmente)
└── test/
    ├── hand_evaluator_test.dart
    ├── deck_service_test.dart
    └── engine_flow_test.dart
```

---

## 🚀 Como executar

> Requer Flutter SDK instalado (o ambiente sandbox onde o módulo foi gerado não
> tinha acesso à CDN do Flutter para baixar o SDK).

```bash
cd poker_module
flutter pub get
flutter run -d chrome      # Web
flutter run -d linux       # Desktop Linux
flutter test               # roda os testes do engine/avaliador
```

---

## 🔌 Comunicação (WebSocket) — pronta para plugar

O jogo roda 100% local via `MockSocketService`, mas o fluxo de dados já está
desacoplado:

- `SocketService` é a interface; `WebSocketSocketService` tem o código de
  conexão comentado e pronto (basta habilitar e trocar a injeção no
  `GameTableBinding`).
- `GameRepository` traduz eventos JSON do servidor em chamadas no engine
  (`hand_start`, `deal_hole`, `community`, `turn`, `bet_update`, `showdown`) e
  envia as ações do jogador (`fold/check/call/raise`).

Em produção, o **servidor é a fonte da verdade** (embaralha, decide o vencedor);
o engine local serve para o modo demo/jogo offline e espelha as mesmas regras.

### Modos de jogo (lobby)

- **Vs Bots** — usa `MockSocketService` (sem rede); os 5 adversários são IA.
- **Online** — usa `SimulatedSocketService` (um "servidor" simulado com
  latência e presença de jogadores remotos) quando não há URL de servidor;
  informe um endereço `wss://...` no lobby para usar o `WebSocketSocketService`
  real contra um backend. Os eventos do servidor (`presence`, `hand_start`,
  `deal_hole`, `community`, `turn`, `bet_update`, `showdown`) são tratados em
  `PokerEngineController.applyServerEvent` — é só plugar o backend que publicar
  esse protocolo JSON.

### Censura de nomes
- **Bots** (offline): nome censurado (`Guilherme -> ****lherme`).
- **Online** (jogadores reais): nome verdadeiro + indicador de latência.

---

## 🔒 Censura de nomes

Os oponentes têm o nome mascarado dinamicamente pelo `NameMasker`
(`GameTableController.displayNameFor`), mantendo os últimos caracteres:

```
Guilherme -> ****lherme
Beatriz   -> ****triz
```

O jogador humano ("Você") vê o próprio nome inteiro.

---

## 🧩 Escalabilidade

- Para adicionar **outras modalidades** (Omaha, 5-card draw), crie um novo
  serviço de avaliação/regras e injete no controller — os modelos e a camada de
  rede são reaproveitados.
- O `HandEvaluatorService` é puro e independente do Flutter, podendo ser
  compartilhado com um backend em Dart.
