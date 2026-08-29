/// ============================================================================
///  game_session_model.dart
///  Estado compartilhado da MESA (não pertence a um jogador específico):
///  cartas comunitárias, pote, botão do dealer, fase da rodada, etc.
///
///  Quase tudo é reativo: a View da mesa escuta este objeto via GetX/Obx.
/// ============================================================================
import 'package:get/get.dart';

import 'card_model.dart';
import 'poker_enums.dart';

class GameSessionModel {
  GameSessionModel({
    int smallBlind = 10,
    int bigBlind = 20,
  })  : communityCards = <CardModel>[].obs,
        pot = 0.obs,
        phase = BettingRound.waiting.obs,
        dealerSeat = 0.obs,
        activeSeat = RxnInt(),
        currentBet = 0.obs,
        minRaise = bigBlind.obs,
        smallBlind = smallBlind.obs,
        bigBlind = bigBlind.obs,
        handNumber = 0.obs,
        statusMessage = ''.obs,
        winners = <WinnerResult>[].obs;

  /// As 5 cartas comunitárias (flop = 3, turn = +1, river = +1).
  final RxList<CardModel> communityCards;

  /// Pote principal atual (soma de todas as apostas da mão).
  /// Nota: potes laterais (all-ins) são calculados no showdown; durante a mão
  /// exibimos o total e o engine mantém a contabilidade por contribuição.
  final RxInt pot;

  /// Fase atual da rodada.
  final Rx<BettingRound> phase;

  /// Assento onde está o botão do dealer.
  final RxInt dealerSeat;

  /// Assento do jogador cuja vez é AGORA (null entre ruas/no showdown).
  final RxnInt activeSeat;

  /// Maior aposta na rua atual (o valor a ser "pago" para dar call).
  final RxInt currentBet;

  /// Menor incremento de raise permitido pelas regras (no-limit: >= big blind).
  final RxInt minRaise;

  final RxInt smallBlind;
  final RxInt bigBlind;

  /// Número da mão (incrementa a cada rodada completa).
  final RxInt handNumber;

  /// Mensagem de status para o HUD (ex.: "Flop — carta 7♥", "Guilherme venceu").
  final RxString statusMessage;

  /// Resultado(s) do showdown mais recente (vencedor(es) e mão).
  final RxList<WinnerResult> winners;

  /// Atalho para as fases.
  bool get isWaiting => phase.value == BettingRound.waiting;
  bool get isShowdown => phase.value == BettingRound.showdown;

  /// Quantas cartas comunitárias devem existir em cada fase.
  int get expectedCommunityCount {
    switch (phase.value) {
      case BettingRound.flop:
        return 3;
      case BettingRound.turn:
        return 4;
      case BettingRound.river:
      case BettingRound.showdown:
        return 5;
      default:
        return 0;
    }
  }

  void resetForNewHand() {
    communityCards.clear();
    pot.value = 0;
    phase.value = BettingRound.waiting;
    activeSeat.value = null;
    currentBet.value = 0;
    minRaise.value = bigBlind.value;
    winners.clear();
    statusMessage.value = '';
  }

  Map<String, dynamic> toJson() => {
        'communityCards': communityCards.map((c) => c.toJson()).toList(),
        'pot': pot.value,
        'phase': phase.value.toJson(),
        'dealerSeat': dealerSeat.value,
        'activeSeat': activeSeat.value,
        'currentBet': currentBet.value,
        'minRaise': minRaise.value,
        'smallBlind': smallBlind.value,
        'bigBlind': bigBlind.value,
        'handNumber': handNumber.value,
        'statusMessage': statusMessage.value,
      };

  factory GameSessionModel.fromJson(Map<String, dynamic> json) {
    final s = GameSessionModel(
      smallBlind: (json['smallBlind'] as num?)?.toInt() ?? 10,
      bigBlind: (json['bigBlind'] as num?)?.toInt() ?? 20,
    );
    s.pot.value = (json['pot'] as num?)?.toInt() ?? 0;
    s.phase.value = BettingRoundJson.fromJson(json['phase'] as String? ?? 'waiting');
    s.dealerSeat.value = (json['dealerSeat'] as num?)?.toInt() ?? 0;
    s.activeSeat.value = (json['activeSeat'] as num?)?.toInt();
    s.currentBet.value = (json['currentBet'] as num?)?.toInt() ?? 0;
    s.minRaise.value = (json['minRaise'] as num?)?.toInt() ?? 20;
    s.handNumber.value = (json['handNumber'] as num?)?.toInt() ?? 0;
    s.statusMessage.value = json['statusMessage'] as String? ?? '';
    if (json['communityCards'] != null) {
      s.communityCards.assignAll((json['communityCards'] as List)
          .map((e) => CardModel.fromJson(Map<String, dynamic>.from(e))));
    }
    return s;
  }
}

/// Resultado de um vencedor no showdown (pode haver mais de um em empate/potes
/// laterais).
class WinnerResult {
  WinnerResult({
    required this.playerId,
    required this.amountWon,
    required this.category,
    required this.handDescription,
  });

  final String playerId;

  /// Fichas ganhas (pote principal ou lateral).
  final int amountWon;

  /// Categoria da mão vencedora.
  final HandCategory category;

  /// Descrição textual da mão (ex.: "Flush — A K Q J 9").
  final String handDescription;

  Map<String, dynamic> toJson() => {
        'playerId': playerId,
        'amountWon': amountWon,
        'category': category.name,
        'handDescription': handDescription,
      };
}
