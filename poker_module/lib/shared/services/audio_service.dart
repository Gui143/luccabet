/// ============================================================================
///  audio_service.dart
///  Serviço de efeitos sonoros do jogo (GetxService global).
///
///  - Usa `audioplayers` com um PEQUENO POOL de players para permitir sobreposição
///    (vários cliques de ficha ao mesmo tempo).
///  - Os WAVs foram gerados proceduralmente e ficam em assets/sounds/.
///  - Escuta o [GameEventBus]: o engine emite eventos e aqui decidimos o som,
///    sem a lógica de poker conhecer detalhes de áudio.
///  - Suporta mute global e vibração (haptics) opcional.
/// ============================================================================
import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';

import '../../modules/game_engine/services/game_events.dart';

enum GameSound {
  chip('chip.wav'),
  card('card.wav'),
  click('click.wav'),
  raise('raise.wav'),
  fold('fold.wav'),
  turn('turn.wav'),
  win('win.wav'),
  lose('lose.wav');

  const GameSound(this.asset);
  final String asset;
}

class AudioService extends GetxService {
  static const int _poolSize = 6;
  final List<AudioPlayer> _pool = [];
  int _cursor = 0;

  final RxBool muted = false.obs;

  StreamSubscription<GameEvent>? _sub;

  Future<AudioService> init() async {
    for (var i = 0; i < _poolSize; i++) {
      final p = AudioPlayer();
      await p.setReleaseMode(ReleaseMode.stop);
      await p.setPlayerMode(PlayerMode.lowLatency);
      _pool.add(p);
    }
    // Liga aos eventos do jogo.
    final bus = Get.isRegistered<GameEventBus>()
        ? Get.find<GameEventBus>()
        : Get.put(GameEventBus(), permanent: true);
    _sub = bus.stream.listen(_onGameEvent);
    return this;
  }

  /// Toca um som (respeita mute). Ignora erros de plataforma.
  Future<void> play(GameSound sound, {double volume = 1.0}) async {
    if (muted.value) return;
    try {
      final player = _pool[_cursor];
      _cursor = (_cursor + 1) % _poolSize;
      await player.stop();
      await player.setVolume(volume.clamp(0.0, 1.0));
      await player.play(AssetSource('sounds/${sound.asset}'));
    } catch (_) {
      // Em plataformas sem som ou antes do primeiro frame, ignora silencioso.
    }
  }

  void toggleMute() => muted.value = !muted.value;

  /// Vibração curta (haptic) — usada em ações e ticks do slider.
  void haptic({HapticType type = HapticType.light}) {
    switch (type) {
      case HapticType.light:
        HapticFeedback.lightImpact();
        break;
      case HapticType.medium:
        HapticFeedback.mediumImpact();
        break;
      case HapticType.heavy:
        HapticFeedback.heavyImpact();
        break;
      case HapticType.selection:
        HapticFeedback.selectionClick();
        break;
    }
  }

  void _onGameEvent(GameEvent e) {
    switch (e.type) {
      case GameEventType.bet:
        play(GameSound.chip, volume: 0.9);
        if (e.isHero) haptic(type: HapticType.medium);
        break;
      case GameEventType.cardDealt:
        play(GameSound.card, volume: 0.7);
        break;
      case GameEventType.fold:
        play(GameSound.fold, volume: 0.8);
        if (e.isHero) haptic(type: HapticType.heavy);
        break;
      case GameEventType.turnChanged:
        if (e.isHero) {
          play(GameSound.turn, volume: 0.9);
          haptic(type: HapticType.medium);
        }
        break;
      case GameEventType.phaseChanged:
        play(GameSound.card, volume: 0.8);
        break;
      case GameEventType.showdown:
        play(e.isWin ? GameSound.win : GameSound.lose, volume: 1.0);
        if (e.isWin) haptic(type: HapticType.heavy);
        break;
      case GameEventType.winnerByFold:
        if (e.isWin) play(GameSound.win, volume: 0.9);
        break;
      case GameEventType.uiTap:
        play(GameSound.click, volume: 0.6);
        haptic(type: HapticType.selection);
        break;
    }
  }

  @override
  void onClose() {
    _sub?.cancel();
    for (final p in _pool) {
      p.dispose();
    }
    super.onClose();
  }
}

enum HapticType { light, medium, heavy, selection }
