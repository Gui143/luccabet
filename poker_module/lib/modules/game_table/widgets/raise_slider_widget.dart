/// ============================================================================
///  raise_slider_widget.dart
///  Slider de raise ARRASTÁVEL POR GESTO.
///
///  - Track customizada desenhada com [CustomPaint] (preenchimento dourado e
///    marcações); o usuário arrasta o polegar (GestureDetector onPan/onTapDown).
///  - Mostra o valor total da aposta (ex.: "Raise para 120") e háptica a cada
///    passo do slider (selectionClick).
///  - Botões de aposta rápida: Min (BB), 1/2 pote, Pote, All-in.
///  - Funciona em Web (mouse/dedo) e Desktop (arrastar com o ponteiro).
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';

class RaiseSliderWidget extends StatelessWidget {
  const RaiseSliderWidget({
    super.key,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    this.onCommit,
    this.pot = 0,
    this.bigBlind = 20,
  });

  /// Valor atual do raise (total apostado na rua).
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;
  final VoidCallback? onCommit;
  final int pot;
  final int bigBlind;

  @override
  Widget build(BuildContext context) {
    final safeMin = min < max ? min : max;
    final clamped = value.clamp(safeMin, max);
    final fraction = ((clamped - safeMin) / (max - safeMin).clamp(1, 1 << 30))
        .clamp(0.0, 1.0)
        .toDouble();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Valor + botões rápidos.
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _quickChip('Min', safeMin),
            _quickChip('½ Pote', (pot ~/ 2).clamp(safeMin, max)),
            _quickChip('Pote', pot.clamp(safeMin, max)),
            _quickChip('All-in', max, highlight: true),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Raise ${Formatters.chips(clamped)}',
              style: const TextStyle(
                color: AppColors.gold,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            const SizedBox(width: 10),
            // A track arrastável.
            SizedBox(
              width: 220,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapDown: (d) => _updateFromPosition(d.localPosition, constraints.maxWidth, safeMin, max),
                    onHorizontalDragStart: (d) =>
                        _updateFromPosition(d.localPosition, constraints.maxWidth, safeMin, max),
                    onHorizontalDragUpdate: (d) =>
                        _updateFromPosition(d.localPosition, constraints.maxWidth, safeMin, max),
                    onHorizontalDragEnd: (_) => onCommit?.call(),
                    child: SizedBox(
                      height: 34,
                      child: CustomPaint(
                        painter: _RaiseTrackPainter(fraction: fraction),
                        child: Container(),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _quickChip(String label, int target, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onChanged(target.clamp(min < max ? min : max, max));
          onCommit?.call();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            color: highlight ? AppColors.raiseColor : Colors.white.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: highlight ? Colors.black : AppColors.textPrimary,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  void _updateFromPosition(Offset local, double width, int lo, int hi) {
    final frac = (local.dx / width).clamp(0.0, 1.0);
    // Passos de 1 big blind para um toque "táctil".
    final raw = lo + (frac * (hi - lo));
    final stepped = (raw / bigBlind).round() * bigBlind;
    final next = stepped.clamp(lo, hi);
    if (next != value) {
      HapticFeedback.selectionClick();
      onChanged(next);
    }
  }
}

/// Track do slider: fundo, preenchimento dourado e polegar.
class _RaiseTrackPainter extends CustomPainter {
  _RaiseTrackPainter({required this.fraction});
  final double fraction;

  @override
  void paint(Canvas canvas, Size size) {
    const h = 8.0;
    final cy = size.height / 2;
    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, cy - h / 2, size.width, h),
      const Radius.circular(h / 2),
    );
    // Fundo.
    canvas.drawRRect(rect, Paint()..color = Colors.white.withValues(alpha: 0.15));

    // Preenchimento.
    final fillWidth = (size.width * fraction).clamp(h, size.width);
    final fill = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, cy - h / 2, fillWidth, h),
      const Radius.circular(h / 2),
    );
    canvas.drawRRect(
      fill,
      Paint()
        ..shader = const LinearGradient(
          colors: [AppColors.gold, AppColors.raiseColor],
        ).createShader(Rect.fromLTWH(0, 0, size.width, h)),
    );

    // Marcações.
    final tick = Paint()..color = Colors.white.withValues(alpha: 0.35);
    for (var i = 1; i <= 3; i++) {
      final x = size.width * i / 4;
      canvas.drawCircle(Offset(x, cy), 1.2, tick);
    }

    // Polegar.
    final tx = (size.width * fraction).clamp(10.0, size.width - 10.0);
    canvas.drawCircle(
      Offset(tx, cy),
      11,
      Paint()..color = AppColors.gold,
    );
    canvas.drawCircle(
      Offset(tx, cy),
      11,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = Colors.white,
    );
  }

  @override
  bool shouldRepaint(covariant _RaiseTrackPainter old) => old.fraction != fraction;
}
