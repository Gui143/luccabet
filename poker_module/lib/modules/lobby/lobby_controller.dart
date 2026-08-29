/// ============================================================================
///  lobby_controller.dart
///  ViewModel da tela de entrada: o jogador escolhe o nome e o MODO
///  (bots offline ou online multiplayer) e, no online, o servidor WebSocket.
/// ============================================================================
import 'dart:async';

import 'package:get/get.dart';

import '../../models/poker_enums.dart';
import '../game_engine/services/game_events.dart';
import '../game_engine/services/socket_service.dart';

class LobbyController extends GetxController {
  final RxString playerName = 'Você'.obs;
  final Rx<GameMode> mode = GameMode.bots.obs;
  final Rx<ConnectionStatus> connection = ConnectionStatus.disconnected.obs;
  final RxnString serverUrl = RxnString();
  final RxnString error = RxnString();

  SocketService? _socket;

  /// Atalhos para os botões de modo.
  void setMode(GameMode m) => mode.value = m;

  void setName(String v) => playerName.value = v.trim().isEmpty ? 'Você' : v.trim();

  /// Conecta (no online real) e navega para a mesa.
  /// Retorna true se conseguiu "entrar na sala".
  Future<bool> enterTable() async {
    error.value = null;

    if (mode.value == GameMode.online) {
      connection.value = ConnectionStatus.connecting;
      try {
        // Se uma URL de servidor foi informada, tenta o WebSocket REAL.
        final url = serverUrl.value;
        if (url != null && url.startsWith('ws')) {
          final s = WebSocketSocketService();
          await s.connect(url: url, playerName: playerName.value)
              .timeout(const Duration(seconds: 6));
          _socket = s;
        } else {
          // Sem servidor: usa o simulado (demo de multiplayer com latência).
          final s = SimulatedSocketService();
          await s.connect(playerName: playerName.value);
          _socket = s;
        }
        connection.value = ConnectionStatus.connected;
      } on TimeoutException {
        connection.value = ConnectionStatus.error;
        error.value = 'Não foi possível conectar ao servidor.';
        return false;
      } catch (e) {
        connection.value = ConnectionStatus.error;
        error.value = 'Erro de conexão. Usando sala simulada.';
        // Cai para o simulado para não travar a experiência.
        final s = SimulatedSocketService();
        await s.connect(playerName: playerName.value);
        _socket = s;
        connection.value = ConnectionStatus.connected;
      }
    }

    return true;
  }

  SocketService? get socket => _socket;

  /// Som de clique no lobby.
  void tap() {
    if (Get.isRegistered<GameEventBus>()) {
      Get.find<GameEventBus>().emit(const GameEvent(type: GameEventType.uiTap));
    }
  }
}
