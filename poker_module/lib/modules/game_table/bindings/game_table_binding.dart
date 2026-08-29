/// ============================================================================
///  game_table_binding.dart
///  Injeção de dependências (GetX) da feature da mesa.
///
///  Registra, na ordem:
///    1. [PokerEngineController]  — motor do jogo, singleton permanente.
///    2. [SocketService]           — transporte (Mock por padrão; trocar pelo
///                                   WebSocketSocketService quando houver backend).
///    3. [GameRepository]          — fronteira socket <-> engine.
///    4. [GameTableController]     — viewModel da tela.
/// ============================================================================
import 'package:get/get.dart';

import '../../game_engine/poker_engine_controller.dart';
import '../../game_engine/services/game_repository.dart';
import '../../game_engine/services/socket_service.dart';
import '../game_table_controller.dart';

class GameTableBinding extends Bindings {
  @override
  void dependencies() {
    // 1) Motor do jogo — permanente para sobreviver entre telas.
    if (!Get.isRegistered<PokerEngineController>()) {
      Get.put<PokerEngineController>(PokerEngineController(), permanent: true);
    }

    // 2) Camada de rede.
    //    >>> Para o backend real: substitua MockSocketService por
    //        WebSocketSocketService() e chame repository.connect(url: ...).
    if (!Get.isRegistered<SocketService>()) {
      Get.lazyPut<SocketService>(() => MockSocketService(), fenix: true);
    }

    // 3) Repositório (protocolo de eventos).
    if (!Get.isRegistered<GameRepository>()) {
      Get.lazyPut<GameRepository>(
        () => GameRepository(socket: Get.find<SocketService>()),
        fenix: true,
      );
    }

    // 4) ViewModel da mesa.
    if (!Get.isRegistered<GameTableController>()) {
      Get.lazyPut<GameTableController>(
        () => GameTableController(repository: Get.find<GameRepository>()),
        fenix: true,
      );
    }
  }
}
