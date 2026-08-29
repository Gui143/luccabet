/// ============================================================================
///  hand_evaluator_service.dart  —  ⭐ NÚCLEO DO POKER ENGINE
///
///  Serviço PURO (sem GetX, sem UI, sem efeitos colaterais) que avalia mãos de
///  Texas Hold'em. Recebe as 7 cartas (2 hole + 5 comunitárias) e determina a
///  MELHOR mão de 5 cartas possível, retornando:
///    - a categoria (Royal Flush, Straight Flush, Quadra, Full House, ...)
///    - um vetor de desempate (tiebreaker) que permite comparar duas mãos.
///
///  ESTRATÉGIA:
///  Como temos 7 cartas e a mão final usa 5, mas cada categoria é construída a
///  partir de contagens de rank (pares/trincas/quadras) e do naipe (flush), o
///  algoritmo agrupa as cartas por rank e por naipe e testa as categorias da
///  mais forte para a mais fraca. Como as cartas "extras" só aparecem como
///  kickers, pegar os maiores ranks disponíveis já garante a melhor mão de 5
///  (não é necessário enumerar C(7,5)=21 combinações).
///
///  tiebreaker: lista de inteiros (valores de carta) comparada em ordem.
///    Straight Flush : [carta mais alta da sequência]  (14 = Royal)
///    Quadra         : [rankDaQuadra, kicker]
///    Full House     : [rankDaTrinca, rankDoPar]
///    Flush          : [5 maiores cartas do naipe]
///    Sequência      : [carta mais alta]  (a roda A-2-3-4-5 vale como 5)
///    Trinca         : [rankDaTrinca, kicker1, kicker2]
///    Dois Pares     : [parAlto, parBaixo, kicker]
///    Par            : [rankDoPar, kicker1, kicker2, kicker3]
///    Carta Alta     : [5 maiores ranks]
/// ============================================================================

import '../../../models/card_model.dart';
import '../../../models/poker_enums.dart';

/// Resultado da avaliação de uma mão. É [Comparable] para ordenar vencedores.
class EvaluatedHand implements Comparable<EvaluatedHand> {
  const EvaluatedHand({
    required this.category,
    required this.tiebreaker,
  });

  final HandCategory category;

  /// Vetor de desempate, do mais significativo para o menos.
  final List<int> tiebreaker;

  /// Força numérica única (categoria *peso + tiebreaker) — útil para logs e
  /// para o servidor comparar de forma estável.
  int get strength {
    var acc = category.rankOrder;
    for (final t in tiebreaker) {
      // Cada "nível" comporta 15 valores (ranks 2..14 + 0 para ausente).
      acc = acc * 16 + t;
    }
    return acc;
  }

  @override
  int compareTo(EvaluatedHand other) {
    if (category.rankOrder != other.category.rankOrder) {
      return category.rankOrder.compareTo(other.category.rankOrder);
    }
    final len = tiebreaker.length > other.tiebreaker.length
        ? tiebreaker.length
        : other.tiebreaker.length;
    for (var i = 0; i < len; i++) {
      final a = i < tiebreaker.length ? tiebreaker[i] : 0;
      final b = i < other.tiebreaker.length ? other.tiebreaker[i] : 0;
      if (a != b) return a.compareTo(b);
    }
    return 0;
  }

  bool operator >(EvaluatedHand other) => compareTo(other) > 0;
  bool operator <(EvaluatedHand other) => compareTo(other) < 0;

  @override
  String toString() => '${category.displayName} ($tiebreaker)';
}

class HandEvaluatorService {
  HandEvaluatorService._();

  /// Avalia até 7 cartas e retorna a melhor mão.
  static EvaluatedHand evaluate(List<CardModel> cards) {
    // ---------- 1. Agrupa por rank e por naipe ----------
    final bySuit = <Suit, List<int>>{};
    for (final c in cards) {
      bySuit.putIfAbsent(c.suit, () => <int>[]).add(c.numericValue);
    }

    // Ranks distintos, ordenados do maior para o menor (kickback).
    final distinctRanks =
        cards.map((c) => c.numericValue).toSet().toList()..sort((a, b) => b.compareTo(a));

    // Contagem de cada rank: 2..14.
    final count = <int, int>{};
    for (final c in cards) {
      count[c.numericValue] = (count[c.numericValue] ?? 0) + 1;
    }

    final quads = <int>[];
    final trips = <int>[];
    final pairs = <int>[];
    count.forEach((rank, c) {
      if (c == 4) {
        quads.add(rank);
      } else if (c == 3) {
        trips.add(rank);
      } else if (c == 2) {
        pairs.add(rank);
      }
    });
    quads.sort((a, b) => b.compareTo(a));
    trips.sort((a, b) => b.compareTo(a));
    pairs.sort((a, b) => b.compareTo(a));

    // ---------- 2. Straight Flush (e Royal Flush) ----------
    // Se houver 5+ cartas do mesmo naipe formando sequência, é a mão mais forte.
    for (final suitRanks in bySuit.values) {
      if (suitRanks.length >= 5) {
        final high = _straightHigh(suitRanks.toSet());
        if (high != null) {
          return EvaluatedHand(
            // Roda de flush A-2-3-4-5 é straight flush; Ás-alto é Royal.
            category: high == 14
                ? HandCategory.royalFlush
                : HandCategory.straightFlush,
            tiebreaker: [high],
          );
        }
      }
    }

    // ---------- 3. Quadra (Four of a Kind) ----------
    if (quads.isNotEmpty) {
      final kicker = distinctRanks.firstWhere(
        (r) => r != quads.first,
        orElse: () => 0,
      );
      return EvaluatedHand(
        category: HandCategory.fourOfAKind,
        tiebreaker: [quads.first, kicker],
      );
    }

    // ---------- 4. Full House (trinca + par) ----------
    // Com 7 cartas podem sair duas trincas (ex.: AAA KKK): vira full house
    // usando a trinca maior + a outra trinca como "par".
    if (trips.isNotEmpty && (pairs.isNotEmpty || trips.length >= 2)) {
      final pairRank = pairs.isNotEmpty ? pairs.first : trips[1];
      return EvaluatedHand(
        category: HandCategory.fullHouse,
        tiebreaker: [trips.first, pairRank],
      );
    }

    // ---------- 5. Flush (5 cartas do mesmo naipe) ----------
    for (final suitRanks in bySuit.values) {
      if (suitRanks.length >= 5) {
        final flush = (suitRanks.toList()..sort((a, b) => b.compareTo(a)))
            .take(5)
            .toList();
        return EvaluatedHand(
          category: HandCategory.flush,
          tiebreaker: flush,
        );
      }
    }

    // ---------- 6. Sequência (Straight) ----------
    final straightHigh = _straightHigh(distinctRanks.toSet());
    if (straightHigh != null) {
      return EvaluatedHand(
        category: HandCategory.straight,
        tiebreaker: [straightHigh],
      );
    }

    // ---------- 7. Trinca (Three of a Kind) ----------
    if (trips.isNotEmpty) {
      final kickers =
          distinctRanks.where((r) => r != trips.first).take(2).toList();
      return EvaluatedHand(
        category: HandCategory.threeOfAKind,
        tiebreaker: [trips.first, ...kickers],
      );
    }

    // ---------- 8. Dois Pares (Two Pair) ----------
    if (pairs.length >= 2) {
      final kicker = distinctRanks.firstWhere(
        (r) => r != pairs[0] && r != pairs[1],
        orElse: () => 0,
      );
      return EvaluatedHand(
        category: HandCategory.twoPair,
        tiebreaker: [pairs[0], pairs[1], kicker],
      );
    }

    // ---------- 9. Um Par ----------
    if (pairs.length == 1) {
      final kickers =
          distinctRanks.where((r) => r != pairs.first).take(3).toList();
      return EvaluatedHand(
        category: HandCategory.pair,
        tiebreaker: [pairs.first, ...kickers],
      );
    }

    // ---------- 10. Carta Alta (High Card) ----------
    return EvaluatedHand(
      category: HandCategory.highCard,
      tiebreaker: distinctRanks.take(5).toList(),
    );
  }

  /// Retorna a carta mais alta da MELHOR sequência presente no conjunto de
  /// ranks, ou `null` se não houver sequência.
  ///
  /// Trata o caso especial da "roda" (wheel) A-2-3-4-5: o Ás vale como 1 e a
  /// sequência é reportada com high = 5.
  static int? _straightHigh(Set<int> ranks) {
    final sorted = ranks.toList()..sort((a, b) => b.compareTo(a));
    for (final high in sorted) {
      var isStraight = true;
      for (var i = 0; i < 5; i++) {
        var need = high - i;
        if (need == 1) need = 14; // Ás (14) completa a roda como "1".
        if (!ranks.contains(need)) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) return high;
    }
    return null;
  }

  /// Monta uma descrição legível da mão (para o HUD do showdown).
  static String describe(List<CardModel> cards) {
    final hand = evaluate(cards);
    final rankLabel = {for (final r in CardRank.values) r.value: r.label};
    String fmt(int v) => rankLabel[v] ?? '$v';
    switch (hand.category) {
      case HandCategory.royalFlush:
        return 'Royal Flush ${_suitOf(cards)}';
      case HandCategory.straightFlush:
        return 'Straight Flush até ${fmt(hand.tiebreaker.first)}';
      case HandCategory.fourOfAKind:
        return 'Quadra de ${fmt(hand.tiebreaker.first)}';
      case HandCategory.fullHouse:
        return 'Full House — ${fmt(hand.tiebreaker[0])} com ${fmt(hand.tiebreaker[1])}';
      case HandCategory.flush:
        return 'Flush ${hand.tiebreaker.map(fmt).join(' ')}';
      case HandCategory.straight:
        return 'Sequência até ${fmt(hand.tiebreaker.first)}';
      case HandCategory.threeOfAKind:
        return 'Trinca de ${fmt(hand.tiebreaker.first)}';
      case HandCategory.twoPair:
        return 'Dois Pares ${fmt(hand.tiebreaker[0])} e ${fmt(hand.tiebreaker[1])}';
      case HandCategory.pair:
        return 'Par de ${fmt(hand.tiebreaker.first)}';
      case HandCategory.highCard:
        return 'Carta Alta ${fmt(hand.tiebreaker.first)}';
    }
  }

  static String _suitOf(List<CardModel> cards) {
    final counts = <Suit, int>{};
    for (final c in cards) {
      counts[c.suit] = (counts[c.suit] ?? 0) + 1;
    }
    final best = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    if (best.isNotEmpty && best.first.value >= 5) {
      const sym = {
        Suit.spades: '♠',
        Suit.hearts: '♥',
        Suit.diamonds: '♦',
        Suit.clubs: '♣',
      };
      return sym[best.first.key] ?? '';
    }
    return '';
  }
}
