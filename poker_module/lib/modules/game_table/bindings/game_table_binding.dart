/// ============================================================================
///  game_table_binding.dart
///  Injeção de dependências (GetX) da mesa.
///
///  Registra os serviços globais (barramento de eventos, áudio), o motor do
///  jogo, o controlador de fichas animadas, a camada de rede (socket +
///  repositório) e o viewModel da mesa.
///
///  Aceita parâmetros vindos do lobby: modo (bots/online), nome do hero e o
///  socket já conectado (no online real ou simulado).
/// ============================================================================
import 'package:get/get.dart';

import '../../../models/poker_enums.dart';
import '../../../shared/services/audio_service.dart';
import '../../game_engine/poker_engine_controller.dart';
import '../../game_engine/services/game_events.dart';
import '../../game_engine/services/game_repository.dart';
import '../../game_engine/services/socket_service.dart';
import '../chip_fly_controller.dart';
import '../game_table_controller.dart';

class GameTableBinding extends Bindings {
  GameTableBinding({
    this.mode = GameMode.bots,
    this.heroName = 'Você',
    this.socket,
    this.serverUrl,
  });

  final GameMode mode;
  final String heroName;

  /// Socket já conectado (lobby). Se nulo, o binding cria conforme o modo.
  final SocketService? socket;

  /// URL do servidor WebSocket (online real).
  final String? serverUrl;

  @override
  void dependencies() {
    // 1) Barramento de eventos de domínio (global).
    if (!Get.isRegistered<GameEventBus>()) {
      Get.put(GameEventBus(), permanent: true);
    }

    // 2) Áudio (global) — escuta os eventos do jogo.
    if (!Get.isRegistered<AudioService>()) {
      Get.putAsync<AudioService>(() => AudioService().init(), permanent: true);
    }

    // 3) Motor do jogo — permanente.
    if (!Get.isRegistered<PokerEngineController>()) {
      Get.put<PokerEngineController>(
        PokerEngineController(bus: Get.find<GameEventBus>()),
        permanent: true,
      );
    }

    // 4) Controlador das fichas voadoras.
    if (!Get.isRegistered<ChipFlyController>()) {
      Get.lazyPut<ChipFlyController>(
        () => ChipFlyController(bus: Get.find<GameEventBus>()),
        fenix: true,
      );
    }

    // 5) Camada de rede.
    //    Online + socket vindo do lobby (real ou simulado) usa esse; senão
    //    cria conforme o modo. Bots -> MockSocketService.
    SocketService sock;
    if (socket != null) {
      sock = socket!;
    } else if (mode == GameMode.online) {
      sock = SimulatedSocketService();
    } else {
      sock = MockSocketService();
    }
    if (!Get.isRegistered<SocketService>()) {
      Get.put<SocketService>(sock, permanent: true);
    }

    if (!Get.isRegistered<GameRepository>()) {
      Get.lazyPut<GameRepository>(
        () => GameRepository(socket: Get.find<SocketService>()),
        fenix: true,
      );
    }

    // 6) ViewModel da mesa, passando o modo/nome escolhidos no lobby.
    Get.delete<GameTableController>(force: true);
    Get.lazyPut<GameTableController>(
      () => GameTableController(
        repository: Get.isRegistered<GameRepository>()
            ? Get.find<GameRepository>()
            : null,
        mode: mode,
        heroName: heroName,
      ),
      fenix: true,
    );
  }
}
