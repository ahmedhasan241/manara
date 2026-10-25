import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../messaging/e2e_crypto.dart';
import 'models.dart';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message, [this.code, this.fieldErrors = const {}]);

  final int statusCode;
  final String message;
  final String? code;

  /// The first validation message for each field (422 responses), for inline errors.
  final Map<String, String> fieldErrors;

  bool get isUnauthorized => statusCode == 401;
  bool get isValidation => statusCode == 422;

  @override
  String toString() => message;
}

/// Result of the first sign-in step: either a token, or an MFA challenge.
sealed class LoginResult {}

class LoginSuccess extends LoginResult {
  LoginSuccess(this.token, this.user);
  final String token;
  final User user;
}

class MfaRequired extends LoginResult {
  MfaRequired(this.challenge);
  final String challenge;
}

/// Thin client for the Manara REST API (`/api/v1`).
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl})
      : _http = httpClient ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.apiUrl;

  final http.Client _http;
  final String _baseUrl;
  String? token;
  String? tenant;

  Future<dynamic> request(String method, String path, [Object? body]) => _send(method, '/api/v1$path', body);

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    final request = http.Request(method, Uri.parse('$_baseUrl$path'))
      ..headers.addAll({
        'Accept': 'application/json',
        if (body != null) 'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
        if (tenant != null) 'X-Tenant': tenant!,
      });
    if (body != null) request.body = jsonEncode(body);

    final response = await http.Response.fromStream(await _http.send(request).timeout(const Duration(seconds: 20)));
    if (response.statusCode == 204) return null;

    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      final map = decoded is Map<String, dynamic> ? decoded : const <String, dynamic>{};
      final errors = map['errors'] as Map<String, dynamic>?;
      final firstError = errors?.values.whereType<List>().firstOrNull?.firstOrNull;
      final fieldErrors = <String, String>{
        for (final entry in (errors ?? const <String, dynamic>{}).entries)
          if (entry.value is List && (entry.value as List).isNotEmpty) entry.key: (entry.value as List).first.toString(),
      };
      throw ApiException(
        response.statusCode,
        (firstError ?? map['message'] ?? 'Request failed').toString(),
        map['code'] as String?,
        fieldErrors,
      );
    }
    return decoded;
  }

  Future<LoginResult> login(String email, String password, {String device = 'mobile'}) async {
    final json = await request('POST', '/auth/login', {'email': email, 'password': password, 'device_name': device}) as Map<String, dynamic>;
    if (json['mfa_required'] == true) return MfaRequired(json['challenge'] as String);
    return LoginSuccess(json['token'] as String, User.fromJson(json['user'] as Map<String, dynamic>));
  }

  Future<LoginSuccess> verifyMfa(String challenge, String code) async {
    final json = await request('POST', '/auth/mfa', {'challenge': challenge, 'code': code}) as Map<String, dynamic>;
    return LoginSuccess(json['token'] as String, User.fromJson(json['user'] as Map<String, dynamic>));
  }

  Future<void> logout() => request('POST', '/auth/logout');

  Future<User> me() async => User.fromJson((await request('GET', '/me') as Map<String, dynamic>)['data'] as Map<String, dynamic>);

  /// Saves the profile (`PATCH /me`). Only the fields passed are changed;
  /// pass an empty string to clear phone, city or area. Returns the server's
  /// confirmation message and the updated user.
  Future<({String message, User user})> updateProfile({String? name, String? phone, String? country, String? city, String? area}) async {
    String? blankToNull(String? v) => v == null ? null : (v.trim().isEmpty ? null : v.trim());
    final json = await request('PATCH', '/me', {
      if (name != null) 'name': name.trim(),
      if (phone != null) 'phone': blankToNull(phone),
      if (country != null) 'country': blankToNull(country)?.toUpperCase(),
      if (city != null) 'city': blankToNull(city),
      if (area != null) 'area': blankToNull(area),
    }) as Map<String, dynamic>;
    final user = (json['user'] ?? json['data']) as Map<String, dynamic>;
    return (message: (json['message'] ?? 'Profile updated.').toString(), user: User.fromJson(user));
  }

  /// Changes the password (`PUT /me/password`). Other devices are signed out.
  Future<String> changePassword({required String current, required String password, required String confirmation}) async {
    final json = await request('PUT', '/me/password', {
      'current_password': current,
      'password': password,
      'password_confirmation': confirmation,
    });
    return ((json is Map ? json['message'] : null) ?? 'Password changed.').toString();
  }

  Future<List<Course>> courses() async {
    final json = await request('GET', '/courses?per_page=100') as Map<String, dynamic>;
    return (json['data'] as List).map((c) => Course.fromJson(c as Map<String, dynamic>)).toList();
  }

  Future<List<Assessment>> assessments(String courseId) async =>
      (await request('GET', '/courses/$courseId/assessments') as List).map((a) => Assessment.fromJson(a as Map<String, dynamic>)).toList();

  Future<List<GradeRow>> grades(String courseId) async =>
      (await request('GET', '/courses/$courseId/grades') as List).map((g) => GradeRow.fromJson(g as Map<String, dynamic>)).toList();

  Future<List<ClassSession>> sessions(String courseId) async =>
      (await request('GET', '/courses/$courseId/sessions') as List).map((s) => ClassSession.fromJson(s as Map<String, dynamic>)).toList();

  Future<List<Student>> students(String courseId) async =>
      (await request('GET', '/courses/$courseId/students') as List).map((s) => Student.fromJson(s as Map<String, dynamic>)).toList();

  Future<List<Map<String, dynamic>>> notifications() async =>
      List<Map<String, dynamic>>.from((await request('GET', '/notifications') as Map<String, dynamic>)['data'] as List);

  // Live lessons and recordings

  Future<List<LiveLesson>> upcomingLessons() async =>
      (await request('GET', '/live-lessons/upcoming') as List).map((l) => LiveLesson.fromJson(l as Map<String, dynamic>)).toList();

  Future<List<LiveLesson>> courseLessons(String courseId) async =>
      (await request('GET', '/courses/$courseId/live-lessons') as List).map((l) => LiveLesson.fromJson(l as Map<String, dynamic>)).toList();

  /// Records the join and returns the meeting link.
  Future<String> joinLesson(String lessonId) async =>
      (await request('POST', '/live-lessons/$lessonId/join') as Map<String, dynamic>)['join_url'] as String;

  Future<List<Recording>> recordings(String courseId) async =>
      (await request('GET', '/courses/$courseId/recordings') as List).map((r) => Recording.fromJson(r as Map<String, dynamic>)).toList();

  /// A short-lived URL that streams the recording (or the external link).
  Future<String> playRecording(String recordingId) async =>
      (await request('POST', '/recordings/$recordingId/play') as Map<String, dynamic>)['url'] as String;

  // Encrypted messaging

  Future<KeyBackup?> messagingKey() async {
    final data = (await request('GET', '/me/messaging-key') as Map<String, dynamic>)['data'];
    return data == null ? null : KeyBackup.fromJson(data as Map<String, dynamic>);
  }

  Future<void> saveMessagingKey(KeyBackup backup, {bool reset = false}) =>
      request('PUT', '/me/messaging-key', {...backup.toJson(), if (reset) 'reset': true});

  Future<List<Conversation>> conversations() async =>
      (await request('GET', '/conversations') as List).map((c) => Conversation.fromJson(c as Map<String, dynamic>)).toList();

  Future<List<Contact>> contacts() async =>
      (await request('GET', '/messaging/contacts') as List).map((c) => Contact.fromJson(c as Map<String, dynamic>)).toList();

  Future<Conversation> startDirectConversation(int userId) async => Conversation.fromJson(
      await request('POST', '/conversations', {'type': 'direct', 'user_id': userId}) as Map<String, dynamic>);

  Future<Conversation> startGroupConversation(String title, List<int> userIds) async => Conversation.fromJson(
      await request('POST', '/conversations', {'type': 'group', 'title': title, 'user_ids': userIds}) as Map<String, dynamic>);

  /// Newest first. `since` is inclusive; callers dedupe by id.
  Future<List<EncryptedMessage>> messages(String conversationId, {DateTime? since, DateTime? before, int limit = 50}) async {
    final query = {
      'limit': '$limit',
      if (since != null) 'since': since.toUtc().toIso8601String(),
      if (before != null) 'before': before.toUtc().toIso8601String(),
    };
    final path = Uri(path: '/conversations/$conversationId/messages', queryParameters: query).toString();
    return (await request('GET', path) as List).map((m) => EncryptedMessage.fromJson(m as Map<String, dynamic>)).toList();
  }

  Future<EncryptedMessage> sendMessage(String conversationId, EncryptedMessage message) async => EncryptedMessage.fromJson(
      await request('POST', '/conversations/$conversationId/messages', message.toSendJson()) as Map<String, dynamic>);

  Future<void> markConversationRead(String conversationId) => request('POST', '/conversations/$conversationId/read');

  Future<void> setConversationAlerts(String conversationId, {required bool enabled}) =>
      request('PATCH', '/conversations/$conversationId/settings', {'notify': enabled ? 'all' : 'none'});

  /// Signs a private WebSocket channel subscription (Pusher protocol).
  Future<String> authorizeChannel(String socketId, String channelName) async {
    final json = await _send('POST', '/api/broadcasting/auth', {'socket_id': socketId, 'channel_name': channelName}) as Map<String, dynamic>;
    return json['auth'] as String;
  }

  Future<void> registerPushToken(String token, String platform) =>
      request('POST', '/me/push-tokens', {'token': token, 'platform': platform});

  Future<void> unregisterPushToken(String token) => request('DELETE', '/me/push-tokens', {'token': token});

  /// Sends queued offline changes. Returns the per-change results from the server.
  Future<List<Map<String, dynamic>>> pushChanges(List<Map<String, dynamic>> changes) async {
    final json = await request('POST', '/sync/push', {'changes': changes}) as Map<String, dynamic>;
    return List<Map<String, dynamic>>.from(json['results'] as List);
  }
}
