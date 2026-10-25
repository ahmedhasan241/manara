import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../api/api_client.dart';

/// Offline write queue. Teachers can take attendance and enter grades with no
/// connection; changes are stored on the device and pushed to `/sync/push` when
/// the connection returns. Each change has a stable UUID, so retries are safe.
class OfflineQueue extends ChangeNotifier {
  OfflineQueue(this._api, {SharedPreferencesAsync? prefs, Connectivity? connectivity})
      : _prefs = prefs ?? SharedPreferencesAsync(),
        _connectivity = connectivity ?? Connectivity();

  static const _key = 'educloud.sync_queue';

  final ApiClient _api;
  final SharedPreferencesAsync _prefs;
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  List<Map<String, dynamic>> _pending = [];
  bool _online = true;
  bool _syncing = false;

  int get pendingCount => _pending.length;
  bool get isOnline => _online;
  bool get isSyncing => _syncing;

  Future<void> start() async {
    _pending = await _load();
    _online = _isConnected(await _connectivity.checkConnectivity());
    notifyListeners();
    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      _online = _isConnected(results);
      notifyListeners();
      if (_online) flush();
    });
    await flush();
  }

  /// Queues attendance for one student in one session. Re-marking the same
  /// student replaces the earlier queued change.
  Future<void> markAttendance({required String sessionId, required int studentId, required String status}) async {
    final id = stableId(sessionId, studentId);
    _pending.removeWhere((c) => c['id'] == id);
    _pending.add({
      'entity': 'attendance',
      'id': id,
      'client_updated_at': DateTime.now().toUtc().toIso8601String(),
      'data': {'class_session_id': sessionId, 'student_id': studentId, 'status': status},
    });
    await _save();
    unawaited(flush());
  }

  Future<void> flush() async {
    if (_syncing || _pending.isEmpty || !_online) return;
    _syncing = true;
    notifyListeners();
    try {
      final batch = List<Map<String, dynamic>>.from(_pending.take(200));
      final results = await _api.pushChanges(batch);
      // Applied and conflict results are settled on the server; rejected ones
      // would fail again, so they are dropped too and surfaced via the API logs.
      final settled = results.map((r) => r['id']).toSet();
      _pending.removeWhere((c) => settled.contains(c['id']));
      await _save();
    } catch (_) {
      // Network or server error: keep everything and retry on the next change
      // in connectivity.
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  /// Deterministic UUID-shaped id for (session, student).
  static String stableId(String sessionId, int studentId) =>
      const Uuid().v5(Namespace.url.value, 'educloud:attendance:$sessionId:$studentId');

  bool _isConnected(List<ConnectivityResult> results) => results.any((r) => r != ConnectivityResult.none);

  Future<List<Map<String, dynamic>>> _load() async {
    final raw = await _prefs.getString(_key);
    if (raw == null) return [];
    return List<Map<String, dynamic>>.from(jsonDecode(raw) as List);
  }

  Future<void> _save() => _prefs.setString(_key, jsonEncode(_pending));

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
