/// ============================================================================
///  game_table_screen.dart
///  Tela principal da mesa de poker.
///
///  Stack em camadas:
///    1. fundo do cassino;
///    2. feltro (elipse com borda de madeira);
///    3. cartas comunitárias + pote animado (centro);
///    4. fichas VOADORAS (overlay de animação);
///    5. jogadores posicionados ao redor;
///    6. barra de ações do hero (rodapé);
///    7. HUD superior (mão, fase, conexão online, mudo, sair);
///    8. painel de vencedor.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../models/poker_enums.dart';
import '../../../shared/services/audio_service.dart';
import '../../../shared/utils/app_colors.dart';
import '../../../shared/utils/formatters.dart';
import '../../game_engine/poker_engine_controller.dart';
import '../chip_fly_controller.dart';
import '../game_table_controller.dart';
import '../table_layout.dart';
import '../widgets/action_bar_widget.dart';
import '../widgets/community_cards_widget.dart';
import '../widgets/flying_chips_overlay.dart';
import '../widgets/player_seat_widget.dart';

class GameTableScreen extends GetView<GameTableController> {
  const GameTableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final engine = Get.find<PokerEngineController>();
    // Garante o controlador de fichas voadoras.
    if (!Get.isRegistered<ChipFlyController>()) {
      Get.put(ChipFlyController(), permanent: true);
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Obx(() {
          return Stack(
            children: [
              _buildBackground(),
              Center(child: _buildFelt()),

              // Cartas comunitárias + pote.
              Align(
                alignment: TableLayout.alignmentOf(
                  const Offset(0.5, 0.40),
                ),
                child: CommunityCardsWidget(session: engine.session),
              ),

              // Overlay de fichas voadoras.
              const FlyingChipsOverlay(),

              // Jogadores.
              ..._buildSeats(engine),

              // Barra de ações.
              const Positioned(
                left: 0,
                right: 0,
                bottom: 10,
                child: ActionBarWidget(),
              ),

              _buildTopHud(engine),

              if (controller.showWinnerPanel.value)
                _buildWinnerPanel(engine),
            ],
          );
        }),
      ),
    );
  }

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
    final count = engine.players.length;
    for (var i = 0; i < count; i++) {
      final p = engine.players[i];
      final rel = TableLayout.positionForSeat(i, count: count);
      widgets.add(
        Positioned.fill(
          child: Align(
            alignment: TableLayout.alignmentOf(rel),
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
      left: 10,
      right: 10,
      child: Row(
        children: [
          // Voltar ao lobby.
          _CircleIconButton(
            icon: Icons.arrow_back,
            onTap: () {
              controller.tap();
              Get.back();
            },
          ),
          const SizedBox(width: 8),
          // Número da mão.
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
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                    )),
              ],
            ),
          ),
          const Spacer(),
          // Indicador de modo (online/bots).
          if (controller.isOnline) _onlineBadge(engine),
          const SizedBox(width: 8),
          // Fase.
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.chipBlack.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
            ),
            child: Obx(() => Text(
                  Formatters.phaseLabel(engine.session.phase.value),
                  style: const TextStyle(
                      color: AppColors.gold, fontWeight: FontWeight.bold),
                )),
          ),
          const SizedBox(width: 8),
          // Mudo.
          if (Get.isRegistered<AudioService>())
            Obx(() {
              final audio = Get.find<AudioService>();
              return _CircleIconButton(
                icon: audio.muted.value ? Icons.volume_off : Icons.volume_up,
                onTap: () {
                  audio.toggleMute();
                  if (!audio.muted.value) audio.play(GameSound.click);
                },
              );
            })
          else
            const SizedBox.shrink(),
          const SizedBox(width: 8),
          _CircleIconButton(
            icon: Icons.refresh,
            tooltip: 'Próxima mão',
            onTap: () => controller.startNewHand(),
          ),
        ],
      ),
    );
  }

  Widget _onlineBadge(PokerEngineController engine) {
    return Obx(() {
      final conn = engine.session.connection.value;
      final color = conn == ConnectionStatus.connected
          ? AppColors.call
          : conn == ConnectionStatus.connecting
              ? AppColors.gold
              : AppColors.fold;
      final label = conn == ConnectionStatus.connected
          ? 'Online'
          : conn == ConnectionStatus.connecting
              ? 'Conectando'
              : 'Off-line';
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.7)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.public, size: 14, color: color),
            const SizedBox(width: 5),
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    });
  }

  Widget _buildWinnerPanel(PokerEngineController engine) {
    final results = engine.results;
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 30),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.88),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.gold, width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.emoji_events, color: AppColors.gold, size: 48),
            const SizedBox(height: 8),
            const Text('Fim de Jogo',
                style: TextStyle(
                    color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
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
              child: const Text('Próxima mão',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({required this.icon, required this.onTap, this.tooltip});
  final IconData icon;
  final VoidCallback onTap;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onTap,
      icon: Icon(icon, color: AppColors.textPrimary),
      style: IconButton.styleFrom(
        backgroundColor: Colors.black.withValues(alpha: 0.4),
        padding: const EdgeInsets.all(8),
      ),
    );
  }
}
