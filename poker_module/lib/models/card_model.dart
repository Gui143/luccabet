/// ============================================================================
///  card_model.dart
///  Representa UMA carta do baralho.
///
///  Imutável do ponto de vista de domínio; a visibilidade (face virada para
///  cima/baixo) é reativa para a UI animar o "flip" sem recriar a carta.
/// ============================================================================
import 'package:get/get.dart';

import 'poker_enums.dart';

class CardModel {
  CardModel({
    required this.rank,
    required this.suit,
    bool faceUp = false,
  }) : isFaceUp = faceUp.obs;

  /// Valor da carta (2..Ás).
  final CardRank rank;

  /// Naipe.
  final Suit suit;

  /// Se `true`, a carta está virada para cima (todo mundo vê).
  /// É `.obs` (GetX) porque o jogador e os oponentes veem versões diferentes
  /// da mesma carta lógica, e a UI anima a virada.
  final RxBool isFaceUp;

  /// Atalho para o valor numérico usado pelo avaliador de mãos.
  int get numericValue => rank.value;

  /// Símbolo do naipe para renderização (♠♥♦♣).
  String get suitSymbol {
    switch (suit) {
      case Suit.spades:
        return '♠';
      case Suit.hearts:
        return '♥';
      case Suit.diamonds:
        return '♦';
      case Suit.clubs:
        return '♣';
    }
  }

  /// Naipes vermelhos (copas/ouros) vs pretos (espadas/paus).
  bool get isRed => suit == Suit.hearts || suit == Suit.diamonds;

  /// Rótulo curto ex: "A♠", "10♥".
  String get shortLabel => '${rank.label}${suitSymbol}';

  void flip() => isFaceUp.toggle();
  void reveal() => isFaceUp.value = true;
  void hide() => isFaceUp.value = false;

  /// Serialização para a camada WebSocket.
  /// `faceUp` normalmente NÃO vai do servidor para oponentes (a carta hole
  /// do adversário é enviada oculta); aqui expomos para o próprio jogador.
  Map<String, dynamic> toJson() => {
        'rank': rank.toJson(),
        'suit': suit.toJson(),
        'faceUp': isFaceUp.value,
      };

  factory CardModel.fromJson(Map<String, dynamic> json) => CardModel(
        rank: CardRankJson.fromJson(json['rank'] as String),
        suit: SuitJson.fromJson(json['suit'] as String),
        faceUp: json['faceUp'] as bool? ?? false,
      );

  /// Carta "de costas" (placeholder) para slots vazios da mesa — útil para a
  /// UI reservar espaço antes da distribuição.
  factory CardModel.placeholder() => CardModel(
        rank: CardRank.two,
        suit: Suit.spades,
        faceUp: false,
      );

  @override
  String toString() => shortLabel;
}
