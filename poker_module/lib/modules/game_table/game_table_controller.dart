/// ============================================================================
///  game_table_controller.dart
///  ViewModel da TELA da mesa.
///
///  Papel (separação estrita lógica vs. interface):
///    - O [PokerEngineController] é a "camada de domínio" (regras de poker).
///    - Este controller cuida APENAS do que é visual/interação:
///        * inicializa a mesa e inicia as mãos;
///        * aplica a CENSURA DINÂMICA dos nomes dos oponentes;
///        * controla flags de animação (distribuindo, mostrando vencedor);
///        * expõe derivados prontos para a View (assentos, hero, status).
///
///  Ele NÃO implementa regras de aposta — delega tudo ao engine.
/// ============================================================================
import 'dart:async';

import 'package:get/get.dart';

import '../../models/player_model.dart';
import '../../shared/utils/name_masker.dart';
import '../game_engine/poker_engine_controller.dart';
import '../game_engine/services/game_repository.dart';

class GameTableController extends GetxController {
  GameTableController({this.repository});

  /// Repositório injetado (camada WebSocket). No modo demo vem com o mock.
  final GameRepository? repository;

  late final PokerEngineController engine;

  /// Animações / UI.
  final RxBool isAnimating = false.obs;
  final RxBool showWinnerPanel = false.obs;

  /// Parâmetro de censura: quantas letras finais do nome ficam visíveis.
  /// Pode ser ajustado em runtime (privacidade adaptativa).
  final RxInt visibleSuffix = 5.obs;

  Timer? _winnerTimer;

  @override
  void onInit() {
    super.onInit();
    engine = Get.find<PokerEngineController>();

    // Liga o repositório ao engine: eventos do servidor -> applyServerEvent.
    repository?.onServerEvent = engine.applyServerEvent;

    // Conecta (mock: instantâneo) e prepara a mesa.
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await repository?.connect();
    engine.setupTable(
      heroName: 'Você',
      playerCount: 6,
      startingStack: 1000,
    );
    // Inicia a primeira mão automaticamente.
    await Future<void>.delayed(const Duration(milliseconds: 400));
    startNewHand();
  }

  /// Inicia uma nova mão e controla o painel de vencedor.
  Future<void> startNewHand() async {
    showWinnerPanel.value = false;
    isAnimating.value = true;
    await engine.startHand();
    isAnimating.value = false;
    _watchForShowdown();
  }

  /// Observa o resultado do showdown para exibir o painel de vencedor.
  void _watchForShowdown() {
    _winnerTimer?.cancel();
    _winnerTimer = Timer.periodic(const Duration(milliseconds: 300), (t) {
      if (engine.results.isNotEmpty) {
        showWinnerPanel.value = true;
        t.cancel();
      } else if (engine.session.isWaiting && !engine.isDealing.value) {
        // Entre mãos sem vencedor aparente — mantém o painel fechado.
        t.cancel();
      }
    });
  }

  // ------------------------------------------------------------
  //  Censura dinâmica de nomes
  // ------------------------------------------------------------

  /// Nome a exibir para um jogador:
  ///  - hero: nome inteiro.
  ///  - oponentes: censurado, com sufixo visível configurável.
  String displayNameFor(PlayerModel p) {
    if (p.isHero) return p.name;
    return NameMasker.mask(p.name, visibleSuffix: visibleSuffix.value);
  }

  /// Ajusta a privacidade em runtime (ex.: toggle "mais privado").
  void setCensorship(int suffix) => visibleSuffix.value = suffix;

  @override
  void onClose() {
    _winnerTimer?.cancel();
    super.onClose();
  }
}
