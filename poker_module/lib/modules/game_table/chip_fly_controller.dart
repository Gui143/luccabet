/// ============================================================================
///  chip_fly_controller.dart
///  Controla as FICHAS VOANDO pela mesa (assento -> pote e pote -> vencedor).
///
///  É um GetxController que mantém uma lista reativa de [FlyingChip]s. Um widget
///  da mesa (camada de animação) escuta essa lista e desenha as fichas com
///  Tween de posição/escala. Ao terminar a animação, a ficha é removida.
///
///  Alimenta-se do [GameEventBus]: apostas disparam voos para o pote; o
///  showdown dispara voos do pote para o vencedor.
/// ============================================================================
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../game_engine/services/game_events.dart';
import 'table_layout.dart';

/// Uma ficha em movimento na mesa.
class FlyingChip {
  FlyingChip({
    required this.id,
    required this.from,
    required this.to,
    required this.color,
    this.amount = 0,
  });

  final int id;
  final Offset from; // fração 0..1 do tamanho da mesa
  final Offset to;
  final Color color;
  final int amount;
}

class ChipFlyController extends GetxController {
  ChipFlyController({GameEventBus? bus}) : _bus = bus;

  final GameEventBus? _bus;
  final RxList<FlyingChip> flying = <FlyingChip>[].obs;
  int _nextId = 0;
  StreamSubscription<GameEvent>? _sub;

  /// Posição fracionária do pote.
  Offset get _pot => TableLayout.potPosition;

  @override
  void onInit() {
    super.onInit();
    final bus = _bus ??
        (Get.isRegistered<GameEventBus>() ? Get.find<GameEventBus>() : null);
    _sub = bus?.stream.listen(_onEvent);
  }

  void _onEvent(GameEvent e) {
    switch (e.type) {
      case GameEventType.bet:
        _flyToPot(e.seat, e.amount);
        break;
      case GameEventType.showdown:
        if (e.seat >= 0) _flyToWinner(e.seat, e.amount);
        break;
      default:
        break;
    }
  }

  /// Dispara algumas fichas do assento [seat] até o pote.
  void _flyToPot(int seat, int amount) {
    final from = TableLayout.positionForSeat(seat);
    const chips = 3;
    for (var i = 0; i < chips; i++) {
      final chip = FlyingChip(
        id: _nextId++,
        from: from,
        to: _pot,
        color: _colorFor(amount),
        amount: amount,
      );
      flying.add(chip);
      // Remove após a animação (duração definida no widget overlay).
      Timer(const Duration(milliseconds: 900), () => flying.remove(chip));
    }
  }

  /// Dispara fichas do pote até o assento vencedor.
  void _flyToWinner(int seat, int amount) {
    final to = TableLayout.positionForSeat(seat);
    const chips = 6;
    for (var i = 0; i < chips; i++) {
      final chip = FlyingChip(
        id: _nextId++,
        from: _pot,
        to: to,
        color: Colors.primaries[math.Random().nextInt(Colors.primaries.length)],
        amount: amount,
      );
      flying.add(chip);
      Timer(const Duration(milliseconds: 1100), () => flying.remove(chip));
    }
  }

  Color _colorFor(int amount) {
    if (amount >= 1000) return const Color(0xFF212529);
    if (amount >= 500) return const Color(0xFF2F6FED);
    if (amount >= 100) return const Color(0xFFE03131);
    return const Color(0xFF2F9E44);
  }

  @override
  void onClose() {
    _sub?.cancel();
    super.onClose();
  }
}
