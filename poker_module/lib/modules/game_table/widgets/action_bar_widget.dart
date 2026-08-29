/// ============================================================================
///  action_bar_widget.dart
///  Barra de ações do jogador (Fold / Check / Call / Raise / All-in).
///  Integra o [RaiseSliderWidget] (gesto arrastável) e os sons/háptica.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../models/poker_enums.dart';
import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';
import '../../game_engine/services/game_events.dart';
import '../../game_engine/poker_engine_controller.dart';
import 'raise_slider_widget.dart';

class ActionBarWidget extends StatefulWidget {
  const ActionBarWidget({super.key});

  @override
  State<ActionBarWidget> createState() => _ActionBarWidgetState();
}

class _ActionBarWidgetState extends State<ActionBarWidget> {
  final PokerEngineController engine = Get.find<PokerEngineController>();

  int _raiseTarget = 0;

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final hero = engine.hero;
      if (hero == null) return const SizedBox.shrink();

      final isTurn = hero.isTurn.value;
      final callAmount = engine.callAmountForHero();
      final canCheck = callAmount == 0;
      final bb = engine.session.bigBlind.value;
      final stack = hero.stack.value;
      final curBet = engine.session.currentBet.value;

      // Limites do raise.
      final minRaise = curBet + bb; // pelo menos +1 BB
      final maxRaise = hero.currentBet.value + stack; // all-in
      final effectiveMin = minRaise.clamp(0, maxRaise);
      if (_raiseTarget < effectiveMin || _raiseTarget > maxRaise) {
        _raiseTarget = (curBet + bb * 2).clamp(effectiveMin, maxRaise);
      }

      final allIn = stack <= callAmount;

      return AnimatedOpacity(
        opacity: isTurn ? 1 : 0.30,
        duration: const Duration(milliseconds: 200),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isTurn && !allIn)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: RaiseSliderWidget(
                  value: _raiseTarget,
                  min: effectiveMin,
                  max: maxRaise,
                  pot: engine.session.pot.value,
                  bigBlind: bb,
                  onChanged: (v) => setState(() => _raiseTarget = v),
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ActionButton(
                  label: 'Fold',
                  color: AppColors.fold,
                  icon: Icons.close,
                  enabled: isTurn,
                  onTap: () => engine.playerAction(PlayerActionType.fold),
                ),
                const SizedBox(width: 10),
                _ActionButton(
                  label: canCheck
                      ? 'Check'
                      : 'Call ${Formatters.chips(callAmount)}',
                  color: canCheck ? AppColors.checkColor : AppColors.call,
                  icon: canCheck ? Icons.check : Icons.call_received,
                  enabled: isTurn,
                  onTap: () => engine.playerAction(
                    canCheck ? PlayerActionType.check : PlayerActionType.call,
                  ),
                ),
                const SizedBox(width: 10),
                _ActionButton(
                  label: allIn
                      ? 'All-in ${Formatters.chips(stack)}'
                      : 'Raise ${Formatters.chips(_raiseTarget)}',
                  color: AppColors.raiseColor,
                  icon: allIn ? Icons.bolt : Icons.trending_up,
                  enabled: isTurn,
                  onTap: () => engine.playerAction(
                    allIn
                        ? PlayerActionType.allIn
                        : PlayerActionType.raiseAction,
                    raiseTo: _raiseTarget,
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    });
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
    this.enabled = true,
  });

  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: enabled
          ? () {
              // Som/háptica de toque.
              if (Get.isRegistered<GameEventBus>()) {
                Get.find<GameEventBus>()
                    .emit(const GameEvent(type: GameEventType.uiTap));
              }
              onTap();
            }
          : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        disabledBackgroundColor: color.withValues(alpha: 0.35),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
      ),
      icon: Icon(icon, size: 18),
      label: Text(label),
    );
  }
}
