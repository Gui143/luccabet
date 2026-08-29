/// ============================================================================
///  game_table_screen.dart
///  Tela principal da mesa de poker.
///
///  Usa um [Stack] para sobrepor, em camadas:
///    1. fundo escuro do cassino;
///    2. mesa de feltro (elipse verde com borda de madeira);
///    3. cartas comunitárias + pote (centro);
///    4. jogadores posicionados ao redor da mesa (seats);
///    5. barra de ações do hero (rodapé);
///    6. HUD superior (fase, nº da mão) e painel de vencedor.
///
///  A tela NÃO contém regra de jogo: lê estado reativo do engine e do
///  GameTableController e envia ações (fold/call/raise).
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';
import '../../game_engine/poker_engine_controller.dart';
import '../game_table_controller.dart';
import '../widgets/action_bar_widget.dart';
import '../widgets/community_cards_widget.dart';
import '../widgets/player_seat_widget.dart';

class GameTableScreen extends GetView<GameTableController> {
  const GameTableScreen({super.key});

  /// Posições relativas (frações de largura/altura) dos 6 assentos.
  /// O hero fica embaixo no centro; os bots nas demais posições.
  static const List<Offset> _seatPositions = [
    Offset(0.50, 0.82), // 0 hero — inferior central
    Offset(0.18, 0.72), // 1
    Offset(0.08, 0.42), // 2
    Offset(0.20, 0.14), // 3
    Offset(0.80, 0.14), // 4
    Offset(0.92, 0.42), // 5
  ];

  @override
  Widget build(BuildContext context) {
    final engine = Get.find<PokerEngineController>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Obx(() {
          return Stack(
            children: [
              // 1) Fundo.
              _buildBackground(),

              // 2) Feltro da mesa.
              Center(child: _buildFelt()),

              // 3) Cartas comunitárias + pote.
              Align(
                alignment: const Alignment(0, -0.05),
                child: CommunityCardsWidget(session: engine.session),
              ),

              // 4) Jogadores.
              ..._buildSeats(engine),

              // 5) Barra de ações (hero).
              Positioned(
                left: 0,
                right: 0,
                bottom: 12,
                child: ActionBarWidget(),
              ),

              // 6) HUD superior.
              _buildTopHud(engine),

              // 7) Painel de vencedor.
              if (controller.showWinnerPanel.value) _buildWinnerPanel(engine),
            ],
          );
        }),
      ),
    );
  }

  // ---------------------------------------------------------------
  Widget _buildBackground() {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.center,
          radius: 1.2,
          colors: [AppColors.background, AppColors.backgroundDeep],
        ),
      ),
    );
  }

  Widget _buildFelt() {
    return FractionallySizedBox(
      widthFactor: 0.92,
      heightFactor: 0.62,
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const RadialGradient(
            colors: [AppColors.feltLight, AppColors.feltDark],
            stops: [0.4, 1.0],
          ),
          border: Border.all(color: AppColors.feltRim, width: 14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.6),
              blurRadius: 30,
              spreadRadius: 4,
            ),
            const BoxShadow(
              color: AppColors.feltRimEdge,
              blurRadius: 8,
              spreadRadius: 2,
            ),
          ],
        ),
        // Arco decorativo central (logo do cassino).
        child: Center(
          child: Opacity(
            opacity: 0.08,
            child: Transform.scale(
              scale: 1.6,
              child: const Icon(Icons.sports_esports, color: Colors.white, size: 80),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSeats(PokerEngineController engine) {
    final widgets = <Widget>[];
    for (var i = 0; i < engine.players.length; i++) {
      final p = engine.players[i];
      final pos = i < _seatPositions.length
          ? _seatPositions[i]
          : Offset(0.5, 0.1 + (i * 0.1));
      widgets.add(
        Positioned(
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          child: Align(
            alignment: Alignment(pos.dx * 2 - 1, pos.dy * 2 - 1),
            child: PlayerSeatWidget(player: p, compact: !p.isHero),
          ),
        ),
      );
    }
    return widgets;
  }

  Widget _buildTopHud(PokerEngineController engine) {
    return Positioned(
      top: 10,
      left: 12,
      right: 12,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.style, color: AppColors.gold, size: 16),
                const SizedBox(width: 6),
                Obx(() => Text(
                      'Mão #${engine.session.handNumber.value}',
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                    )),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.chipBlack.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
            ),
            child: Obx(() => Text(
                  Formatters.phaseLabel(engine.session.phase.value),
                  style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold),
                )),
          ),
          IconButton(
            tooltip: 'Próxima mão',
            onPressed: () => controller.startNewHand(),
            icon: const Icon(Icons.refresh, color: AppColors.textPrimary),
          ),
        ],
      ),
    );
  }

  Widget _buildWinnerPanel(PokerEngineController engine) {
    final results = engine.results;
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 30),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.gold, width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.emoji_events, color: AppColors.gold, size: 48),
            const SizedBox(height: 8),
            const Text(
              'Fim de Jogo',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            ...results.map((r) {
              final p = engine.players.firstWhere(
                (pl) => pl.id == r.playerId,
                orElse: () => engine.players.first,
              );
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  '${controller.displayNameFor(p)}  +${Formatters.chips(r.amountWon)}  (${r.handDescription})',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.gold, fontSize: 15),
                ),
              );
            }),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: () => controller.startNewHand(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: Colors.black,
              ),
              child: const Text('Próxima mão', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
