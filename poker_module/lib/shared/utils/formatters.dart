/// ============================================================================
///  formatters.dart
///  Helpers puros de formatação (fichas, fase, rótulo de ação).
/// ============================================================================

import '../../models/poker_enums.dart';

class Formatters {
  Formatters._();

  /// Formata fichas com separador de milhar: 12345 -> "12.345".
  static String chips(int value) {
    final s = value.abs().toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return value < 0 ? '-$buf' : buf.toString();
  }

  /// Rótulo amigável da fase da rodada.
  static String phaseLabel(BettingRound phase) {
    switch (phase) {
      case BettingRound.waiting:
        return 'Aguardando';
      case BettingRound.preflop:
        return 'Pré-Flop';
      case BettingRound.flop:
        return 'Flop';
      case BettingRound.turn:
        return 'Turn';
      case BettingRound.river:
        return 'River';
      case BettingRound.showdown:
        return 'Showdown';
    }
  }

  /// Rótulo curto da ação para o selo do jogador.
  static String actionLabel(PlayerActionType action) {
    switch (action) {
      case PlayerActionType.fold:
        return 'Fold';
      case PlayerActionType.check:
        return 'Check';
      case PlayerActionType.call:
        return 'Call';
      case PlayerActionType.bet:
        return 'Bet';
      case PlayerActionType.raiseAction:
        return 'Raise';
      case PlayerActionType.allIn:
        return 'All-in';
    }
  }
}
