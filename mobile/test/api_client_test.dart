import 'dart:convert';

import 'package:educloud/src/api/api_client.dart';
import 'package:educloud/src/sync/offline_queue.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('login returns an MFA challenge when the server asks for one', () async {
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        expect(request.url.path, '/api/v1/auth/login');
        return http.Response(jsonEncode({'mfa_required': true, 'challenge': 'abc'}), 200);
      }),
    );

    final result = await client.login('a@b.test', 'pw');

    expect(result, isA<MfaRequired>());
    expect((result as MfaRequired).challenge, 'abc');
  });

  test('requests carry the token and tenant headers', () async {
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        expect(request.headers['Authorization'], 'Bearer t0k');
        expect(request.headers['X-Tenant'], 'greenwood');
        return http.Response(jsonEncode({'data': []}), 200);
      }),
    )
      ..token = 't0k'
      ..tenant = 'greenwood';

    expect(await client.courses(), isEmpty);
  });

  test('validation errors surface the first message', () async {
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((_) async => http.Response(
            jsonEncode({'message': 'Invalid', 'errors': {'email': ['These credentials do not match our records.']}}),
            422,
          )),
    );

    expect(
      () => client.login('a@b.test', 'wrong'),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', 'These credentials do not match our records.')),
    );
  });

  test('message history uses the v1 API and channel auth uses /api/broadcasting/auth', () async {
    final paths = <String>[];
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        paths.add('${request.method} ${request.url.path}?${request.url.query}');
        if (request.url.path == '/api/broadcasting/auth') {
          expect(jsonDecode(request.body), {'socket_id': '1.2', 'channel_name': 'private-users.5'});
          return http.Response(jsonEncode({'auth': 'key:signature'}), 200);
        }
        return http.Response(jsonEncode([
          {'id': 'm1', 'conversation_id': 'c1', 'sender_id': 5, 'ciphertext': 'AA==', 'nonce': 'AA==', 'keys': {'5': 'AA=='}, 'created_at': '2026-10-24T09:00:00.000000Z'},
        ]), 200);
      }),
    )..token = 't';

    final messages = await client.messages('c1', since: DateTime.utc(2026, 10, 24, 8));
    expect(messages.single.senderId, 5);
    expect(messages.single.keys, {'5': 'AA=='});
    expect(await client.authorizeChannel('1.2', 'private-users.5'), 'key:signature');
    expect(paths.first, startsWith('GET /api/v1/conversations/c1/messages?limit=50&since=2026-10-24T08%3A00%3A00.000Z'));
    expect(paths.last, 'POST /api/broadcasting/auth?');
  });

  test('joining a lesson returns its meeting link', () async {
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        expect('${request.method} ${request.url.path}', 'POST /api/v1/live-lessons/l1/join');
        return http.Response(jsonEncode({'join_url': 'https://zoom.us/j/1', 'passcode': null}), 200);
      }),
    );

    expect(await client.joinLesson('l1'), 'https://zoom.us/j/1');
  });

  test('parses live lessons', () async {
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((_) async => http.Response(jsonEncode([
            {'id': 'l1', 'course_id': 'c1', 'course': {'id': 'c1', 'title': 'Maths', 'code': 'M1'}, 'title': 'Live', 'scheduled_at': '2026-10-25T10:00:00.000000Z', 'duration_minutes': 60, 'status': 'live', 'joinable': true, 'host': {'id': 1, 'name': 'T'}, 'recordings_count': null},
          ]), 200)),
    );

    final lesson = (await client.upcomingLessons()).single;
    expect(lesson.isLive, isTrue);
    expect(lesson.courseTitle, 'Maths');
    expect(lesson.recordingsCount, 0);
  });

  test('profile updates PATCH /me with the location and return the new user', () async {
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        expect('${request.method} ${request.url.path}', 'PATCH /api/v1/me');
        expect(jsonDecode(request.body), {'name': 'Mona Ali', 'phone': null, 'country': 'EG', 'city': 'Cairo', 'area': null});
        return http.Response(jsonEncode({
          'message': 'Profile updated.',
          'user': {'id': 1, 'name': 'Mona Ali', 'email': 'm@a.test', 'country': 'EG', 'city': 'Cairo', 'area': null, 'phone': null, 'memberships': []},
        }), 200);
      }),
    );

    final result = await client.updateProfile(name: ' Mona Ali ', phone: '', country: 'eg', city: 'Cairo', area: ' ');
    expect(result.message, 'Profile updated.');
    expect(result.user.country, 'EG');
    expect(result.user.city, 'Cairo');
  });

  test('password changes PUT /me/password and keep per-field errors', () async {
    final client = ApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        expect('${request.method} ${request.url.path}', 'PUT /api/v1/me/password');
        expect(jsonDecode(request.body), {'current_password': 'old', 'password': 'newpass12', 'password_confirmation': 'newpass12'});
        return http.Response(jsonEncode({'message': 'Invalid', 'errors': {'current_password': ['The password is incorrect.']}}), 422);
      }),
    );

    expect(
      () => client.changePassword(current: 'old', password: 'newpass12', confirmation: 'newpass12'),
      throwsA(isA<ApiException>()
          .having((e) => e.message, 'message', 'The password is incorrect.')
          .having((e) => e.fieldErrors['current_password'], 'field error', 'The password is incorrect.')),
    );
  });

  test('offline attendance ids are stable per session and student', () {
    final a = OfflineQueue.stableId('session-1', 7);
    expect(a, OfflineQueue.stableId('session-1', 7));
    expect(a, isNot(OfflineQueue.stableId('session-1', 8)));
    expect(RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$').hasMatch(a), isTrue);
  });
}
