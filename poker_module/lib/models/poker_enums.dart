/// ============================================================================
///  poker_enums.dart
///  Enumerados de domínio do jogo de Texas Hold'em.
///
///  Ficam fora de qualquer feature por serem compartilhados por TODAS as
///  features (engine, mesa, rede, testes). Seguindo a arquitetura "feature-first",
///  os tipos transversais vivem em `lib/models`.
/// ============================================================================

/// Naipes do baralho francês (52 cartas, sem coringas).
enum Suit {
  spades, // ♠  (espadas)  - preto
  hearts, // ♥  (copas)    - vermelho
  diamonds, // ♦ (ouros)   - vermelho
  clubs, // ♣  (paus)      - preto
}

/// Valores (rank) das cartas. O inteiro [value] é usado para cálculo de
/// força de mão: Ás = 14 (mais forte), Rei = 13 ... Dois = 2.
enum CardRank {
  two(2, '2'),
  three(3, '3'),
  four(4, '4'),
  five(5, '5'),
  six(6, '6'),
  seven(7, '7'),
  eight(8, '8'),
  nine(9, '9'),
  ten(10, '10'),
  jack(11, 'J'),
  queen(12, 'Q'),
  king(13, 'K'),
  ace(14, 'A');

  const CardRank(this.value, this.label);

  /// Valor numérico para avaliação (2..14).
  final int value;

  /// Rótulo curto para exibir na carta ('10', 'J', 'Q', 'K', 'A').
  final String label;
}

/// Fases (estados) de uma rodada de Texas Hold'em.
/// O ciclo é: waiting -> preflop -> flop -> turn -> river -> showdown.
enum BettingRound {
  waiting, // Aguardando início da mão
  preflop, // Apostas iniciais (só as 2 cartas hole)
  flop, // 3 cartas comunitárias
  turn, // + 1 carta comunitária (4)
  river, // + 1 carta comunitária (5)
  showdown, // Revelação das mãos e distribuição do pote
}

/// Estado de um jogador DENTRO da mão atual.
enum PlayerState {
  waiting, // Ainda não agiu / esperando
  active, // Na mão, pode agir
  checked, // Deu check (passou a vez sem apostar)
  called, // Pagou a aposta
  bet, // Fez uma aposta/abriu
  raised, // Aumentou a aposta
  allIn, // Apostou todas as fichas
  folded, // Desistiu da mão
  sittingOut, // Fora da mesa (sem fichas ou ausente)
}

/// Ações disponíveis para o jogador humano.
enum PlayerActionType {
  fold, // Desistir
  check, // Passar (só permitido se ninguém apostou na rua)
  call, // Pagar a aposta corrente
  bet, // Apostar (quando não há aposta na rua)
  raiseAction, // Aumentar (quando já há aposta)
  allIn, // Apostar tudo
}

/// Modo de jogo da sessão.
enum GameMode {
  /// Jogo local contra oponentes controlados por IA (offline).
  bots,

  /// Multiplayer: contra outros usuários via WebSocket.
  /// Sem um servidor real, usa o `SimulatedSocketService` (servidor simulado
  /// que imita jogadores remotos com latência).
  online,
}

/// Status da conexão de rede (para o HUD do modo online).
enum ConnectionStatus { disconnected, connecting, connected, error }

/// Categorias de mão de poker, ordenadas da mais fraca (0) para a mais forte.
/// O índice é usado diretamente na comparação de desempate.
enum HandCategory {
  highCard(0, 'Carta Alta'),
  pair(1, 'Par'),
  twoPair(2, 'Dois Pares'),
  threeOfAKind(3, 'Trinca'),
  straight(4, 'Sequência'),
  flush(5, 'Flush (Cor)'),
  fullHouse(6, 'Full House'),
  fourOfAKind(7, 'Quadra'),
  straightFlush(8, 'Straight Flush'),
  royalFlush(9, 'Royal Flush');

  const HandCategory(this.rankOrder, this.displayName);

  /// Ordem de força para desempate (maior = mais forte).
  final int rankOrder;

  /// Nome amigável em português para a UI.
  final String displayName;
}

/// Extensões utilitárias de conversão dos enumerados para JSON (camada de rede).
extension SuitJson on Suit {
  String toJson() => name;
  static Suit fromJson(String v) =>
      Suit.values.firstWhere((e) => e.name == v, orElse: () => Suit.spades);
}

extension CardRankJson on CardRank {
  String toJson() => name;
  static CardRank fromJson(String v) =>
      CardRank.values.firstWhere((e) => e.name == v, orElse: () => CardRank.two);
}

extension BettingRoundJson on BettingRound {
  String toJson() => name;
  static BettingRound fromJson(String v) => BettingRound.values
      .firstWhere((e) => e.name == v, orElse: () => BettingRound.waiting);
}

extension PlayerStateJson on PlayerState {
  String toJson() => name;
  static PlayerState fromJson(String v) => PlayerState.values
      .firstWhere((e) => e.name == v, orElse: () => PlayerState.waiting);
}
