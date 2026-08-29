/// ============================================================================
///  flying_chips_overlay.dart
///  Camada (Stack) que desenha as fichas voadoras e o pote animado.
///
///  - [FlyingChipsOverlay] lê a lista do [ChipFlyController] e anima cada ficha
///    de `from` até `to` (frações da tela) com uma parábola (arc) e escala.
///  - [AnimatedPot] faz o valor do pote "contar" (count-up) e dá um pulse quando
///    aumenta, além de mostrar uma pilha de fichas.
/// ============================================================================
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';
import '../chip_fly_controller.dart';
import 'chip_widget.dart';

/// Overlay de fichas voadoras — posicionado para preencher a mesa (Stack).
class FlyingChipsOverlay extends StatelessWidget {
  const FlyingChipsOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    if (!Get.isRegistered<ChipFlyController>()) {
      return const SizedBox.shrink();
    }
    final controller = Get.find<ChipFlyController>();
    return Positioned.fill(
      child: IgnorePointer(
        child: Obx(
          () => Stack(
            children: [
              for (final chip in controller.flying)
                _FlyingChipView(key: ValueKey(chip.id), chip: chip),
            ],
          ),
        ),
      ),
    );
  }
}

class _FlyingChipView extends StatefulWidget {
  const _FlyingChipView({super.key, required this.chip});
  final FlyingChip chip;

  @override
  State<_FlyingChipView> createState() => _FlyingChipViewState();
}

class _FlyingChipViewState extends State<_FlyingChipView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final size = MediaQuery.of(context).size;
        final t = Curves.easeInOut.transform(_c.value);

        // Posição linear interpolada.
        final dx = widget.chip.from.dx +
            (widget.chip.to.dx - widget.chip.from.dx) * t;
        final dy = widget.chip.from.dy +
            (widget.chip.to.dy - widget.chip.from.dy) * t;

        // Arco para cima (parábola): -0.12 de fração no pico.
        final arc = -math.sin(t * math.pi) * 0.10;

        final pos = Offset(dx * size.width, (dy + arc) * size.height);
        final scale = 0.7 + 0.3 * t;

        return Positioned(
          left: pos.dx - 12,
          top: pos.dy - 12,
          child: Transform.scale(
            scale: scale,
            child: Opacity(
              opacity: 0.6 + 0.4 * (1 - (t - 0.5).abs() * 2).clamp(0, 1),
              child: ChipWidget(size: 22, color: widget.chip.color),
            ),
          ),
        );
      },
    );
  }
}

/// Pote com contagem animada do valor e pulse quando muda.
class AnimatedPot extends StatefulWidget {
  const AnimatedPot({super.key, required this.pot});
  final int pot;

  @override
  State<AnimatedPot> createState() => _AnimatedPotState();
}

class _AnimatedPotState extends State<AnimatedPot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;
  int _displayed = 0;

  @override
  void initState() {
    super.initState();
    _displayed = widget.pot;
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
  }

  @override
  void didUpdateWidget(covariant AnimatedPot old) {
    super.didUpdateWidget(old);
    if (widget.pot != old.pot) {
      _pulse.forward(from: 0);
      _animateTo(widget.pot);
    }
  }

  void _animateTo(int target) {
    // Count-up simples via microtasks escalonados.
    final start = _displayed;
    final steps = 8;
    for (var i = 1; i <= steps; i++) {
      Future.delayed(Duration(milliseconds: 18 * i), () {
        if (!mounted) return;
        setState(() {
          _displayed = start + ((target - start) * i / steps).round();
        });
      });
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: Tween<double>(begin: 1, end: 1.12).animate(
        CurvedAnimation(parent: _pulse, curve: Curves.elasticOut),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ChipWidget(size: 20, color: AppColors.chipRed),
            const SizedBox(width: 8),
            Text(
              'Pote: ${Formatters.chips(_displayed)}',
              style: const TextStyle(
                color: AppColors.gold,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
