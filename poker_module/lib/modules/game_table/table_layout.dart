/// ============================================================================
///  table_layout.dart
///  Constantes de posicionamento dos assentos e do pote.
///
///  Ficam centralizadas para que a tela (Stack/Positioned) e as animações de
///  fichas (que precisam saber de ONDE e PARA ONDE voam) usem exatamente as
///  mesmas coordenadas relativas.
/// ============================================================================
import 'dart:math' as math;

import 'package:flutter/material.dart';

class TableLayout {
  TableLayout._();

  /// Número de assentos suportados pela mesa padrão.
  static const int seatCount = 6;

  /// Posições relativas (frações 0..1 de largura/altura) dos assentos.
  /// Índice 0 = hero (embaixo, centro); depois em sentido horário.
  static const List<Offset> seatPositions = [
    Offset(0.50, 0.80), // 0 hero
    Offset(0.15, 0.70), // 1
    Offset(0.07, 0.40), // 2
    Offset(0.22, 0.12), // 3
    Offset(0.78, 0.12), // 4
    Offset(0.93, 0.40), // 5
  ];

  /// Posição relativa do pote (centro da mesa).
  static const Offset potPosition = Offset(0.50, 0.40);

  /// Converte uma posição relativa (0..1) em Alignment (-1..1).
  static Alignment alignmentOf(Offset rel) =>
      Alignment(rel.dx * 2 - 1, rel.dy * 2 - 1);

  /// Posição relativa de um assento pelo índice (com fallback distribuindo em
  /// elipse para mesas com mais jogadores).
  static Offset positionForSeat(int seat, {int count = seatCount}) {
    if (seat < seatPositions.length) return seatPositions[seat];
    final angle = (seat / count) * 2 * math.pi - math.pi / 2;
    return Offset(
      0.5 + 0.42 * math.cos(angle),
      0.5 + 0.38 * math.sin(angle),
    );
  }
}
