/// ============================================================================
///  main.dart — ponto de entrada do app de demonstração do módulo de poker.
///  Roda em Web e Desktop. Registra o binding da feature e abre a mesa.
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import 'modules/game_table/bindings/game_table_binding.dart';
import 'modules/game_table/views/game_table_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PokerApp());
}

class PokerApp extends StatelessWidget {
  const PokerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'Texas Hold\'em — Cassino Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      initialBinding: GameTableBinding(),
      home: const GameTableScreen(),
    );
  }
}
