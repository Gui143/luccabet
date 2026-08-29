/// ============================================================================
///  lobby_screen.dart
///  Tela de entrada: nome do jogador, escolha de MODO (bots / online) e,
///  no online, URL do servidor WebSocket (opcional — sem URL entra na sala
///  simulada). Ao confirmar, abre a mesa.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../models/poker_enums.dart';
import '../../shared/utils/app_colors.dart';
import '../game_table/bindings/game_table_binding.dart';
import '../game_table/views/game_table_screen.dart';
import 'lobby_controller.dart';

class LobbyScreen extends StatelessWidget {
  const LobbyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final LobbyController c = Get.put(LobbyController());
    final nameCtrl = TextEditingController(text: c.playerName.value);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Obx(() {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo.
                const Text('♠ ♥ Texas Hold\'em ♦ ♣',
                    style: TextStyle(
                        color: AppColors.gold,
                        fontSize: 26,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                const Text('Cassino Demo — Web & Desktop',
                    style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 28),

                // Nome.
                SizedBox(
                  width: 340,
                  child: TextField(
                    controller: nameCtrl,
                    onChanged: c.setName,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Seu nome',
                      labelStyle: const TextStyle(color: AppColors.textMuted),
                      prefixIcon: const Icon(Icons.person, color: AppColors.gold),
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.06),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Seleção de modo.
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _ModeCard(
                      title: 'Vs Bots',
                      subtitle: 'Offline · IA',
                      icon: Icons.smart_toy,
                      selected: c.mode.value == GameMode.bots,
                      onTap: () {
                        c.tap();
                        c.setMode(GameMode.bots);
                      },
                    ),
                    const SizedBox(width: 14),
                    _ModeCard(
                      title: 'Online',
                      subtitle: 'Multiplayer',
                      icon: Icons.public,
                      selected: c.mode.value == GameMode.online,
                      onTap: () {
                        c.tap();
                        c.setMode(GameMode.online);
                      },
                    ),
                  ],
                ),

                if (c.mode.value == GameMode.online) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: 340,
                    child: TextField(
                      onChanged: (v) => c.serverUrl.value = v.trim().isEmpty ? null : v.trim(),
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Servidor WebSocket (opcional)',
                        hintText: 'wss://seu-servidor/poker  — deixe vazio p/ sala simulada',
                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                        labelStyle: const TextStyle(color: AppColors.textMuted),
                        prefixIcon: const Icon(Icons.dns, color: AppColors.gold),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.06),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (c.connection.value == ConnectionStatus.connecting)
                    const Padding(
                      padding: EdgeInsets.all(8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: AppColors.gold),
                          ),
                          SizedBox(width: 8),
                          Text('Conectando à sala...',
                              style: TextStyle(color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  if (c.error.value != null)
                    Text(c.error.value!,
                        style: const TextStyle(color: AppColors.fold, fontSize: 12)),
                ],

                const SizedBox(height: 26),

                // Entrar.
                SizedBox(
                  width: 240,
                  child: ElevatedButton.icon(
                    onPressed: c.connection.value == ConnectionStatus.connecting
                        ? null
                        : () async {
                            c.tap();
                            final ok = await c.enterTable();
                            if (ok) {
                              Get.to(
                                () => const GameTableScreen(),
                                binding: GameTableBinding(
                                  mode: c.mode.value,
                                  heroName: c.playerName.value,
                                  socket: c.socket,
                                ),
                                transition: Transition.fadeIn,
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.gold,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.play_arrow),
                    label: Text(
                      c.mode.value == GameMode.online ? 'Entrar na Sala' : 'Jogar',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 150,
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.gold.withValues(alpha: 0.15)
              : Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.gold : Colors.white24,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: selected ? AppColors.gold : AppColors.textMuted, size: 34),
            const SizedBox(height: 8),
            Text(title,
                style: TextStyle(
                    color: selected ? Colors.white : AppColors.textMuted,
                    fontWeight: FontWeight.bold,
                    fontSize: 16)),
            Text(subtitle,
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
