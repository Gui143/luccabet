/// ============================================================================
///  playing_card_widget.dart
///  Widget de carta de baralho (frente e verso), com animação de flip quando a
///  visibilidade muda. É reativo: lê [CardModel.isFaceUp] via Obx/GetX.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../models/card_model.dart';
import '../utils/app_colors.dart';

class PlayingCardWidget extends StatelessWidget {
  const PlayingCardWidget({
    super.key,
    this.card,
    this.width = 52,
    this.height = 74,
    this.faceUp = false,
  });

  /// A carta (pode ser null para um slot vazio -> desenha um espaço "de costas"
  /// transparente).
  final CardModel? card;

  final double width;
  final double height;

  /// Se não houver [card], controla se o placeholder vira um verso ou espaço.
  final bool faceUp;

  @override
  Widget build(BuildContext context) {
    // Se a carta for reativa (tem isFaceUp .obs), reagimos ao flip.
    final Widget content = card == null
        ? _emptySlot()
        : Obx(() {
            final up = card!.isFaceUp.value;
            return AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, anim) => RotationYTransition(
                turns: Tween<double>(begin: 0.9, end: 1).animate(anim),
                child: FadeTransition(opacity: anim, child: child),
              ),
              child: up
                  ? _cardFace(key: ValueKey('face_${card!.shortLabel}'))
                  : _cardBack(key: const ValueKey('back')),
            );
          });

    return SizedBox(width: width, height: height, child: content);
  }

  // ---------- Frente da carta ----------
  Widget _cardFace({Key? key}) {
    final color = card!.isRed ? AppColors.suitRed : AppColors.suitBlack;
    return Container(
      key: key,
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.cardFace,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.cardStroke, width: 1),
        boxShadow: const [
          BoxShadow(color: Colors.black38, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            card!.rank.label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: width * 0.26,
              height: 1,
            ),
          ),
          Center(
            child: Text(
              card!.suitSymbol,
              style: TextStyle(
                color: color,
                fontSize: width * 0.46,
                height: 1,
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomRight,
            child: Text(
              card!.rank.label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: width * 0.26,
                height: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- Verso da carta ----------
  Widget _cardBack({Key? key}) {
    return Container(
      key: key,
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.cardBack,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.cardBackPattern, width: 2),
        boxShadow: const [
          BoxShadow(color: Colors.black38, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      child: CustomPaint(
        size: Size(width, height),
        painter: _CardBackPainter(),
      ),
    );
  }

  // ---------- Slot vazio (reserva espaço) ----------
  Widget _emptySlot() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
    );
  }
}

/// Padrão decorativo do verso da carta.
class _CardBackPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.cardBackPattern
      ..strokeWidth = 1.0;
    const step = 7.0;
    for (double x = -size.height; x < size.width; x += step) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x + size.height, size.height),
        paint,
      );
      canvas.drawLine(
        Offset(x, size.height),
        Offset(x + size.height, 0),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Transição simples de "giro em Y" (sem depender de pacotes extras).
class RotationYTransition extends AnimatedWidget {
  const RotationYTransition({
    super.key,
    required this.turns,
    required this.child,
  }) : super(listenable: turns);

  final Animation<double> turns;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final value = turns.value;
    final angle = (1 - value) * 0.5; // leve rotação
    return Transform(
      alignment: Alignment.center,
      transform: Matrix4.identity()
        ..setEntry(3, 2, 0.001) // perspectiva
        ..rotateY(angle),
      child: child,
    );
  }
}
