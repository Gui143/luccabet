/// ============================================================================
///  player_model.dart
///  Estado de um jogador na mesa de poker.
///
///  Os campos que mudam frequentemente e precisam refletir na UI (fichas,
///  estado da mão, carta virada) são reativos (`.obs`). O ID e o nome são
///  identidade e ficam imutáveis.
/// ============================================================================
import 'package:get/get.dart';

import '../shared/utils/name_masker.dart';
import 'card_model.dart';
import 'poker_enums.dart';

class PlayerModel {
  PlayerModel({
    required this.id,
    required this.name,
    required int stack,
    int seat = 0,
    bool isHero = false,
    bool isBot = false,
    String? avatarSeed,
  })  : stack = stack.obs,
        seat = seat.obs,
        isHero = isHero,
        isBot = isBot,
        state = PlayerState.waiting.obs,
        holeCards = <CardModel>[].obs,
        currentBet = 0.obs,
        totalCommitted = 0.obs,
        hasButton = false.obs,
        isTurn = false.obs,
        lastAction = Rxn<PlayerActionType>(),
        avatarSeed = avatarSeed ?? id;

  // ---- Identidade (imutável) ----
  final String id;
  final String name;

  /// `true` para o jogador humano local (a "mão" que vemos aberta).
  final bool isHero;

  /// `true` para oponentes controlados por IA (modo simulado/offline).
  final bool isBot;

  /// Seed usada para gerar o avatar (inicial/ícone) de forma determinística.
  final String avatarSeed;

  // ---- Estado reativo (modificado pelo engine) ----

  /// Fichas restantes do jogador.
  final RxInt stack;

  /// Posição (assento) na mesa, 0..n-1. O dealer button gira por esses seats.
  final RxInt seat;

  /// Estado na mão atual (ativo, fold, all-in, etc.).
  final Rx<PlayerState> state;

  /// As 2 cartas hole. Para oponentes ficam com `isFaceUp == false`.
  final RxList<CardModel> holeCards;

  /// Valor apostado na rua ATUAL (resetado a cada flop/turn/river).
  final RxInt currentBet;

  /// Total apostado na mão inteira (usado para construir os potes laterais).
  final RxInt totalCommitted;

  /// Se o botão do dealer está neste assento.
  final RxBool hasButton;

  /// Se é a vez deste jogador agir (destaca o assento na UI).
  final RxBool isTurn;

  /// Última ação executada (para exibir o "selo" Fold/Call/Raise...).
  final Rxn<PlayerActionType> lastAction;

  /// Nome censurado para exibir oponentes (o hero vê o próprio nome inteiro).
  String get displayName => isHero ? name : NameMasker.mask(name);

  /// Jogador ainda tem fichas e pode participar de mãos futuras.
  bool get hasChips => stack.value > 0;

  /// Está na mão (não desistiu e não está ausente).
  bool get isInHand =>
      state.value != PlayerState.folded &&
      state.value != PlayerState.sittingOut;

  /// Pode receber cartas / jogar a próxima mão.
  bool get canPlay => hasChips && state.value != PlayerState.sittingOut;

  /// Reset do estado entre ruas (mantém stack e cartas).
  void resetForNewStreet() {
    currentBet.value = 0;
    lastAction.value = null;
    if (state.value != PlayerState.folded &&
        state.value != PlayerState.allIn &&
        state.value != PlayerState.sittingOut) {
      state.value = PlayerState.waiting;
    }
  }

  /// Reset completo para uma nova mão.
  void resetForNewHand() {
    holeCards.clear();
    currentBet.value = 0;
    totalCommitted.value = 0;
    isTurn.value = false;
    hasButton.value = false;
    lastAction.value = null;
    state.value = hasChips ? PlayerState.waiting : PlayerState.sittingOut;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'stack': stack.value,
        'seat': seat.value,
        'isHero': isHero,
        'isBot': isBot,
        'state': state.value.toJson(),
        'currentBet': currentBet.value,
        'totalCommitted': totalCommitted.value,
        'hasButton': hasButton.value,
        // Em produção o servidor omite as cartas dos oponentes; aqui
        // serializamos para o hero local.
        'holeCards': holeCards.map((c) => c.toJson()).toList(),
      };

  factory PlayerModel.fromJson(Map<String, dynamic> json) {
    final p = PlayerModel(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Player',
      stack: (json['stack'] as num?)?.toInt() ?? 0,
      seat: (json['seat'] as num?)?.toInt() ?? 0,
      isHero: json['isHero'] as bool? ?? false,
      isBot: json['isBot'] as bool? ?? false,
    );
    p.state.value = PlayerStateJson.fromJson(json['state'] as String? ?? 'waiting');
    p.currentBet.value = (json['currentBet'] as num?)?.toInt() ?? 0;
    p.totalCommitted.value = (json['totalCommitted'] as num?)?.toInt() ?? 0;
    p.hasButton.value = json['hasButton'] as bool? ?? false;
    if (json['holeCards'] != null) {
      p.holeCards.assignAll((json['holeCards'] as List)
          .map((e) => CardModel.fromJson(Map<String, dynamic>.from(e))));
    }
    return p;
  }
}
