/// ============================================================================
///  app_colors.dart
///  Paleta centralizada do cassino (feltro, fichas, ouro, cartas). Manter as
///  cores em um único lugar facilita trocar o tema da mesa sem varrer a UI.
/// ============================================================================
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Feltro da mesa — gradiente verde estilo cassino.
  static const Color feltDark = Color(0xFF0B5D3B);
  static const Color feltLight = Color(0xFF13824F);
  static const Color feltRim = Color(0xFF5A3A1B); // borda de madeira
  static const Color feltRimEdge = Color(0xFF3A2410);

  // Fundo geral (fora da mesa).
  static const Color background = Color(0xFF07130D);
  static const Color backgroundDeep = Color(0xFF030A06);

  // Cartas.
  static const Color cardFace = Color(0xFFFDFBF5);
  static const Color cardBack = Color(0xFFB3261E);
  static const Color cardBackPattern = Color(0xFF8E1C16);
  static const Color cardStroke = Color(0xFFD8D2C2);
  static const Color suitRed = Color(0xFFD4202C);
  static const Color suitBlack = Color(0xFF1B1B1F);

  // Fichas / ouro.
  static const Color gold = Color(0xFFFFC53D);
  static const Color chipRed = Color(0xFFE03131);
  static const Color chipBlue = Color(0xFF2F6FED);
  static const Color chipGreen = Color(0xFF2F9E44);
  static const Color chipBlack = Color(0xFF212529);

  // Ações.
  static const Color fold = Color(0xFFC92A2A);
  static const Color call = Color(0xFF2F9E44);
  static const Color raiseColor = Color(0xFFF08C00);
  static const Color checkColor = Color(0xFF1C7ED6);

  // Texto / estados.
  static const Color textPrimary = Color(0xFFF5F7F7);
  static const Color textMuted = Color(0xFFAEB7B2);
  static const Color activeRing = Color(0xFFFFD43B); // brilho do jogador ativo
  static const Color buttonDealer = Color(0xFFFFFFFF);
}
