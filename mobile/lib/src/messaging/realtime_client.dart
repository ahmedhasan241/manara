import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../api/api_client.dart';
import '../config.dart';

/// Minimal Laravel Reverb client (Pusher protocol 7) for one private channel:
/// `private-users.{id}`. Reconnects with backoff; callers also poll, so a missed
/// event only delays delivery.
class RealtimeClient {
  RealtimeClient(this._api);

  final ApiClient _api;
  final _events = StreamController<RealtimeEvent>.broadcast();
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnect;
  int _attempt = 0;
  String? _channelName;
  bool _closed = true;
  bool connected = false;

  Stream<RealtimeEvent> get events => _events.stream;

  bool get isConfigured => AppConfig.reverbKey.isNotEmpty;

  void connect(int userId) {
    if (!isConfigured) return;
    _channelName = 'private-users.$userId';
    _closed = false;
    _open();
  }

  Future<void> disconnect() async {
    _closed = true;
    _reconnect?.cancel();
    await _subscription?.cancel();
    await _channel?.sink.close();
    connected = false;
  }

  void _open() {
    final scheme = AppConfig.reverbTls ? 'wss' : 'ws';
    final uri = Uri.parse('$scheme://${AppConfig.reverbHost}:${AppConfig.reverbPort}/app/${AppConfig.reverbKey}?protocol=7&client=educloud-dart&version=1.0');
    final channel = WebSocketChannel.connect(uri);
    _channel = channel;
    _subscription = channel.stream.listen(_onFrame, onDone: _scheduleReconnect, onError: (_) => _scheduleReconnect());
  }

  Future<void> _onFrame(dynamic frame) async {
    final message = jsonDecode(frame as String) as Map<String, dynamic>;
    final event = message['event'] as String?;
    final rawData = message['data'];
    final data = rawData is String ? jsonDecode(rawData) : rawData;

    switch (event) {
      case 'pusher:connection_established':
        _attempt = 0;
        connected = true;
        final socketId = (data as Map<String, dynamic>)['socket_id'] as String;
        try {
          final auth = await _api.authorizeChannel(socketId, _channelName!);
          _channel?.sink.add(jsonEncode({'event': 'pusher:subscribe', 'data': {'channel': _channelName, 'auth': auth}}));
        } catch (_) {
          await _channel?.sink.close();
        }
      case 'pusher:ping':
        _channel?.sink.add(jsonEncode({'event': 'pusher:pong', 'data': {}}));
      case 'pusher:error' || 'pusher_internal:subscription_succeeded' || null:
        break;
      default:
        if (message['channel'] == _channelName && data is Map<String, dynamic>) {
          _events.add(RealtimeEvent(event, data));
        }
    }
  }

  void _scheduleReconnect() {
    connected = false;
    if (_closed) return;
    final delay = Duration(seconds: [1, 2, 5, 10, 30][_attempt.clamp(0, 4)]);
    _attempt++;
    _reconnect?.cancel();
    _reconnect = Timer(delay, _open);
  }
}

class RealtimeEvent {
  RealtimeEvent(this.name, this.data);

  /// `message.sent` for chat; Laravel's notification event name for alerts.
  final String name;
  final Map<String, dynamic> data;
}
