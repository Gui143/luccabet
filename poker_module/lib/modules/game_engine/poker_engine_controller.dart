/// ============================================================================
///  poker_engine_controller.dart  —  ⭐ BACKEND DO JOGO (GetXController)
///
///  Orquestra TODA a lógica de Texas Hold'em:
///    - Sessão de jogo e lista de jogadores (estado reativo).
///    - Distribuição de cartas (baralho) e fases (pré-flop → showdown).
///    - Fluxo de apostas (fold/check/call/bet/raise/all-in), pote e turnos.
///    - Botões de dealer e blinds.
///    - Avaliação de mãos no showdown e divisão de potes (principal/laterais).
///    - Oponentes de IA (bots) no modo simulado.
///
///  É um GetxController global registrado como permanente (permanent:true),
///  funcionando como um singleton/controller global compartilhado por todas as
///  telas. Ele NÃO conhece a UI — apenas expõe estado reativo e métodos.
///
///  COMUNICAÇÃO: no modo demo o engine roda localmente; o mesmo conjunto de
///  métodos é o alvo dos eventos que chegam do [GameRepository] via WebSocket
///  (ver `applyServerEvent`). Basta plugar o socket para virar multiplayer.
/// ============================================================================
import 'dart:async';
import 'dart:math';

import 'package:get/get.dart';

import '../../models/card_model.dart';
import '../../models/game_session_model.dart';
import '../../models/player_model.dart';
import '../../models/poker_enums.dart';
import 'services/deck_service.dart';
import 'services/game_events.dart';
import 'services/hand_evaluator_service.dart';

class PokerEngineController extends GetxController {
  PokerEngineController({DeckService? deck, Random? random, GameEventBus? bus})
      : _deck = deck ?? DeckService(random: random),
        _random = random ?? Random(),
        _bus = bus;

  final DeckService _deck;
  final Random _random;

  /// Barramento de eventos de domínio (sons e fichas animadas escutam aqui).
  GameEventBus? _bus;
  GameEventBus get events {
    _bus ??= Get.isRegistered<GameEventBus>()
        ? Get.find<GameEventBus>()
        : Get.put(GameEventBus(), permanent: true);
    return _bus!;
  }

  void _emit(GameEvent e) => events.emit(e);

  // ---------------- Estado global reativo ----------------
  /// Sessão da mesa (cartas comunitárias, pote, fase...).
  final GameSessionModel session = GameSessionModel(smallBlind: 10, bigBlind: 20);

  /// Jogadores na mesa, em ordem de assento.
  final RxList<PlayerModel> players = <PlayerModel>[].obs;

  /// Controla a animação de "distribuindo" (a UI pode mostrar cartas voando).
  final RxBool isDealing = false.obs;

  /// Resultado do showdown atual (para o painel de vencedor).
  final RxList<WinnerResult> results = <WinnerResult>[].obs;

  // ---------------- Estado interno ----------------
  Timer? _botTimer;
  bool _handInProgress = false;

  /// Índice do jogador humano (hero) na lista [players].
  int get heroIndex => players.indexWhere((p) => p.isHero);
  PlayerModel? get hero =>
      heroIndex >= 0 ? players[heroIndex] : null;

  int get _seatCount => players.length;

  // ============================================================
  //  CONFIGURAÇÃO DA MESA
  // ============================================================

  /// Cria/senta os jogadores.
  ///
  /// - [mode] == GameMode.bots: os adversários são IA (nomes censurados).
  /// - [mode] == GameMode.online: os adversários são "remotos" (nomes reais,
  ///   campo [isRemote] = true), preenchidos a partir do servidor/simulado.
  void setupTable({
    String heroName = 'Você',
    int playerCount = 6,
    int startingStack = 1000,
    GameMode mode = GameMode.bots,
    List<String> botNames = const [
      'Guilherme',
      'Beatriz',
      'Rafael',
      'Camila',
      'Thiago',
    ],
    List<PlayerModel> opponents = const [],
  }) {
    _botTimer?.cancel();
    _handInProgress = false;
    results.clear();
    players.clear();
    session.mode.value = mode;
    session.connection.value =
        mode == GameMode.online ? ConnectionStatus.connecting : ConnectionStatus.disconnected;
    players.add(PlayerModel(
      id: 'p0',
      name: heroName,
      stack: startingStack,
      seat: 0,
      isHero: true,
      isBot: false,
      isRemote: false,
    ));

    if (opponents.isNotEmpty) {
      // Modo online: adversários vindos do servidor.
      for (var i = 0; i < opponents.length; i++) {
        final src = opponents[i];
        players.add(PlayerModel(
          id: src.id,
          name: src.name,
          stack: startingStack,
          seat: i + 1,
          isHero: false,
          isBot: false,
          isRemote: true,
          latencyMs: src.latencyMs.value,
        ));
      }
    } else {
      final seats = playerCount - 1;
      for (var i = 0; i < seats; i++) {
        final name = i < botNames.length ? botNames[i] : 'Bot$i';
        players.add(PlayerModel(
          id: mode == GameMode.online ? 'r$i' : 'p${i + 1}',
          name: name,
          stack: startingStack,
          seat: i + 1,
          isHero: false,
          // No modo bots são IA; no online são remotos (simulados) mas ainda
          // agem sozinhos no demo (substituído pelo servidor no jogo real).
          isBot: mode == GameMode.bots,
          isRemote: mode == GameMode.online,
          latencyMs: mode == GameMode.online ? 40 + (i * 31 % 130) : 0,
        ));
      }
    }
    session.dealerSeat.value = 0;
    session.statusMessage.value = mode == GameMode.online
        ? 'Conectado à sala online. Aguardando jogadores...'
        : 'Mesa pronta (vs bots). Clique para dar início.';
  }

  /// Atualiza/adiciona um jogador remoto a partir do evento de presença do
  /// servidor (modo online).
  void updateRemotePresence(Map<String, dynamic> p) {
    final id = p['id']?.toString() ?? '';
    final name = p['name']?.toString() ?? 'Player';
    final stack = (p['stack'] as num?)?.toInt() ?? 1000;
    final ping = (p['ping'] as num?)?.toInt() ?? 0;
    final existing = players.firstWhereOrNull((pl) => pl.id == id);
    if (existing != null) {
      existing.latencyMs.value = ping;
      existing.connected.value = true;
    } else {
      final seat = players.length;
      players.add(PlayerModel(
        id: id,
        name: name,
        stack: stack,
        seat: seat,
        isHero: false,
        isBot: false,
        isRemote: true,
        latencyMs: ping,
      ));
    }
  }

  // ============================================================
  //  FLUXO DE UMA MÃO
  // ============================================================

  /// Inicia uma nova mão: reseta estado, gira o botão, posta blinds e distribui.
  Future<void> startHand() async {
    if (_handInProgress) return;
    _handInProgress = true;
    results.clear();

    // Reseta os jogadores que ainda têm fichas.
    for (final p in players) {
      p.resetForNewHand();
    }
    session.resetForNewHand();
    session.handNumber.value += 1;

    // Remove/ignora jogadores sem fichas (sitting out) para a ordem da mão.
    final active = _activePlayers();
    if (active.length < 2) {
      session.statusMessage.value = 'Não há jogadores suficientes.';
      _handInProgress = false;
      return;
    }

    // Gira o botão do dealer (avança para o próximo assento com ficha).
    _advanceDealerButton(active);

    // Prepara baralho e distribui as 2 cartas hole.
    isDealing.value = true;
    _deck.reset(shuffled: true);
    _postBlinds(active);
    await _dealHoleCards(active);
    isDealing.value = false;

    session.phase.value = BettingRound.preflop;
    session.statusMessage.value = 'Pré-Flop';

    // Primeiro a falar no pré-flop é o jogador DEPOIS do big blind.
    final first = _firstToAct(active, BettingRound.preflop);
    _setTurn(first);
  }

  /// Avança o botão do dealer para o próximo assento elegível.
  void _advanceDealerButton(List<PlayerModel> active) {
    final prev = session.dealerSeat.value;
    var next = prev;
    for (var i = 1; i <= _seatCount; i++) {
      final candidate = (prev + i) % _seatCount;
      if (players[candidate].canPlay) {
        next = candidate;
        break;
      }
    }
    for (final p in players) {
      p.hasButton.value = p.seat.value == next;
    }
    session.dealerSeat.value = next;
  }

  /// Posta os blinds pequeno e grande, deduzindo das fichas dos jogadores.
  void _postBlinds(List<PlayerModel> active) {
    final sb = session.smallBlind.value;
    final bb = session.bigBlind.value;
    final dealer = session.dealerSeat.value;

    // Heads-up (2 jogadores) tem regra especial: o dealer paga o small blind.
    final isHeadsUp = active.length == 2;

    final sbSeat = isHeadsUp
        ? dealer
        : _nextOccupiedSeat(dealer, active);
    final bbSeat = isHeadsUp
        ? _nextOccupiedSeat(dealer, active)
        : _nextOccupiedSeat(sbSeat, active);

    _postBlind(players[sbSeat], sb, 'small');
    _postBlind(players[bbSeat], bb, 'big');

    session.currentBet.value = bb;
    session.minRaise.value = bb;
  }

  void _postBlind(PlayerModel p, int amount, String label) {
    final paid = min(amount, p.stack.value);
    p.stack.value -= paid;
    p.currentBet.value += paid;
    p.totalCommitted.value += paid;
    session.pot.value += paid;
    p.lastAction.value = null; // blinds não são "ação" de rua
    if (p.stack.value == 0) p.state.value = PlayerState.allIn;
    _emit(GameEvent(
      type: GameEventType.bet,
      seat: p.seat.value,
      amount: paid,
      playerId: p.id,
      isHero: p.isHero,
    ));
  }

  /// Distribui 2 cartas hole para cada jogador ativo (uma de cada vez, em
  /// ordem, como num dealer real).
  Future<void> _dealHoleCards(List<PlayerModel> active) async {
    for (var round = 0; round < 2; round++) {
      for (final p in active) {
        final faceUp = p.isHero; // só o hero vê as próprias cartas
        final card = _deck.deal(faceUp: faceUp);
        p.holeCards.add(card);
        _emit(GameEvent(
          type: GameEventType.cardDealt,
          seat: p.seat.value,
          playerId: p.id,
          isHero: p.isHero,
        ));
        await Future<void>.delayed(const Duration(milliseconds: 140));
      }
    }
  }

  // ============================================================
  //  AÇÕES DOS JOGADORES (fold/check/call/bet/raise)
  // ============================================================

  /// Ação do HERO (humano). É o método chamado pelos botões da interface.
  void playerAction(PlayerActionType action, {int raiseTo = 0}) {
    final heroP = hero;
    if (heroP == null || !heroP.isTurn.value) return;
    _applyAction(heroP, action, raiseTo: raiseTo);
  }

  /// Aplica uma ação para um jogador ESPECÍFICO (usado por bots, pelo servidor
  /// via [applyServerEvent] e por testes determinísticos).
  void actFor(String playerId, PlayerActionType action, {int raiseTo = 0}) {
    final p = players.firstWhereOrNull((pl) => pl.id == playerId);
    if (p == null || !p.isTurn.value) return;
    _applyAction(p, action, raiseTo: raiseTo);
  }

  /// Aplica uma ação de qualquer jogador e avança o jogo.
  void _applyAction(
    PlayerModel p,
    PlayerActionType action, {
    int raiseTo = 0,
  }) {
    final toCall = session.currentBet.value - p.currentBet.value;

    switch (action) {
      case PlayerActionType.fold:
        p.state.value = PlayerState.folded;
        p.lastAction.value = PlayerActionType.fold;
        _emit(GameEvent(
          type: GameEventType.fold,
          seat: p.seat.value,
          playerId: p.id,
          isHero: p.isHero,
        ));
        break;

      case PlayerActionType.check:
        // Check só é válido se não há valor a pagar.
        if (toCall > 0) {
          // Garantia: transforma em call para não travar o fluxo.
          _doCall(p, toCall);
        } else {
          p.state.value = PlayerState.checked;
          p.lastAction.value = PlayerActionType.check;
        }
        break;

      case PlayerActionType.call:
        _doCall(p, max(toCall, 0));
        break;

      case PlayerActionType.bet:
      case PlayerActionType.raiseAction:
        _doRaise(p, raiseTo <= 0 ? _defaultRaiseTarget() : raiseTo);
        break;

      case PlayerActionType.allIn:
        _doAllIn(p);
        break;
    }

    _afterAction(p);
  }

  void _doCall(PlayerModel p, int amount) {
    final pay = min(amount, p.stack.value);
    if (pay <= 0) return;
    p.stack.value -= pay;
    p.currentBet.value += pay;
    p.totalCommitted.value += pay;
    session.pot.value += pay;
    p.state.value = p.stack.value == 0 ? PlayerState.allIn : PlayerState.called;
    p.lastAction.value = PlayerActionType.call;
    _emit(GameEvent(
      type: GameEventType.bet,
      seat: p.seat.value,
      amount: pay,
      playerId: p.id,
      isHero: p.isHero,
    ));
  }

  /// Aposta/aumenta. [target] é o valor TOTAL que o jogador terá apostado na
  /// rua (não o incremento).
  void _doRaise(PlayerModel p, int target) {
    final maxTarget = p.currentBet.value + p.stack.value;
    final finalTarget = min(target, maxTarget);
    final added = finalTarget - p.currentBet.value;

    p.stack.value -= added;
    p.currentBet.value = finalTarget;
    p.totalCommitted.value += added;
    session.pot.value += added;

    final isAllIn = p.stack.value == 0;
    if (finalTarget > session.currentBet.value) {
      // Reabre a ação: quem já tinha agido pode agir de novo.
      _reopenAction(p);
      session.currentBet.value = finalTarget;
      p.lastAction.value =
          isAllIn ? PlayerActionType.allIn : PlayerActionType.raiseAction;
    } else {
      p.lastAction.value = PlayerActionType.bet;
    }
    p.state.value = isAllIn ? PlayerState.allIn : PlayerState.raised;
    if (added > 0) {
      _emit(GameEvent(
        type: GameEventType.bet,
        seat: p.seat.value,
        amount: added,
        playerId: p.id,
        isHero: p.isHero,
      ));
    }
  }

  void _doAllIn(PlayerModel p) {
    final target = p.currentBet.value + p.stack.value;
    if (target > session.currentBet.value) {
      _doRaise(p, target);
    } else {
      _doCall(p, session.currentBet.value - p.currentBet.value);
    }
  }

  /// Valor padrão de raise (2.5x a aposta atual, simplificado).
  int _defaultRaiseTarget() {
    final cur = session.currentBet.value;
    final base = cur == 0 ? session.bigBlind.value : cur;
    return cur + base; // raise de +1 aposta
  }

  /// Quando há um raise, os demais que já haviam "fechado" voltam a poder agir.
  void _reopenAction(PlayerModel raiser) {
    for (final p in players) {
      if (p == raiser) continue;
      if (p.isInHand &&
          p.state.value != PlayerState.allIn &&
          (p.state.value == PlayerState.called ||
              p.state.value == PlayerState.checked)) {
        p.state.value = PlayerState.active;
      }
    }
  }

  // ============================================================
  //  AVANÇO DE TURNO / FASE
  // ============================================================

  void _afterAction(PlayerModel actor) {
    final active = _activePlayers();

    // Se todos menos um desistiram, o sobrevivente leva o pote.
    final canContest = active.where((p) => p.isInHand).toList();
    if (canContest.length == 1) {
      _awardWithoutShowdown(canContest.first);
      return;
    }

    // Verifica se a rua de apostas terminou.
    if (_isBettingRoundComplete(canContest)) {
      _advancePhase();
    } else {
      final next = _nextToAct(actor.seat.value, canContest);
      _setTurn(next);
    }
  }

  /// A rua termina quando todos os jogadores que ainda podem agir (não foldaram
  /// e não estão all-in) já investiram o valor corrente e não estão pendentes.
  bool _isBettingRoundComplete(List<PlayerModel> contesting) {
    final canAct =
        contesting.where((p) => p.state.value != PlayerState.allIn).toList();

    // Se ninguém mais pode agir (todos all-in ou fold), a rua acaba e o resto
    // é distribuído automaticamente.
    if (canAct.isEmpty) return true;

    for (final p in canAct) {
      final matched = p.currentBet.value == session.currentBet.value;
      final acted = p.state.value == PlayerState.called ||
          p.state.value == PlayerState.checked ||
          p.state.value == PlayerState.raised;
      if (!matched || !acted) return false;
    }
    return true;
  }

  /// Avança para a próxima fase: distribui comunitárias e reinicia apostas.
  Future<void> _advancePhase() async {
    session.activeSeat.value = null;
    for (final p in players) {
      p.resetForNewStreet();
    }

    isDealing.value = true;
    switch (session.phase.value) {
      case BettingRound.preflop:
        _deck.burn();
        for (var i = 0; i < 3; i++) {
          session.communityCards.add(_deck.deal(faceUp: true));
          await Future<void>.delayed(const Duration(milliseconds: 150));
        }
        session.phase.value = BettingRound.flop;
        session.statusMessage.value = 'Flop';
        break;

      case BettingRound.flop:
        _deck.burn();
        session.communityCards.add(_deck.deal(faceUp: true));
        await Future<void>.delayed(const Duration(milliseconds: 150));
        session.phase.value = BettingRound.turn;
        session.statusMessage.value = 'Turn';
        break;

      case BettingRound.turn:
        _deck.burn();
        session.communityCards.add(_deck.deal(faceUp: true));
        await Future<void>.delayed(const Duration(milliseconds: 150));
        session.phase.value = BettingRound.river;
        session.statusMessage.value = 'River';
        break;

      case BettingRound.river:
        isDealing.value = false;
        await _runShowdown();
        return;

      default:
        break;
    }
    isDealing.value = false;

    // Nova rua: aposta zera e começa pelo primeiro ativo após o dealer.
    session.currentBet.value = 0;
    session.minRaise.value = session.bigBlind.value;
    _emit(GameEvent(
      type: GameEventType.phaseChanged,
      seat: -1,
    ));
    final active = _activePlayers().where((p) => p.isInHand).toList();
    if (_isBettingRoundComplete(active)) {
      // Todos all-in: segue distribuindo sem apostas.
      _advancePhase();
      return;
    }
    final first = _firstToAct(active, session.phase.value);
    _setTurn(first);
  }

  // ============================================================
  //  SHOWDOWN E DIVISÃO DE POTES
  // ============================================================

  /// Revela as cartas e distribui o(s) pote(s).
  Future<void> _runShowdown() async {
    session.phase.value = BettingRound.showdown;
    session.statusMessage.value = 'Showdown';
    session.activeSeat.value = null;

    // Revela todas as cartas hole dos jogadores na mão.
    final contestants = _activePlayers().where((p) => p.isInHand).toList();
    for (final p in contestants) {
      for (final c in p.holeCards) {
        c.reveal();
      }
      await Future<void>.delayed(const Duration(milliseconds: 120));
    }

    // Avalia a melhor mão de cada competidor.
    final evaluations = <PlayerModel, EvaluatedHand>{};
    for (final p in contestants) {
      evaluations[p] = HandEvaluatorService.evaluate(
        [...p.holeCards, ...session.communityCards],
      );
    }

    // ---- Construção e distribuição dos potes (principal + laterais) ----
    // Cada nível de contribuição total gera um pote; só compete por um pote
    // quem contribuiu ao menos aquele valor e não desistiu.
    final contributors = _activePlayers()
        .where((p) => p.totalCommitted.value > 0)
        .toList()
      ..sort((a, b) => a.totalCommitted.value.compareTo(b.totalCommitted.value));

    var prevLevel = 0;
    final winnerList = <WinnerResult>[];

    for (final levelPlayer in contributors) {
      final level = levelPlayer.totalCommitted.value;
      if (level <= prevLevel) continue;

      // Tamanho do pote neste nível: soma das fatias entre prevLevel e level.
      var potSize = 0;
      for (final p in contributors) {
        final committed = p.totalCommitted.value;
        final slice = (committed.clamp(0, level) - prevLevel).clamp(0, 1 << 30);
        potSize += slice;
      }

      // Elegíveis: não foldaram E contribuíram ao menos este nível.
      final eligible = contestants
          .where((p) => p.totalCommitted.value >= level)
          .toList();

      if (eligible.isNotEmpty && potSize > 0) {
        // Melhor(es) mão entre os elegíveis.
        final ranked = eligible
          ..sort((a, b) => evaluations[b]!.compareTo(evaluations[a]!));
        final best = evaluations[ranked.first]!;
        final winners = ranked
            .where((p) => evaluations[p]!.compareTo(best) == 0)
            .toList();

        final share = potSize ~/ winners.length;
        var remainder = potSize - share * winners.length;
        for (final w in winners) {
          final amount = share + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          w.stack.value += amount;
          winnerList.add(WinnerResult(
            playerId: w.id,
            amountWon: amount,
            category: evaluations[w]!.category,
            handDescription: HandEvaluatorService.describe(
              [...w.holeCards, ...session.communityCards],
            ),
          ));
          // Fichas voam do pote para o vencedor + som de vitória/derrota.
          _emit(GameEvent(
            type: GameEventType.showdown,
            seat: w.seat.value,
            amount: amount,
            playerId: w.id,
            isHero: w.isHero,
            isWin: w.isHero,
          ));
        }
      }
      prevLevel = level;
    }

    session.pot.value = 0;
    results.assignAll(winnerList);

    // Mensagem de resumo.
    if (winnerList.isNotEmpty) {
      final top = winnerList.first;
      final p = players.firstWhere((pl) => pl.id == top.playerId);
      session.statusMessage.value =
          '${p.displayName} venceu ${top.amountWon} fichas — ${top.handDescription}';
    }

    await Future<void>.delayed(const Duration(seconds: 4));
    _endHand();
  }

  /// Quando só restou um jogador (todos os outros foldaram), ele leva o pote.
  void _awardWithoutShowdown(PlayerModel winner) {
    session.activeSeat.value = null;
    final amount = session.pot.value;
    winner.stack.value += amount;
    results.assignAll([
      WinnerResult(
        playerId: winner.id,
        amountWon: amount,
        category: HandCategory.highCard,
        handDescription: 'Todos desistiram',
      ),
    ]);
    session.phase.value = BettingRound.showdown;
    session.statusMessage.value =
        '${winner.displayName} venceu $amount fichas (desistência)';
    session.pot.value = 0;
    _emit(GameEvent(
      type: GameEventType.winnerByFold,
      seat: winner.seat.value,
      amount: amount,
      playerId: winner.id,
      isHero: winner.isHero,
      isWin: winner.isHero,
    ));
    _scheduleEndHand();
  }

  void _scheduleEndHand() {
    _botTimer?.cancel();
    _botTimer = Timer(const Duration(seconds: 3), _endHand);
  }

  void _endHand() {
    _handInProgress = false;
    for (final p in players) {
      p.isTurn.value = false;
      if (p.stack.value <= 0) {
        p.state.value = PlayerState.sittingOut;
      }
    }
    // Em uma mesa real o servidor começa a próxima mão; no demo aguardamos o
    // botão "Próxima mão" ou um auto-start controlado pela tela.
    session.phase.value = BettingRound.waiting;
  }

  // ============================================================
  //  TURNO E BOTS
  // ============================================================

  void _setTurn(int seat) {
    for (final p in players) {
      p.isTurn.value = p.seat.value == seat;
    }
    session.activeSeat.value = seat;

    final current = players[seat];
    _emit(GameEvent(
      type: GameEventType.turnChanged,
      seat: seat,
      playerId: current.id,
      isHero: current.isHero,
    ));

    // No demo, adversários (bots e remotos simulados) agem sozinhos.
    // No jogo online real, a ação do remoto vem do servidor via applyServerEvent.
    if (_actsAutomatically(current) && current.isInHand) {
      _scheduleBotAction(current);
    }
  }

  /// Define se um jogador deve agir automaticamente no demo.
  /// Bots sempre; remotos também (o "servidor" simulado local decide), pois
  /// não há backend real controlando-os neste ambiente.
  bool _actsAutomatically(PlayerModel p) => p.isBot || p.isRemote;

  /// IA simples dos oponentes: age após uma pequena "pensada".
  void _scheduleBotAction(PlayerModel bot) {
    _botTimer?.cancel();
    final delay = Duration(milliseconds: 600 + _random.nextInt(900));
    _botTimer = Timer(delay, () => _botDecide(bot));
  }

  void _botDecide(PlayerModel bot) {
    if (!bot.isTurn.value || !bot.isInHand) return;

    final toCall = session.currentBet.value - bot.currentBet.value;
    final canCheck = toCall <= 0;
    final roll = _random.nextDouble();

    if (canCheck) {
      // Sem aposta: às vezes aposta para animar, na maioria dá check.
      if (roll < 0.25 && bot.stack.value > session.bigBlind.value) {
        _applyAction(bot, PlayerActionType.bet,
            raiseTo: _defaultRaiseTarget());
      } else {
        _applyAction(bot, PlayerActionType.check);
      }
      return;
    }

    // Há valor a pagar: call na maioria, raise ocasional, fold raro.
    final potOdds = toCall / max(1, session.pot.value);
    if (roll < 0.12 && potOdds > 0.25) {
      _applyAction(bot, PlayerActionType.fold);
    } else if (roll < 0.30 && bot.stack.value > toCall) {
      _applyAction(bot, PlayerActionType.raiseAction,
          raiseTo: session.currentBet.value + session.bigBlind.value * 2);
    } else {
      _applyAction(bot, PlayerActionType.call);
    }
  }

  // ============================================================
  //  HELPERS DE ORDEM / ASSENTOS
  // ============================================================

  /// Jogadores aptos à mão atual (com fichas e não ausentes).
  List<PlayerModel> _activePlayers() =>
      players.where((p) => p.canPlay).toList()
        ..sort((a, b) => a.seat.value.compareTo(b.seat.value));

  /// Próximo assento Ocupado (por jogador ativo) depois de [fromSeat].
  int _nextOccupiedSeat(int fromSeat, List<PlayerModel> active) {
    for (var i = 1; i <= _seatCount; i++) {
      final candidate = (fromSeat + i) % _seatCount;
      if (active.any((p) => p.seat.value == candidate)) return candidate;
    }
    return fromSeat;
  }

  /// Primeiro a falar:
  ///  - Pré-flop: depois do big blind.
  ///  - Pós-flop: primeiro ativo depois do dealer.
  int _firstToAct(List<PlayerModel> active, BettingRound phase) {
    final dealer = session.dealerSeat.value;
    if (active.length == 2) {
      // Heads-up: pré-flop fala o dealer (SB); pós-flop fala o outro (BB).
      if (phase == BettingRound.preflop) return dealer;
      return _nextOccupiedSeat(dealer, active);
    }
    if (phase == BettingRound.preflop) {
      // Depois do BB = 3 assentos após o dealer (dealer->SB->BB->UTG).
      final afterBB = (dealer + 3) % _seatCount;
      return _seatOrNext(afterBB, active);
    }
    return _nextOccupiedSeat(dealer, active);
  }

  /// Próximo jogador que ainda pode agir depois de [fromSeat].
  int _nextToAct(int fromSeat, List<PlayerModel> contesting) {
    for (var i = 1; i <= _seatCount; i++) {
      final candidate = (fromSeat + i) % _seatCount;
      final p = contesting.firstWhereOrNull((pl) => pl.seat.value == candidate);
      if (p != null &&
          p.isInHand &&
          p.state.value != PlayerState.allIn) {
        return candidate;
      }
    }
    return fromSeat;
  }

  int _seatOrNext(int seat, List<PlayerModel> active) {
    if (active.any((p) => p.seat.value == seat)) return seat;
    return _nextOccupiedSeat(seat, active);
  }

  // ============================================================
  //  HELPERS DE UI (valores derivados para os botões de ação)
  // ============================================================

  /// Valor que o hero precisa pagar para dar call (0 = pode dar check).
  int callAmountForHero() {
    final h = hero;
    if (h == null) return 0;
    return max(0, session.currentBet.value - h.currentBet.value);
  }

  /// Stack do hero (para limitar os sliders de raise).
  int heroStack() => hero?.stack.value ?? 0;

  bool get canCheck => callAmountForHero() <= 0;

  // ============================================================
  //  PONTO DE INTEGRAÇÃO COM SERVIDOR (WebSocket)
  // ============================================================

  /// Aplica um evento vindo do [GameRepository] (servidor real).
  /// No modo multiplayer o servidor é a fonte da verdade; estes métodos
  /// apenas atualizam o estado reativo. Estrutura pronta para plugar o socket.
  void applyServerEvent(Map<String, dynamic> event) {
    final type = event['type'] as String?;
    switch (type) {
      case 'welcome':
        session.connection.value = ConnectionStatus.connected;
        session.mode.value = GameMode.online;
        break;

      case 'presence':
        // Lista de jogadores remotos conectados na sala.
        session.connection.value = ConnectionStatus.connected;
        final list = (event['players'] as List?) ?? const [];
        for (final raw in list) {
          updateRemotePresence(Map<String, dynamic>.from(raw as Map));
        }
        break;

      case 'hand_start':
        session.mode.value = GameMode.online;
        session.handNumber.value = (event['handNumber'] as num?)?.toInt() ??
            session.handNumber.value;
        session.dealerSeat.value =
            (event['dealerSeat'] as num?)?.toInt() ?? session.dealerSeat.value;
        break;

      case 'deal_hole':
        // Servidor envia as cartas do hero (as dos outros vêm ocultas).
        final cards = (event['cards'] as List?)
                ?.map((e) => CardModel.fromJson(Map<String, dynamic>.from(e)))
                .toList() ??
            [];
        hero?.holeCards.assignAll(cards);
        for (final c in cards) {
          c.reveal();
          _emit(GameEvent(type: GameEventType.cardDealt, isHero: true));
        }
        break;

      case 'community':
        final cards = (event['cards'] as List?)
                ?.map((e) => CardModel.fromJson(Map<String, dynamic>.from(e)))
                .toList() ??
            [];
        session.communityCards.assignAll(cards);
        session.phase.value =
            BettingRoundJson.fromJson(event['phase'] as String? ?? 'flop');
        _emit(const GameEvent(type: GameEventType.phaseChanged));
        break;

      case 'pot_update':
        session.pot.value =
            (event['pot'] as num?)?.toInt() ?? session.pot.value;
        break;

      case 'stack_update':
        final pid = event['playerId']?.toString();
        final p = players.firstWhereOrNull((pl) => pl.id == pid);
        if (p != null) {
          p.stack.value = (event['stack'] as num?)?.toInt() ?? p.stack.value;
        }
        break;

      case 'turn':
        _setTurn((event['seat'] as num).toInt());
        break;

      case 'bet_update':
        // Aposta de um jogador remoto (servidor é a fonte da verdade online).
        final seat = (event['seat'] as num?)?.toInt();
        final p = seat != null
            ? players.firstWhereOrNull((pl) => pl.seat.value == seat)
            : null;
        if (p != null) {
          final pot = (event['pot'] as num?)?.toInt();
          if (pot != null) session.pot.value = pot;
          _emit(GameEvent(
            type: GameEventType.bet,
            seat: p.seat.value,
            amount: (event['amount'] as num?)?.toInt() ?? 0,
            playerId: p.id,
          ));
        }
        break;

      case 'showdown':
        // Servidor declara os vencedores; a UI exibe e o som toca.
        session.phase.value = BettingRound.showdown;
        final winners = (event['winners'] as List?) ?? const [];
        for (final w in winners) {
          final map = Map<String, dynamic>.from(w as Map);
          _emit(GameEvent(
            type: GameEventType.showdown,
            seat: (map['seat'] as num?)?.toInt() ?? -1,
            amount: (map['amountWon'] as num?)?.toInt() ?? 0,
            playerId: map['playerId']?.toString(),
            isWin: map['playerId']?.toString() == hero?.id,
            isHero: map['playerId']?.toString() == hero?.id,
          ));
        }
        break;

      default:
        break;
    }
  }

  @override
  void onClose() {
    _botTimer?.cancel();
    super.onClose();
  }
}

/// Extensão utilitária para firstWhereOrNull sem depender de package:collection.
extension _FirstWhereOrNull<E> on Iterable<E> {
  E? firstWhereOrNull(bool Function(E) test) {
    for (final e in this) {
      if (test(e)) return e;
    }
    return null;
  }
}
