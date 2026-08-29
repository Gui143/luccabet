/// ============================================================================
///  hand_evaluator_test.dart
///  Testes do avaliador de mãos (a parte mais crítica do engine).
///
///  Notação de string: valor+naipe. Valor: 2..9, T(10), J, Q, K, A.
///  Naipe: s(♠) h(♥) d(♦) c(♣). Ex.: "As Kd 10c".
///  (Aceita "10" como entrada por legibilidade; convertido internamente.)
/// ============================================================================
import 'package:flutter_test/flutter_test.dart';
import 'package:poker_module/models/card_model.dart';
import 'package:poker_module/models/poker_enums.dart';
import 'package:poker_module/modules/game_engine/services/hand_evaluator_service.dart';

CardModel _c(String token) {
  final rankMap = {
    '2': CardRank.two, '3': CardRank.three, '4': CardRank.four, '5': CardRank.five,
    '6': CardRank.six, '7': CardRank.seven, '8': CardRank.eight, '9': CardRank.nine,
    'T': CardRank.ten, 'J': CardRank.jack, 'Q': CardRank.queen, 'K': CardRank.king,
    'A': CardRank.ace,
  };
  final suitMap = {
    's': Suit.spades, 'h': Suit.hearts, 'd': Suit.diamonds, 'c': Suit.clubs,
  };
  String rankTok;
  String suitTok;
  if (token.startsWith('10')) {
    rankTok = 'T';
    suitTok = token[2];
  } else {
    rankTok = token[0];
    suitTok = token[1];
  }
  return CardModel(rank: rankMap[rankTok]!, suit: suitMap[suitTok]!, faceUp: true);
}

List<CardModel> _hand(String s) =>
    s.trim().split(RegExp(r'\s+')).map(_c).toList();

void main() {
  group('Categoria da melhor mão (7 cartas)', () {
    test('Royal Flush', () {
      final h = HandEvaluatorService.evaluate(_hand('As Ks Qs Js Ts 2d 3h'));
      expect(h.category, HandCategory.royalFlush);
      expect(h.tiebreaker, [14]);
    });

    test('Straight Flush (roda) A-2-3-4-5', () {
      final h = HandEvaluatorService.evaluate(_hand('As 2s 3s 4s 5s Kd Qh'));
      expect(h.category, HandCategory.straightFlush);
      expect(h.tiebreaker, [5]);
    });

    test('Straight Flush até 9', () {
      final h = HandEvaluatorService.evaluate(_hand('9h 8h 7h 6h 5h 2c 2d'));
      expect(h.category, HandCategory.straightFlush);
      expect(h.tiebreaker, [9]);
    });

    test('Quadra de Ás com kicker Rei', () {
      final h = HandEvaluatorService.evaluate(_hand('As Ad Ac Ah Kd Qc 2h'));
      expect(h.category, HandCategory.fourOfAKind);
      expect(h.tiebreaker, [14, 13]);
    });

    test('Quadra de 5 com kicker Ás', () {
      final h = HandEvaluatorService.evaluate(_hand('5s 5d 5c 5h As Kd Qc'));
      expect(h.category, HandCategory.fourOfAKind);
      expect(h.tiebreaker, [5, 14]);
    });

    test('Full House AAA + KK', () {
      final h = HandEvaluatorService.evaluate(_hand('As Ad Ac Kd Kh 2c 3d'));
      expect(h.category, HandCategory.fullHouse);
      expect(h.tiebreaker, [14, 13]);
    });

    test('Full House com duas trincas (AAA + KKK)', () {
      final h = HandEvaluatorService.evaluate(_hand('As Ad Ac Kd Kc Kh 2d'));
      expect(h.category, HandCategory.fullHouse);
      expect(h.tiebreaker, [14, 13]);
    });

    test('Flush Ás-alho (5 maiores do naipe)', () {
      final h = HandEvaluatorService.evaluate(_hand('As 9s 7s 5s 3s Kd Qh'));
      expect(h.category, HandCategory.flush);
      expect(h.tiebreaker, [14, 9, 7, 5, 3]);
    });

    test('Sequência Broadway A-K-Q-J-10', () {
      final h = HandEvaluatorService.evaluate(_hand('As Kd Qc Jh Ts 2c 3d'));
      expect(h.category, HandCategory.straight);
      expect(h.tiebreaker, [14]);
    });

    test('Sequência roda A-2-3-4-5 (high = 5)', () {
      final h = HandEvaluatorService.evaluate(_hand('As 2d 3c 4h 5s Kc Qd'));
      expect(h.category, HandCategory.straight);
      expect(h.tiebreaker, [5]);
    });

    test('Trinca de Reis + kickers', () {
      final h = HandEvaluatorService.evaluate(_hand('Ks Kd Kc As Qd 2h 3c'));
      expect(h.category, HandCategory.threeOfAKind);
      expect(h.tiebreaker, [13, 14, 12]);
    });

    test('Dois Pares AA e KK com Q', () {
      final h = HandEvaluatorService.evaluate(_hand('As Ad Kc Kh Qd 2c 3h'));
      expect(h.category, HandCategory.twoPair);
      expect(h.tiebreaker, [14, 13, 12]);
    });

    test('Dois Pares escolhe os dois maiores (KK QQ JJ)', () {
      final h = HandEvaluatorService.evaluate(_hand('Ks Kd Qc Qh Jc Jd 2s'));
      expect(h.category, HandCategory.twoPair);
      expect(h.tiebreaker, [13, 12, 11]);
    });

    test('Par de Ás + 3 kickers', () {
      final h = HandEvaluatorService.evaluate(_hand('As Ad Kd Qc Jh 9s 2d'));
      expect(h.category, HandCategory.pair);
      expect(h.tiebreaker, [14, 13, 12, 11]);
    });

    test('Carta Alta', () {
      final h = HandEvaluatorService.evaluate(_hand('As Kd Qc Jh 9s 7d 2c'));
      expect(h.category, HandCategory.highCard);
      expect(h.tiebreaker, [14, 13, 12, 11, 9]);
    });

    test('Flush vence Sequência quando ambos são possíveis', () {
      final h = HandEvaluatorService.evaluate(_hand('9s 8s 7s 6s 4s 5d 3h'));
      expect(h.category, HandCategory.flush);
    });

    test('Quadra vence Full House', () {
      final h = HandEvaluatorService.evaluate(_hand('As Ad Ac Ah Kd Kh 2c'));
      expect(h.category, HandCategory.fourOfAKind);
    });
  });

  group('Comparação entre mãos (determinação do vencedor)', () {
    EvaluatedHand e(String s) => HandEvaluatorService.evaluate(_hand(s));

    test('Royal > Straight Flush 9', () {
      expect(e('As Ks Qs Js Ts 2d 3h').compareTo(e('9s 8s 7s 6s 5s 2d 3h')) > 0, true);
    });
    test('Roda de SF < SF até 6', () {
      expect(e('As 2s 3s 4s 5s Kd Qh').compareTo(e('6s 7s 8s 9s Ts Kd Qh')) < 0, true);
    });
    test('Quadra de Ás > Quadra de Rei', () {
      expect(e('As Ad Ac Ah 2d 3c 4h').compareTo(e('Ks Kd Kc Kh As 2d 3c')) > 0, true);
    });
    test('Quadra de 5: kicker Ás supera kicker Rei', () {
      expect(
        e('5s 5d 5c 5h As 2d 3c').compareTo(e('5h 5s 5d 5c Kd Qh Jc')) > 0,
        true,
      );
    });
    test('Full AAAKK > Full AAAQQ', () {
      expect(e('As Ad Ac Kd Kh 2c 3d').compareTo(e('As Ad Ac Qd Qh 2c 3d')) > 0, true);
    });
    test('Flush A-9 > Flush A-8', () {
      expect(
        e('As 9s 7s 5s 3s Kd Qh').compareTo(e('As 8s 7s 5s 3s Kd Qh')) > 0,
        true,
      );
    });
    test('Sequência roda < sequência até 6', () {
      expect(e('As 2d 3c 4h 5s Kc Qd').compareTo(e('6s 7d 8c 9h Ts Kc Qd')) < 0, true);
    });
    test('Mãos idênticas empatam (0)', () {
      expect(e('As Ad Kd Qc Jh 9s 2d').compareTo(e('Ah Ac Kc Qd Js 9d 2h')), 0);
    });
    test('Par vence carta alta', () {
      expect(
        e('2s 2d Kd Qc Jh 9s 3d').compareTo(e('As Kd Qc Jh 9s 7d 2c')) > 0,
        true,
      );
    });
  });

  test('describe() retorna texto da mão', () {
    expect(HandEvaluatorService.describe(_hand('As Ad Ac Ah Kd Qc 2h')),
        contains('Quadra'));
  });
}
