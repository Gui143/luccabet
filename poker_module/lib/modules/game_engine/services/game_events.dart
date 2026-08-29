/// ============================================================================
///  game_events.dart
///  Barramento de eventos do jogo (domain events).
///
///  O engine NÃO fala diretamente com áudio nem com animações. Em vez disso,
///  ele emite [GameEvent]s num [GameEventBus]. A camada de interface (e o
///  serviço de som) escuta esses eventos e reage:
///    - som de ficha quando alguém aposta;
///    - fichas voando do assento para o pote;
///    - som de carta ao distribuir/revelar;
///    - som de "sua vez";
///    - fanfarra de vitória / derrota.
///
///  Isso mantém a lógica de poker 100% desacoplada do Flutter/sons (escalável
///  e testável) e funciona igual no modo local (bots) e no online (servidor
///  também pode enviar eventos que viram [GameEvent]s no cliente).
/// ============================================================================
import 'dart:async';

import 'package:get/get.dart';

/// Tipos de evento do jogo.
enum GameEventType {
  /// Uma carta foi distribuída/virada. [seat] é o assento alvo (-1 = mesa).
  cardDealt,

  /// Um jogador fez uma aposta (call/bet/raise/blind) -> ficha vai para o pote.
  bet,

  /// Um jogador desistiu.
  fold,

  /// Rodou para um novo jogador.
  turnChanged,

  /// Mudou a fase (flop/turn/river).
  phaseChanged,

  /// Showdown: distribuir fichas do pote para o(s) vencedor(es).
  showdown,

  /// Fim de mão com vencedor por desistência de todos.
  winnerByFold,

  /// Botão clicado / interação de UI.
  uiTap,
}

/// Evento imutável do domínio.
class GameEvent {
  const GameEvent({
    required this.type,
    this.seat = -1,
    this.amount = 0,
    this.playerId,
    this.isHero = false,
    this.isWin = false,
  });

  final GameEventType type;

  /// Assento de origem/destino (-1 = mesa/pote).
  final int seat;

  /// Valor de fichas envolvido (para apostas e prêmios).
  final int amount;

  /// ID do jogador (quando aplicável).
  final String? playerId;

  /// Se o evento diz respeito ao jogador humano.
  final bool isHero;

  /// Se o hero é o vencedor (define fanfarra vs. som de derrota).
  final bool isWin;
}

/// Barramento global de eventos (GetX service / singleton).
class GameEventBus extends GetxService {
  final _controller = StreamController<GameEvent>.broadcast();

  /// Stream de todos os eventos.
  Stream<GameEvent> get stream => _controller.stream;

  /// Emite um evento para todos os ouvintes.
  void emit(GameEvent event) {
    if (!_controller.isClosed) _controller.add(event);
  }

  /// Atalho para escutar com tipagem.
  StreamSubscription<GameEvent> on(
    GameEventType type,
    void Function(GameEvent e) handler,
  ) {
    return _controller.stream.where((e) => e.type == type).listen(handler);
  }

  @override
  void onClose() {
    _controller.close();
    super.onClose();
  }
}
