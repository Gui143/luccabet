/// ============================================================================
///  player_seat_widget.dart
///  Assento de um jogador na mesa: avatar, nome (censurado para oponentes),
///  stack, aposta atual, cartas hole, botão do dealer e selo de ação.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../game_table_controller.dart';
import '../../../models/player_model.dart';
import '../../../models/poker_enums.dart';
import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';
import '../../../shared/widgets/playing_card_widget.dart';
import 'chip_widget.dart';
import '../../../shared/widgets/player_avatar_widget.dart';

class PlayerSeatWidget extends StatelessWidget {
  const PlayerSeatWidget({super.key, required this.player, this.compact = false});

  final PlayerModel player;
  final bool compact;

  /// Nome a exibir: usa o GameTableController (bots censurado, online real).
  String get _name {
    if (player.isHero) return player.name;
    if (Get.isRegistered<GameTableController>()) {
      return Get.find<GameTableController>().displayNameFor(player);
    }
    return player.displayName;
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final folded = player.state.value == PlayerState.folded;
      final sittingOut = player.state.value == PlayerState.sittingOut;

      return Opacity(
        opacity: folded ? 0.45 : 1,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Cartas hole (visíveis para o hero; para bots aparecem de costas
            // até o showdown, quando o engine as revela).
            if (player.holeCards.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final c in player.holeCards)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: PlayingCardWidget(
                          card: c,
                          width: compact ? 30 : 38,
                          height: compact ? 42 : 54,
                        ),
                      ),
                  ],
                ),
              ),
            Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    PlayerAvatarWidget(player: player, radius: compact ? 22 : 28),
                    // Botão do dealer (D).
                    if (player.hasButton.value)
                      Positioned(
                        bottom: -4,
                        left: -6,
                        child: _dealerButton(),
                      ),
                  ],
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Text(
                          _name,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        if (player.isHero)
                          Container(
                            margin: const EdgeInsets.only(left: 5),
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.chipBlue,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('VOCÊ',
                                style: TextStyle(fontSize: 8, color: Colors.white, fontWeight: FontWeight.bold)),
                          )
                        else if (player.isRemote)
                          Container(
                            margin: const EdgeInsets.only(left: 5),
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.call,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('${player.latencyMs.value}ms',
                                style: const TextStyle(fontSize: 8, color: Colors.white, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const ChipWidget(size: 16, color: AppColors.gold),
                        const SizedBox(width: 5),
                        Text(
                          Formatters.chips(player.stack.value),
                          style: const TextStyle(
                              color: AppColors.gold,
                              fontSize: 13,
                              fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 4),
            // Aposta atual da rua + selo de ação.
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (player.currentBet.value > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.chipBlack,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
                    ),
                    child: Text(
                      Formatters.chips(player.currentBet.value),
                      style: const TextStyle(color: AppColors.gold, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                if (player.lastAction.value != null) ...[
                  const SizedBox(width: 6),
                  _actionBadge(player.lastAction.value!),
                ],
              ],
            ),
            if (sittingOut)
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Text('sem fichas',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
              ),
          ],
        ),
      );
    });
  }

  Widget _dealerButton() {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        color: AppColors.buttonDealer,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.black26),
        boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 3)],
      ),
      alignment: Alignment.center,
      child: const Text('D',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
    );
  }

  Widget _actionBadge(PlayerActionType action) {
    Color color;
    switch (action) {
      case PlayerActionType.fold:
        color = AppColors.fold;
        break;
      case PlayerActionType.call:
      case PlayerActionType.check:
        color = AppColors.call;
        break;
      case PlayerActionType.bet:
      case PlayerActionType.raiseAction:
      case PlayerActionType.allIn:
        color = AppColors.raiseColor;
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        Formatters.actionLabel(action),
        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
      ),
    );
  }
}
