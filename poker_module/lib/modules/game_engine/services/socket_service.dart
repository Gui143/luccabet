/// ============================================================================
///  socket_service.dart
///  Abstração da CAMADA DE COMUNICAÇÃO (WebSocket).
///
///  O objetivo é deixar o jogo pronto para um servidor real sem acoplamento:
///    - [SocketService] é a interface (contrato) que o Repository usa.
///    - [WebSocketSocketService] é a implementação REAL (preparada, comentada).
///    - [MockSocketService] é a implementação falsa usada no modo offline/demo.
///
///  As mensagens seguem um protocolo JSON simples (eventos de entrada/saída).
///  Quando o backend estiver pronto, basta injetar a implementação real no
///  binding do GetX — nenhuma outra camada muda.
/// ============================================================================

typedef SocketMessage = Map<String, dynamic>;

/// Tipo do callback que recebe mensagens do servidor.
typedef SocketMessageHandler = void Function(SocketMessage message);

/// Contrato da comunicação em tempo real.
abstract class SocketService {
  /// Conecta ao endpoint. Pode receber token de autenticação.
  Future<void> connect({String? url, String? authToken});

  /// Envia uma mensagem/ação para o servidor (ex.: fold/call/raise).
  void send(SocketMessage message);

  /// Registra um handler para TODAS as mensagens recebidas.
  void onMessage(SocketMessageHandler handler);

  /// Registra handler para eventos de conexão.
  void onConnect(void Function() handler);
  void onDisconnect(void Function() handler);

  bool get isConnected;

  Future<void> disconnect();
}

/// ---------------------------------------------------------------------------
///  Implementação REAL (WebSocket).
///
///  Está pronta para uso; vem desativada por padrão porque o ambiente de
///  exemplo roda 100% local. Para usar com um servidor:
///    1. import 'dart:io' expõe WebSocket (em mobile/desktop);
///       na web use 'package:web_socket_channel/html.dart'.
///    2. No binding: Get.lazyPut<SocketService>(() => WebSocketSocketService());
/// ---------------------------------------------------------------------------
class WebSocketSocketService implements SocketService {
  // ignore: unused_field
  dynamic _channel; // WebSocketChannel (web/io) — injetado na integração.
  final List<SocketMessageHandler> _handlers = [];
  void Function()? _onConnect;
  void Function()? _onDisconnect;
  bool _connected = false;

  @override
  bool get isConnected => _connected;

  @override
  Future<void> connect({String? url, String? authToken}) async {
    // ------------------------------------------------------------------
    // INTEGRAÇÃO REAL (habilitar quando houver servidor):
    //
    //   final uri = Uri.parse(url ?? 'wss://api.cassino.example/poker');
    //   _channel = WebSocketChannel.connect(uri.replace(queryParameters: {
    //     if (authToken != null) 'token': authToken,
    //   }));
    //   _channel.stream.listen(
    //     (data) {
    //       _connected = true;
    //       final msg = jsonDecode(data as String) as SocketMessage;
    //       for (final h in _handlers) h(msg);
    //     },
    //     onDone: () { _connected = false; _onDisconnect?.call(); },
    //     onError: (_) { _connected = false; _onDisconnect?.call(); },
    //   );
    //   _onConnect?.call();
    // ------------------------------------------------------------------
    throw UnimplementedError(
      'WebSocketSocketService.connect deve ser habilitado na integração '
      'com o backend real. Use MockSocketService no modo demo.',
    );
  }

  @override
  void send(SocketMessage message) {
    // final data = jsonEncode(message);
    // _channel?.sink.add(data);
    throw UnimplementedError('Envio real pendente da integração.');
  }

  @override
  void onMessage(SocketMessageHandler handler) => _handlers.add(handler);

  @override
  void onConnect(void Function() handler) => _onConnect = handler;

  @override
  void onDisconnect(void Function() handler) => _onDisconnect = handler;

  @override
  Future<void> disconnect() async {
    // await _channel?.sink.close();
    _connected = false;
  }
}

/// ---------------------------------------------------------------------------
///  Implementação MOCK (modo demo/offline).
///
///  Simula o comportamento de um servidor: aceita conexão e permite que o
///  [GameRepository] publique eventos como se estivessem chegando do socket.
///  É a versão injetada por padrão no binding.
/// ---------------------------------------------------------------------------
class MockSocketService implements SocketService {
  final List<SocketMessageHandler> _handlers = [];
  void Function()? _onConnect;
  void Function()? _onDisconnect;
  bool _connected = false;

  @override
  bool get isConnected => _connected;

  @override
  Future<void> connect({String? url, String? authToken}) async {
    // Simula latência de rede.
    await Future<void>.delayed(const Duration(milliseconds: 150));
    _connected = true;
    _onConnect?.call();
  }

  /// Simula uma mensagem chegando do servidor (chamada pelo Repository/Engine
  /// no modo local).
  void emit(SocketMessage message) {
    if (!_connected) return;
    for (final h in List<SocketMessageHandler>.from(_handlers)) {
      h(message);
    }
  }

  @override
  void send(SocketMessage message) {
    // No modo mock as ações são tratadas localmente pelo engine.
    // Ponto de log/debug:
    // print('[MOCK SOCKET] send -> ${message['type']}');
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
