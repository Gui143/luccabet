/// ============================================================================
///  game_repository.dart
///  Repository / Provider: é a FRONTEIRA entre o mundo externo (servidor via
///  WebSocket) e o [PokerEngineController].
///
///  Responsabilidades:
///    - Conectar e escutar o socket.
///    - Traduzir mensagens JSON do servidor em chamadas de método do engine
///      (ex.: evento "deal_hole" -> engine.dealHoleCards(...)).
///    - Traduzir ações do jogador em mensagens enviadas ao servidor.
///
///  Protocolo de eventos (JSON):
///    Entrada (servidor -> cliente):
///      {"type":"hand_start","handNumber":1,"dealerSeat":2,"players":[...]}
///      {"type":"deal_hole","playerId":"p0","cards":[{"rank":..,"suit":..}]}
///      {"type":"community","phase":"flop","cards":[...]}
///      {"type":"turn","seat":3}
///      {"type":"bet_update","playerId":"p2","action":"raise","amount":60,"pot":180}
///      {"type":"showdown","winners":[{...}]}
///    Saída (cliente -> servidor):
///      {"type":"action","action":"call","amount":20}
///      {"type":"sit_down","stack":1000}
///
///  No modo mock, o próprio engine roda a partida e chama [emitLocalEvent]
///  para manter o mesmo fluxo de dados (a UI não sabe a diferença).
/// ============================================================================
import 'dart:convert';

import '../../../models/poker_enums.dart';
import 'socket_service.dart';

class GameRepository {
  GameRepository({required SocketService socket}) : _socket = socket;

  final SocketService _socket;

  /// Handler que aplica um evento no engine. É injetado pelo controller para
  /// evitar dependência cíclica. Recebe o mapa já decodificado.
  void Function(Map<String, dynamic> event)? onServerEvent;

  SocketService get socket => _socket;

  Future<void> connect({String? url, String? token}) async {
    _socket.onMessage(_handleMessage);
    // Idempotente: não reconecta um socket já aberto (o lobby pode tê-lo
    // conectado antes de navegar para a mesa).
    if (!_socket.isConnected) {
      await _socket.connect(url: url, authToken: token);
    }
  }

  /// Ponto único de processamento de mensagens recebidas.
  void _handleMessage(SocketMessage raw) {
    try {
      final event = raw is String ? jsonDecode(raw) as Map<String, dynamic> : raw;
      onServerEvent?.call(event);
    } catch (e) {
      // Em produção, logar/telemetria. Nunca derruba a UI por mensagem inválida.
      // ignore: avoid_print
      print('[GameRepository] evento inválido: $e');
    }
  }

  // ---------- SAÍDA: jogador -> servidor ----------

  /// Envia uma ação de aposta do hero para o servidor.
  void sendAction(PlayerActionType action, {int amount = 0}) {
    _socket.send({
      'type': 'action',
      'action': action.name,
      'amount': amount,
    });
  }

  /// Pede sentar na mesa com um stack inicial.
  void sitDown({required int stack}) {
    _socket.send({'type': 'sit_down', 'stack': stack});
  }

  // ---------- ENTRADA: servidor -> engine ----------

  /// Aplica um evento de servidor no engine. É chamado pelo callback
  /// [onServerEvent]; separado em método para ser testável.
  /// Retorna `true` se reconheceu o evento.
  static bool dispatch(
    Map<String, dynamic> event, {
    void Function(String type, Map<String, dynamic> data)? onEvent,
  }) {
    final type = event['type'] as String?;
    if (type == null) return false;
    onEvent?.call(type, event);
    return true;
  }
}
