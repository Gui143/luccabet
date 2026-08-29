/// ============================================================================
///  chip_widget.dart
///  Pequenas fichas de pôquer usadas nas apostas e na pilha do pote.
/// ============================================================================
import 'package:flutter/material.dart';

import '../../../shared/utils/app_colors.dart';

/// Uma ficha desenhada (disco com listras e valor central).
class ChipWidget extends StatelessWidget {
  const ChipWidget({
    super.key,
    this.size = 22,
    this.color = AppColors.chipRed,
    this.label,
  });

  final double size;
  final Color color;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        border: Border.all(color: Colors.white.withValues(alpha: 0.85), width: 2),
        boxShadow: const [
          BoxShadow(color: Colors.black54, blurRadius: 3, offset: Offset(0, 2)),
        ],
      ),
      alignment: Alignment.center,
      child: Container(
        width: size * 0.55,
        height: size * 0.55,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.92),
        ),
        alignment: Alignment.center,
        child: label != null
            ? FittedBox(
                child: Text(
                  label!,
                  style: TextStyle(
                    fontSize: size * 0.32,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              )
            : null,
      ),
    );
  }
}

/// Escolhe a cor da ficha conforme o valor (para as pilhas de aposta).
Color chipColorFor(int amount) {
  if (amount >= 1000) return AppColors.chipBlack;
  if (amount >= 500) return AppColors.chipBlue;
  if (amount >= 100) return AppColors.chipRed;
  return AppColors.chipGreen;
}

/// Pilha de fichas representando um valor (desenha ~1 ficha a cada 100).
class ChipStackWidget extends StatelessWidget {
  const ChipStackWidget({super.key, required this.amount, this.size = 18});

  final int amount;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (amount <= 0) return const SizedBox.shrink();
    final count = (amount / 100).ceil().clamp(1, 8);
    return SizedBox(
      width: size,
      height: size * (0.55 + count * 0.18),
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          for (var i = 0; i < count; i++)
            Positioned(
              bottom: i * size * 0.16,
              child: ChipWidget(size: size, color: chipColorFor(amount)),
            ),
        ],
      ),
    );
  }
}
