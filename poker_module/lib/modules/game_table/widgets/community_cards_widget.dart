/// ============================================================================
///  community_cards_widget.dart
///  A "board": as 5 cartas comunitárias ao centro da mesa (3 flop + turn + river)
///  e o pote animado. Mostra placeholders até as cartas serem distribuídas.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../models/game_session_model.dart';
import '../../../shared/widgets/playing_card_widget.dart';
import 'flying_chips_overlay.dart';

class CommunityCardsWidget extends StatelessWidget {
  const CommunityCardsWidget({super.key, required this.session});

  final GameSessionModel session;

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final cards = session.communityCards;
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pote animado (contagem + pulse).
          AnimatedPot(pot: session.pot.value),
          const SizedBox(height: 10),
          // As 5 posições de cartas comunitárias.
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(5, (i) {
              final card = i < cards.length ? cards[i] : null;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: PlayingCardWidget(card: card, width: 48, height: 68),
              );
            }),
          ),
        ],
      );
    });
  }
}
