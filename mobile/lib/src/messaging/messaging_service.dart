import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sodium/sodium_sumo.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import 'e2e_crypto.dart';
import 'realtime_client.dart';

enum KeyState { loading, needsSetup, needsUnlock, ready, unavailable }

/// A decrypted message for display.
class ChatEntry {
  ChatEntry(this.message, this.text);

  final EncryptedMessage message;

  /// Null when this device's key can't open the message.
  final String? text;
}

/// Holds the user's messaging key and the conversations, and keeps them current
/// through Reverb events plus a periodic catch-up.
class MessagingService extends ChangeNotifier {
  MessagingService(this._api, {FlutterSecureStorage? storage, RealtimeClient? realtime})
      : _storage = storage ?? const FlutterSecureStorage(),
        _realtime = realtime ?? RealtimeClient(_api);

  static const _pollInterval = Duration(seconds: 30);

  final ApiClient _api;
  final FlutterSecureStorage _storage;
  final RealtimeClient _realtime;
  E2eCrypto? _crypto;
  KeyPair? _keys;
  KeyBackup? _backup;
  int? _userId;
  StreamSubscription<RealtimeEvent>? _events;
  Timer? _poll;

  KeyState keyState = KeyState.loading;
  List<Conversation> conversations = [];
  final Map<String, List<ChatEntry>> threads = {};
  String? openConversationId;

  bool get isLive => _realtime.connected;

  /// Loads libsodium and the key after sign-in. Safe to call repeatedly.
  Future<void> start(int userId) {
    if (_userId == userId) return _starting ?? Future.value();
    return _starting = _start(userId);
  }

  Future<void>? _starting;

  Future<void> _start(int userId) async {
    _userId = userId;
    try {
      _crypto ??= await E2eCrypto.load();
    } catch (_) {
      keyState = KeyState.unavailable;
      notifyListeners();
      return;
    }

    _backup = await _api.messagingKey();
    if (_backup == null) {
      keyState = KeyState.needsSetup;
    } else {
      _keys = await _loadLocalKey(_backup!.publicKey);
      keyState = _keys == null ? KeyState.needsUnlock : KeyState.ready;
    }
    notifyListeners();
    if (keyState == KeyState.ready) _goLive();
  }

  Future<void> createKey(String passphrase, {bool reset = false}) async {
    final created = _crypto!.createKeys(passphrase);
    await _api.saveMessagingKey(created.backup, reset: reset);
    _backup = created.backup;
    await _useKey(created.pair);
  }

  /// Throws when the passphrase is wrong.
  Future<void> unlock(String passphrase) async => _useKey(_crypto!.restoreKeys(_backup!, passphrase));

  Future<void> refreshConversations() async {
    conversations = await _api.conversations();
    notifyListeners();
  }

  /// Fetches messages newer than what we have (or the latest page).
  Future<void> syncThread(String conversationId) async {
    final known = threads[conversationId];
    final since = known == null || known.isEmpty ? null : known.last.message.createdAt;
    _add(await _api.messages(conversationId, since: since));
  }

  Future<void> loadOlder(String conversationId) async {
    final known = threads[conversationId];
    if (known == null || known.isEmpty) return;
    _add(await _api.messages(conversationId, before: known.first.message.createdAt));
  }

  Future<void> openThread(String conversationId) async {
    openConversationId = conversationId;
    await syncThread(conversationId);
    await _api.markConversationRead(conversationId);
    conversations = [
      for (final c in conversations)
        c.id == conversationId
            ? Conversation(id: c.id, type: c.type, title: c.title, lastMessageAt: c.lastMessageAt, alertsOn: c.alertsOn, participants: c.participants)
            : c,
    ];
    notifyListeners();
  }

  void closeThread() => openConversationId = null;

  Future<void> send(Conversation conversation, String text) async {
    final recipients = {
      for (final p in conversation.participants)
        if (p.publicKey != null) p.id: p.publicKey!,
    };
    final sent = await _api.sendMessage(conversation.id, _crypto!.encrypt(text, recipients));
    _add([sent]);
    unawaited(refreshConversations());
  }

  Future<void> setAlerts(Conversation conversation, bool enabled) async {
    await _api.setConversationAlerts(conversation.id, enabled: enabled);
    await refreshConversations();
  }

  Future<Conversation> startConversation(List<int> userIds, {String? title}) async {
    final conversation = userIds.length == 1
        ? await _api.startDirectConversation(userIds.single)
        : await _api.startGroupConversation(title ?? 'Group', userIds);
    await refreshConversations();
    return conversation;
  }

  Future<List<Contact>> contacts() => _api.contacts();

  /// Forget everything on sign-out. The key stays in the keystore for this user,
  /// so signing in again doesn't need the passphrase.
  Future<void> stop() async {
    await _teardown();
    keyState = KeyState.loading;
    conversations = [];
    threads.clear();
    notifyListeners();
  }

  Future<void> _teardown() async {
    await _events?.cancel();
    _events = null;
    _poll?.cancel();
    _poll = null;
    await _realtime.disconnect();
    _keys?.dispose();
    _keys = null;
    _userId = null;
    _starting = null;
    openConversationId = null;
  }

  Future<void> _useKey(KeyPair pair) async {
    _keys = pair;
    await _storage.write(
      key: _storageKey,
      value: jsonEncode({'pub': base64Encode(pair.publicKey), 'priv': base64Encode(pair.secretKey.extractBytes())}),
    );
    keyState = KeyState.ready;
    threads.clear(); // re-decrypt with the new key
    notifyListeners();
    _goLive();
  }

  void _goLive() {
    unawaited(refreshConversations());
    _events ??= _realtime.events.listen((event) {
      if (event.name != 'message.sent') return;
      final message = EncryptedMessage.fromJson(event.data);
      _add([message]);
      unawaited(refreshConversations());
      if (openConversationId == message.conversationId) unawaited(_api.markConversationRead(message.conversationId!));
    });
    _realtime.connect(_userId!);
    _poll ??= Timer.periodic(_pollInterval, (_) {
      unawaited(refreshConversations().catchError((_) {}));
      if (openConversationId != null) unawaited(syncThread(openConversationId!).catchError((_) {}));
    });
  }

  void _add(List<EncryptedMessage> incoming) {
    if (incoming.isEmpty || _keys == null) return;
    for (final m in incoming) {
      final list = threads.putIfAbsent(m.conversationId!, () => []);
      if (list.any((e) => e.message.id == m.id)) continue;
      list.add(ChatEntry(m, _crypto!.decrypt(m, _userId!, _keys!)));
    }
    for (final list in threads.values) {
      list.sort((a, b) => (a.message.createdAt ?? DateTime(0)).compareTo(b.message.createdAt ?? DateTime(0)));
    }
    notifyListeners();
  }

  String get _storageKey => 'e2e_key_$_userId';

  Future<KeyPair?> _loadLocalKey(String expectedPublicKey) async {
    final raw = await _storage.read(key: _storageKey);
    if (raw == null) return null;
    final json = jsonDecode(raw) as Map<String, dynamic>;
    // A reset on another device makes this copy stale.
    if (json['pub'] != expectedPublicKey) return null;
    return _crypto!.keyPairFromBytes(base64Decode(json['pub'] as String), base64Decode(json['priv'] as String));
  }

  @override
  void dispose() {
    unawaited(_teardown());
    super.dispose();
  }
}
