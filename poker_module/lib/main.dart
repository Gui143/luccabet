/// ============================================================================
///  main.dart — ponto de entrada do app de demonstração do módulo de poker.
///  Roda em Web e Desktop. Abre no LOBBY (escolha bots/online).
/// ============================================================================
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import 'modules/lobby/lobby_screen.dart';

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
      home: const LobbyScreen(),
    );
  }
}
