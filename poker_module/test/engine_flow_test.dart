/// ============================================================================
///  engine_flow_test.dart
///  Testes de fluxo do engine (sem UI e SEM depender de timers de bot).
///  Usa [PokerEngineController.actFor] de forma determinística.
/// ============================================================================
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:poker_module/models/poker_enums.dart';
import 'package:poker_module/modules/game_engine/poker_engine_controller.dart';

void main() {
  setUp(() {
    Get.reset();
  });

  test('Setup cria 6 jogadores com stacks e identifica o hero', () {
    final engine = PokerEngineController();
    engine.setupTable(playerCount: 6, startingStack: 1000);

    expect(engine.players.length, 6);
    for (final p in engine.players) {
      expect(p.stack.value, 1000);
    }
    expect(engine.hero?.isHero, true);
  });

  test('Pré-flop distribui 2 cartas a cada jogador e posta os blinds',
      () async {
    final engine = PokerEngineController();
    engine.setupTable(playerCount: 6, startingStack: 1000);
    await engine.startHand();

    expect(engine.session.phase.value, BettingRound.preflop);
    for (final p in engine.players) {
      expect(p.holeCards.length, 2);
    }
    // SB=10 + BB=20.
    expect(engine.session.pot.value, 30);
    // Existe um jogador com a vez.
    expect(engine.session.activeSeat.value, isNotNull);
  });

  test('Fold de todos os outros dá o pote ao hero (sem showdown)', () async {
    final engine = PokerEngineController();
    engine.setupTable(playerCount: 3, startingStack: 1000);
    await engine.startHand();

    // Faz cada jogador da vez (que não seja o hero) desistir, até que só
    // reste o hero. Se a vez cair no hero, ele dá check/call para seguir.
    for (var i = 0; i < 30; i++) {
      final seat = engine.session.activeSeat.value;
      if (seat == null) break;
      final current = engine.players[seat];
      if (engine.session.phase.value == BettingRound.showdown) break;

      if (current.isHero) {
        // Hero acompanha para continuar na mão.
        engine.playerAction(
          engine.callAmountForHero() == 0
              ? PlayerActionType.check
              : PlayerActionType.call,
        );
      } else {
        engine.actFor(current.id, PlayerActionType.fold);
      }
    }

    expect(engine.session.phase.value, BettingRound.showdown);
    expect(engine.results.isNotEmpty, true);
    // Quem venceu é o único que sobrou.
    final winner =
        engine.players.firstWhere((p) => p.id == engine.results.first.playerId);
    expect(winner.isHero, true);

    // Conservação de fichas: stacks + pote(0) = total inicial.
    final totalStacks =
        engine.players.fold<int>(0, (acc, p) => acc + p.stack.value);
    expect(totalStacks, 3 * 1000);
  });

  test('Conservação total de fichas após uma rua de calls', () async {
    final engine = PokerEngineController();
    engine.setupTable(playerCount: 4, startingStack: 1000);
    await engine.startHand();
    const total = 4 * 1000;

    // Todo mundo dá call/check até o showdown (bots não agem porque usamos
    // actFor para o jogador da vez).
    for (var i = 0; i < 200 && engine.session.phase.value != BettingRound.showdown; i++) {
      final seat = engine.session.activeSeat.value;
      if (seat == null) break;
      final current = engine.players[seat];
      final toCall = engine.session.currentBet.value - current.currentBet.value;
      engine.actFor(
        current.id,
        toCall == 0 ? PlayerActionType.check : PlayerActionType.call,
      );
    }

    expect(engine.session.phase.value, BettingRound.showdown);
    final totalStacks =
        engine.players.fold<int>(0, (acc, p) => acc + p.stack.value);
    expect(totalStacks + engine.session.pot.value, total);
    expect(engine.results.isNotEmpty, true);
  });
}
