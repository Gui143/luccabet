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
│   │   │       ├── socket_service.dart        # abstração WebSocket (real + mock)
│   │   │       └── game_repository.dart       # fronteira socket <-> engine (eventos JSON)
│   │   └── game_table/                   # 👉 INTERFACE (frontend)
│   │       ├── game_table_controller.dart     # ViewModel: estado visual, censura de nomes
│   │       ├── bindings/game_table_binding.dart  # injeção de dependências GetX
│   │       ├── views/game_table_screen.dart   # tela principal (Stack: feltro, cartas, jogadores)
│   │       └── widgets/
│   │           ├── player_seat_widget.dart
│   │           ├── community_cards_widget.dart
│   │           └── action_bar_widget.dart
│   └── shared/                           # 👉 COMPARTILHADO
│       ├── widgets/
│       │   ├── playing_card_widget.dart        # carta customizada (frente/verso, flip)
│       │   └── player_avatar_widget.dart       # avatar com anel de vez / all-in / fold
│       └── utils/
│           ├── app_colors.dart
│           ├── formatters.dart
│           └── name_masker.dart                # censura dinâmica: "Guilherme" -> "****lherme"
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
