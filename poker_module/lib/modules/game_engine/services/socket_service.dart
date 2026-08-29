/// ============================================================================
///  socket_service.dart
///  Camada de COMUNICAÇÃO (WebSocket).
///
///  - [SocketService]            : contrato (interface).
///  - [WebSocketSocketService]   : implementação REAL (web_socket_channel),
///                                 funciona em Web (BrowserSocket) e Desktop
///                                 (IOWebSocketChannel via `WebSocket.connect`).
///  - [MockSocketService]        : modo bots (offline) — sem rede.
///  - [SimulatedSocketService]   : modo ONLINE de demonstração — um "servidor"
///                                 simulado que conecta, faz handshake, recebe
///                                 os adversários remotos e aplica latência,
///                                 usando o MESMO protocolo do socket real.
///
///  Protocolo JSON (resumo):
///    servidor -> cliente:
///      {"type":"welcome", "playerId":"hero", "serverTime":..}
///      {"type":"presence","players":[{"id","name","stack","remote":true,"ping"}]}
///      {"type":"hand_start","handNumber":..,"dealerSeat":..,"mode":"online"}
///      {"type":"deal_hole","cards":[...]}
///      {"type":"community","phase":"flop","cards":[...]}
///      {"type":"turn","seat":n}
///      {"type":"bet_update","seat":n,"action":"raise","amount":..,"pot":..,"stack":..}
///      {"type":"showdown","winners":[...]}
///    cliente -> servidor:
///      {"type":"join","name":"...","mode":"online"}
///      {"type":"action","action":"call","amount":20}
/// ============================================================================
import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

typedef SocketMessage = Map<String, dynamic>;
typedef SocketMessageHandler = void Function(SocketMessage message);

abstract class SocketService {
  Future<void> connect({String? url, String? authToken, String? playerName});
  void send(SocketMessage message);
  void onMessage(SocketMessageHandler handler);
  void onConnect(void Function() handler);
  void onDisconnect(void Function() handler);
  bool get isConnected;
  Future<void> disconnect();
}

// ---------------------------------------------------------------------------
//  Implementação REAL (servidor WebSocket de verdade).
// ---------------------------------------------------------------------------
class WebSocketSocketService implements SocketService {
  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  final List<SocketMessageHandler> _handlers = [];
  void Function()? _onConnect;
  void Function()? _onDisconnect;
  bool _connected = false;

  @override
  bool get isConnected => _connected;

  @override
  Future<void> connect({
    String? url,
    String? authToken,
    String? playerName,
  }) async {
    final endpoint = url ?? 'wss://poker.example.com/ws';
    final uri = Uri.parse(endpoint).replace(queryParameters: {
      if (authToken != null) 'token': authToken,
      if (playerName != null) 'name': playerName,
    });

    final ch = WebSocketChannel.connect(uri);
    _channel = ch;
    _sub = ch.stream.listen(
      (data) {
        _connected = true;
        _onConnect?.call();
        try {
          final msg = data is String
              ? jsonDecode(data) as SocketMessage
              : Map<String, dynamic>.from(data as Map);
          for (final h in _handlers) {
            h(msg);
          }
        } catch (_) {/* ignora mensagem malformada */}
      },
      onDone: () {
        _connected = false;
        _onDisconnect?.call();
      },
      onError: (_) {
        _connected = false;
        _onDisconnect?.call();
      },
    );
  }

  @override
  void send(SocketMessage message) {
    _channel?.sink.add(jsonEncode(message));
  }

  @override
  void onMessage(SocketMessageHandler handler) => _handlers.add(handler);

  @override
  void onConnect(void Function() handler) => _onConnect = handler;

  @override
  void onDisconnect(void Function() handler) => _onDisconnect = handler;

  @override
  Future<void> disconnect() async {
    await _sub?.cancel();
    await _channel?.sink.close();
    _connected = false;
  }
}

// ---------------------------------------------------------------------------
//  Modo BOTS (offline): sem rede. O engine local comanda tudo.
// ---------------------------------------------------------------------------
class MockSocketService implements SocketService {
  final List<SocketMessageHandler> _handlers = [];
  void Function()? _onConnect;
  void Function()? _onDisconnect;
  bool _connected = false;

  @override
  bool get isConnected => _connected;

  @override
  Future<void> connect({
    String? url,
    String? authToken,
    String? playerName,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    _connected = true;
    _onConnect?.call();
  }

  void emit(SocketMessage message) {
    if (!_connected) return;
    for (final h in List<SocketMessageHandler>.from(_handlers)) {
      h(message);
    }
  }

  @override
  void send(SocketMessage message) {
    // Modo local: ações são tratadas pelo engine; nada vai para a rede.
  }

  @override
  void onMessage(SocketMessageHandler handler) => _handlers.add(handler);

  @override
  void onConnect(void Function() handler) => _onConnect = handler;

  @override
  void onDisconnect(void Function() handler) => _onDisconnect = handler;

  @override
  Future<void> disconnect() async {
    _connected = false;
    _onDisconnect?.call();
  }
}

// ---------------------------------------------------------------------------
//  Modo ONLINE SIMULADO: imita um servidor remoto com jogadores "reais".
//  Faz handshake, envia presence (adversários com ping/latência) e reconhece
//  as ações do cliente (espelhando o que um backend responderia).
// ---------------------------------------------------------------------------
class SimulatedSocketService implements SocketService {
  SimulatedSocketService({this.latency = const Duration(milliseconds: 180)});

  final Duration latency;
  final List<SocketMessageHandler> _handlers = [];
  void Function()? _onConnect;
  void Function()? _onDisconnect;
  bool _connected = false;
  final _rnd = DateTime.now().millisecondsSinceEpoch;

  /// Nomes de jogadores "remotos" que entram na sala.
  static const _remoteNames = [
    'Lucas', 'Marina', 'Diego', 'Ana', 'Rafael',
  ];

  @override
  bool get isConnected => _connected;

  @override
  Future<void> connect({
    String? url,
    String? authToken,
    String? playerName,
  }) async {
    // Simula o tempo de estabelecer o WebSocket.
    await Future<void>.delayed(const Duration(milliseconds: 500));
    _connected = true;
    _onConnect?.call();

    // 1) Boas-vindas do servidor.
    _emitLater({
      'type': 'welcome',
      'playerId': 'hero',
      'serverTime': DateTime.now().millisecondsSinceEpoch,
      'mode': 'online',
    });

    // 2) Presença dos adversários remotos (com ping/latência individual).
    final players = <Map<String, dynamic>>[];
    for (var i = 0; i < _remoteNames.length; i++) {
      players.add({
        'id': 'r$i',
        'name': _remoteNames[i],
        'stack': 1000,
        'remote': true,
        'ping': 30 + ((_rnd + i * 37) % 120),
      });
    }
    _emitLater({'type': 'presence', 'players': players},
        after: const Duration(milliseconds: 350));
  }

  void _emitLater(SocketMessage msg, {Duration? after}) {
    Timer(after ?? latency, () {
      if (!_connected) return;
      for (final h in List<SocketMessageHandler>.from(_handlers)) {
        h(msg);
      }
    });
  }

  @override
  void send(SocketMessage message) {
    // O "servidor" reconhece a ação e poderia responder com o novo estado.
    // No demo o engine local já aplica; aqui apenas ecoamos um ack com latência.
    if (message['type'] == 'action') {
      _emitLater({
        'type': 'action_ack',
        'action': message['action'],
        'ok': true,
      });
    }
  }

  @override
  void onMessage(SocketMessageHandler handler) => _handlers.add(handler);

  @override
  void onConnect(void Function() handler) => _onConnect = handler;

  @override
  void onDisconnect(void Function() handler) => _onDisconnect = handler;

  @override
  Future<void> disconnect() async {
    _connected = false;
    _onDisconnect?.call();
  }
}
