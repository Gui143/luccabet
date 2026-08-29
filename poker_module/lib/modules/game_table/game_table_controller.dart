/// ============================================================================
///  game_table_controller.dart
///  ViewModel da TELA da mesa.
///
///  Cuida APENAS do que é visual/interação:
///    - inicializa a mesa no modo escolhido (bots ou online) e inicia as mãos;
///    - aplica a CENSURA DINÂMICA dos nomes (bots censurados; jogadores
///      remotos do online exibem o nome real);
///    - controla flags de animação e o painel de vencedor;
///    - expõe status de conexão (modo online).
///
///  Todas as regras de poker ficam no [PokerEngineController].
/// ============================================================================
import 'dart:async';

import 'package:get/get.dart';

import '../../models/player_model.dart';
import '../../models/poker_enums.dart';
import '../../shared/utils/name_masker.dart';
import '../game_engine/poker_engine_controller.dart';
import '../game_engine/services/game_events.dart';
import '../game_engine/services/game_repository.dart';

class GameTableController extends GetxController {
  GameTableController({
    this.repository,
    this.mode = GameMode.bots,
    this.heroName = 'Você',
  });

  final GameRepository? repository;
  final GameMode mode;
  final String heroName;

  late final PokerEngineController engine;

  final RxBool isAnimating = false.obs;
  final RxBool showWinnerPanel = false.obs;
  final RxInt visibleSuffix = 5.obs;
  final Rx<ConnectionStatus> connection = ConnectionStatus.disconnected.obs;

  Timer? _winnerTimer;
  Timer? _autoHandTimer;

  @override
  void onInit() {
    super.onInit();
    engine = Get.find<PokerEngineController>();

    // Liga o repositório ao engine: eventos do servidor -> applyServerEvent.
    repository?.onServerEvent = _onServerEvent;

    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final isOnline = mode == GameMode.online;
    if (isOnline) {
      connection.value = ConnectionStatus.connecting;
      try {
        await repository?.connect();
        connection.value = ConnectionStatus.connected;
        engine.session.connection.value = ConnectionStatus.connected;
      } catch (_) {
        connection.value = ConnectionStatus.error;
      }
    }

    // Configura a mesa. No modo online os "oponentes" são remotos (nomes
    // reais); no modo bots são IA com nomes censurados.
    engine.setupTable(
      heroName: heroName,
      playerCount: 6,
      startingStack: 1000,
      mode: mode,
    );

    await Future<void>.delayed(const Duration(milliseconds: 500));
    await startNewHand();
  }

  /// Eventos vindos do socket (servidor real ou simulado).
  void _onServerEvent(Map<String, dynamic> event) {
    engine.applyServerEvent(event);
  }

  Future<void> startNewHand() async {
    showWinnerPanel.value = false;
    isAnimating.value = true;
    await engine.startHand();
    isAnimating.value = false;
    _watchForShowdown();
  }

  void _watchForShowdown() {
    _winnerTimer?.cancel();
    _winnerTimer = Timer.periodic(const Duration(milliseconds: 300), (t) {
      if (engine.results.isNotEmpty) {
        showWinnerPanel.value = true;
        t.cancel();
      } else if (engine.session.isWaiting && !engine.isDealing.value) {
        t.cancel();
      }
    });
  }

  // ------------------------------------------------------------
  //  Censura dinâmica de nomes
  // ------------------------------------------------------------

  /// Nome a exibir:
  ///  - hero: nome inteiro.
  ///  - online (remotos): nome real do usuário.
  ///  - bots: censurado.
  String displayNameFor(PlayerModel p) {
    if (p.isHero) return p.name;
    if (mode == GameMode.online || p.isRemote) return p.name;
    return NameMasker.mask(p.name, visibleSuffix: visibleSuffix.value);
  }

  void setCensorship(int suffix) => visibleSuffix.value = suffix;

  bool get isOnline => mode == GameMode.online;

  /// Emite o som/háptica de toque de botão.
  void tap() {
    if (Get.isRegistered<GameEventBus>()) {
      Get.find<GameEventBus>().emit(const GameEvent(type: GameEventType.uiTap));
    }
  }

  @override
  void onClose() {
    _winnerTimer?.cancel();
    _autoHandTimer?.cancel();
    super.onClose();
  }
}
