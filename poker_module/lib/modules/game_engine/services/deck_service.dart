/// ============================================================================
///  deck_service.dart
///  Baralho padrão de 52 cartas: criação, embaralhamento e distribuição.
///
///  É um serviço puro (sem estado global). O [PokerEngineController] possui
///  uma instância e pede cartas durante a mão. Em produção o baralho é
///  embaralhado no SERVIDOR; aqui ele existe para o modo simulado e para os
///  testes — a interface é a mesma que o repositório usaria para entregar
///  cartas vindas do WebSocket.
/// ============================================================================
import 'dart:math';

import '../../../models/card_model.dart';
import '../../../models/poker_enums.dart';

class DeckService {
  DeckService({Random? random}) : _random = random ?? Random();

  final Random _random;
  final List<CardModel> _cards = <CardModel>[];

  /// Número de cartas restantes no baralho.
  int get remaining => _cards.length;

  /// Cria um baralho novo ordenado (52 cartas) e o embaralha (Fisher–Yates).
  void reset({bool shuffled = true}) {
    _cards
      ..clear()
      ..addAll(_buildFreshDeck());
    if (shuffled) shuffle();
  }

  /// Embaralha in-place usando o algoritmo Fisher–Yates, que garante uma
  /// permutação uniforme.
  void shuffle() {
    for (var i = _cards.length - 1; i > 0; i--) {
      final j = _random.nextInt(i + 1);
      final tmp = _cards[i];
      _cards[i] = _cards[j];
      _cards[j] = tmp;
    }
  }

  /// Compra (distribui) a próxima carta do topo.
  /// [faceUp] define se ela chega visível: cartas comunitárias vêm viradas
  /// para cima; cartas hole do hero vêm viradas para cima; as dos bots, não.
  CardModel deal({bool faceUp = true}) {
    if (_cards.isEmpty) {
      throw StateError('Baralho vazio — chame reset() antes de distribuir.');
    }
    final card = _cards.removeLast();
    if (faceUp) {
      card.reveal();
    } else {
      card.hide();
    }
    return card;
  }

  /// "Queima" uma carta (descarta, sem revelar) — prática do dealer real entre
  /// as ruas. Não afeta a lógica, apenas fidelidade ao jogo.
  CardModel burn() => deal(faceUp: false);

  /// Constrói as 52 cartas (13 ranks × 4 naipes).
  List<CardModel> _buildFreshDeck() {
    final list = <CardModel>[];
    for (final suit in Suit.values) {
      for (final rank in CardRank.values) {
        list.add(CardModel(rank: rank, suit: suit, faceUp: false));
      }
    }
    return list;
  }
}
