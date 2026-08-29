/// ============================================================================
///  player_avatar_widget.dart
///  Avatar circular do jogador (inicial sobre círculo colorido) com anel de
///  "vez ativa" e indicador de fold/all-in.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../models/player_model.dart';
import '../../models/poker_enums.dart';
import '../utils/app_colors.dart';

class PlayerAvatarWidget extends StatelessWidget {
  const PlayerAvatarWidget({
    super.key,
    required this.player,
    this.radius = 26,
  });

  final PlayerModel player;
  final double radius;

  Color get _avatarColor {
    // Cor determinística derivada do id (sem depender de hash de string).
    const palette = [
      AppColors.chipBlue,
      AppColors.chipRed,
      AppColors.chipGreen,
      Color(0xFF7048E8),
      Color(0xFFE8590C),
      Color(0xFF0CA678),
    ];
    var idx = 0;
    for (final c in player.avatarSeed.codeUnits) {
      idx = (idx + c) % palette.length;
    }
    return palette[idx];
  }

  @override
  Widget build(BuildContext context) {
    final initial = player.name.isNotEmpty ? player.name[0].toUpperCase() : '?';

    return Obx(() {
      final isTurn = player.isTurn.value;
      final folded = player.state.value == PlayerState.folded;
      final allIn = player.state.value == PlayerState.allIn;

      return Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isTurn ? AppColors.activeRing : Colors.transparent,
          boxShadow: isTurn
              ? [
                  BoxShadow(
                    color: AppColors.activeRing.withValues(alpha: 0.6),
                    blurRadius: 12,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            CircleAvatar(
              radius: radius,
              backgroundColor: _avatarColor,
              child: Text(
                initial,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: radius * 0.8,
                ),
              ),
            ),
            if (folded)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black.withValues(alpha: 0.55),
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 20),
                ),
              ),
            if (allIn)
              Positioned(
                bottom: -4,
                right: -8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppColors.gold,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'ALL IN',
                    style: TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    });
  }
}
