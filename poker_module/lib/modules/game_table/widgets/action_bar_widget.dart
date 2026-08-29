/// ============================================================================
///  action_bar_widget.dart
///  Barra de ações do jogador (Fold / Check / Call / Raise / All-in).
///  Só fica ativa quando é a vez do hero. Reage ao estado do engine via GetX.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../models/poker_enums.dart';
import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';
import '../../game_engine/poker_engine_controller.dart';

class ActionBarWidget extends StatefulWidget {
  const ActionBarWidget({super.key});

  @override
  State<ActionBarWidget> createState() => _ActionBarWidgetState();
}

class _ActionBarWidgetState extends State<ActionBarWidget> {
  final PokerEngineController engine = Get.find<PokerEngineController>();

  /// Multiplicador do raise sobre o big blind (1x, 2x, 3x...).
  double _raiseMultiplier = 2;

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

      // Valor do raise = aposta atual + (bb * multiplicador), limitado ao stack.
      final raiseTarget = (engine.session.currentBet.value + (bb * _raiseMultiplier).round())
          .clamp(engine.session.currentBet.value + bb, hero.currentBet.value + stack);

      return AnimatedOpacity(
        opacity: isTurn ? 1 : 0.35,
        duration: const Duration(milliseconds: 200),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Slider de raise (habilitado na vez do hero).
            if (isTurn)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Raise', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    SizedBox(
                      width: 180,
                      child: SliderTheme(
                        data: SliderThemeData(
                          activeTrackColor: AppColors.raiseColor,
                          thumbColor: AppColors.gold,
                          overlayColor: AppColors.gold.withValues(alpha: 0.2),
                          trackHeight: 3,
                        ),
                        child: Slider(
                          min: 1,
                          max: 8,
                          divisions: 7,
                          value: _raiseMultiplier.clamp(1, 8),
                          label: '${Formatters.chips(raiseTarget)}',
                          onChanged: isTurn
                              ? (v) => setState(() => _raiseMultiplier = v)
                              : null,
                        ),
                      ),
                    ),
                    Text(
                      Formatters.chips(raiseTarget),
                      style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold),
                    ),
                  ],
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
                  label: stack <= callAmount ? 'All-in' : 'Raise ${Formatters.chips(raiseTarget)}',
                  color: AppColors.raiseColor,
                  icon: Icons.trending_up,
                  enabled: isTurn,
                  onTap: () => engine.playerAction(
                    stack <= callAmount
                        ? PlayerActionType.allIn
                        : PlayerActionType.raiseAction,
                    raiseTo: raiseTarget,
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
      onPressed: enabled ? onTap : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        disabledBackgroundColor: color.withValues(alpha: 0.4),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
      ),
      icon: Icon(icon, size: 18),
      label: Text(label),
    );
  }
}
