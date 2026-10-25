import 'dart:convert';
import 'dart:io';

import 'package:educloud/src/messaging/e2e_crypto.dart';
import 'package:flutter_test/flutter_test.dart';

/// Proves the app reads exactly what the web client writes. The fixture comes from
/// the web client's own code:
///   cd web && node --experimental-strip-types packages/portal-kit/scripts/make-e2e-fixture.ts ../mobile/test/fixtures/web_e2e_fixture.json
///
/// Needs libsodium, which the `sodium` package compiles through its build hook.
void main() {
  late E2eCrypto crypto;
  late Map<String, dynamic> fixture;

  setUpAll(() async {
    crypto = await E2eCrypto.load();
    fixture = jsonDecode(File('test/fixtures/web_e2e_fixture.json').readAsStringSync()) as Map<String, dynamic>;
  });

  test('restores a key backup made by the web client and reads its message', () {
    final backup = KeyBackup.fromJson(fixture['backup'] as Map<String, dynamic>);
    final pair = crypto.restoreKeys(backup, fixture['passphrase'] as String);
    final message = EncryptedMessage.fromJson(fixture['message'] as Map<String, dynamic>);

    expect(crypto.decrypt(message, fixture['user_id'] as int, pair), fixture['text']);
  });

  test('rejects a wrong passphrase', () {
    final backup = KeyBackup.fromJson(fixture['backup'] as Map<String, dynamic>);

    expect(() => crypto.restoreKeys(backup, 'wrong passphrase'), throwsA(anything));
  });

  test('a message for someone else cannot be opened', () {
    final backup = KeyBackup.fromJson(fixture['backup'] as Map<String, dynamic>);
    final pair = crypto.restoreKeys(backup, fixture['passphrase'] as String);
    final message = EncryptedMessage.fromJson(fixture['message'] as Map<String, dynamic>);

    // User 7's sealed key exists, but this key pair can't open it.
    expect(crypto.decrypt(message, 7, pair), isNull);
  });

  test('messages and backups the app writes use the same format', () {
    final alice = crypto.createKeys('alice passphrase');
    final bob = crypto.createKeys('bob passphrase');

    final message = crypto.encrypt('Hi Bob 📚', {1: alice.backup.publicKey, 2: bob.backup.publicKey});
    final wire = EncryptedMessage.fromJson(jsonDecode(jsonEncode({...message.toSendJson(), 'conversation_id': 'c', 'sender_id': 1})) as Map<String, dynamic>);

    // Bob restores on a "new device" from his backup alone.
    final restored = crypto.restoreKeys(KeyBackup.fromJson(bob.backup.toJson()), 'bob passphrase');
    expect(crypto.decrypt(wire, 2, restored), 'Hi Bob 📚');
    expect(crypto.decrypt(wire, 1, alice.pair), 'Hi Bob 📚');

    // Same shapes and sizes the web client produces.
    expect(base64Decode(alice.backup.publicKey), hasLength(32));
    expect(base64Decode(wire.nonce), hasLength(24));
    expect(wire.keys.keys, unorderedEquals(['1', '2']));
    expect(alice.backup.kdfOpsLimit, fixture['backup']['kdf_ops_limit']);
    expect(alice.backup.kdfMemLimit, fixture['backup']['kdf_mem_limit']);
  });
}
