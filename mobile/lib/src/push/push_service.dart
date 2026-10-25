import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import '../api/api_client.dart';

/// Push notifications through Firebase Cloud Messaging.
///
/// The API sends alerts for new messages (sender only — message text is end-to-end
/// encrypted), grades, important announcements, deadlines and system alerts.
/// If Firebase isn't configured for this build (no google-services.json /
/// GoogleService-Info.plist), push is skipped and the rest of the app works.
class PushService {
  PushService(this._api);

  final ApiClient _api;
  final messengerKey = GlobalKey<ScaffoldMessengerState>();
  final _openedConversations = StreamController<String>.broadcast();
  final _openedLessons = StreamController<String>.broadcast();
  String? _launchConversation;
  String? _launchLesson;

  /// Lesson ids from tapped "starting soon" / "live now" / recording notifications.
  Stream<String> get openedLessons => _openedLessons.stream;

  String? takeLaunchLesson() {
    final id = _launchLesson;
    _launchLesson = null;
    return id;
  }

  /// Conversation ids from tapped message notifications.
  Stream<String> get openedConversations => _openedConversations.stream;

  /// The conversation whose notification launched the app, if any (read once).
  String? takeLaunchConversation() {
    final id = _launchConversation;
    _launchConversation = null;
    return id;
  }
  bool _available = false;
  String? _token;
  StreamSubscription<String>? _refresh;

  Future<void> init() async {
    try {
      await Firebase.initializeApp();
      _available = true;
    } catch (_) {
      return;
    }

    String? conversationOf(RemoteMessage m) => m.data['type'] == 'message' ? m.data['conversation_id'] as String? : null;
    String? lessonOf(RemoteMessage m) => switch (m.data['type']) {
          'lesson' => m.data['lesson_id'] as String?,
          'recording' => m.data['course_id'] as String?,
          _ => null,
        };
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    _launchConversation = initial == null ? null : conversationOf(initial);
    _launchLesson = initial == null ? null : lessonOf(initial);
    FirebaseMessaging.onMessageOpenedApp.listen((m) {
      final conversation = conversationOf(m);
      if (conversation != null) _openedConversations.add(conversation);
      final lesson = lessonOf(m);
      if (lesson != null) _openedLessons.add(lesson);
    });

    // While the app is open, show alerts in-app instead of the system tray.
    FirebaseMessaging.onMessage.listen((message) {
      // The chat screen already shows new messages live.
      if (message.data['type'] == 'message') return;
      final n = message.notification;
      if (n == null) return;
      messengerKey.currentState?.showSnackBar(SnackBar(
        content: Text([n.title, n.body].whereType<String>().join(' — ')),
        behavior: SnackBarBehavior.floating,
      ));
    });
  }

  /// Call after sign-in: asks permission and registers this device with the API.
  Future<void> register() async {
    if (!_available) return;
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    _token = await messaging.getToken();
    if (_token != null) await _send(_token!);

    await _refresh?.cancel();
    _refresh = messaging.onTokenRefresh.listen((token) {
      _token = token;
      _send(token);
    });
  }

  /// Call before sign-out so this phone stops receiving the user's alerts.
  Future<void> unregister() async {
    await _refresh?.cancel();
    if (_token == null) return;
    try {
      await _api.unregisterPushToken(_token!);
    } catch (_) {}
    _token = null;
  }

  Future<void> _send(String token) async {
    try {
      await _api.registerPushToken(token, Platform.isIOS ? 'ios' : 'android');
    } catch (_) {
      // Offline: the token is registered again on the next launch.
    }
  }
}
