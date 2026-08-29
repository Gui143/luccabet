/// ============================================================================
///  community_cards_widget.dart
///  A "board": as 5 cartas comunitárias ao centro da mesa (3 flop + turn + river)
///  e o pote. Mostra placeholders até as cartas serem distribuídas.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../models/game_session_model.dart';
import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';
import '../../../shared/widgets/playing_card_widget.dart';

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
          // Pote.
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('💰', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                Text(
                  'Pote: ${Formatters.chips(session.pot.value)}',
                  style: const TextStyle(
                    color: AppColors.gold,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          // As 5 posições de cartas comunitárias.
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(5, (i) {
              final card = i < cards.length ? cards[i] : null;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: PlayingCardWidget(
                  card: card,
                  width: 48,
                  height: 68,
                ),
              );
            }),
          ),
        ],
      );
    });
  }
}
