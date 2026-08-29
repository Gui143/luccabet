/// ============================================================================
///  deck_service_test.dart
///  Testes do baralho: 52 cartas, unicidade e distribuição.
/// ============================================================================
import 'package:flutter_test/flutter_test.dart';
import 'package:poker_module/modules/game_engine/services/deck_service.dart';

void main() {
  test('Baralho tem 52 cartas únicas', () {
    final deck = DeckService();
    deck.reset();
    expect(deck.remaining, 52);

    final seen = <String>{};
    while (deck.remaining > 0) {
      final c = deck.deal();
      seen.add(c.shortLabel);
    }
    expect(seen.length, 52); // sem duplicatas
  });

  test('deal() respeita faceUp/faceDown', () {
    final deck = DeckService();
    deck.reset();
    final up = deck.deal(faceUp: true);
    final down = deck.deal(faceUp: false);
    expect(up.isFaceUp.value, true);
    expect(down.isFaceUp.value, false);
  });

  test('Dois embaralhamentos com seeds diferentes produzem ordens diferentes', () {
    final a = DeckService();
    a.reset();
    final orderA = List.generate(52, (_) => a.deal().shortLabel);

    final b = DeckService();
    b.reset();
    final orderB = List.generate(52, (_) => b.deal().shortLabel);

    // Extremamente improvável que dois shuffles aleatórios sejam idênticos.
    expect(orderA, isNot(equals(orderB)));
  });
}
