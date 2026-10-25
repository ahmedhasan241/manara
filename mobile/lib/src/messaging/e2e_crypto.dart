import 'dart:convert';
import 'dart:typed_data';

import 'package:sodium/sodium_sumo.dart';
import 'package:uuid/uuid.dart';

/// End-to-end encryption, byte-for-byte compatible with the web client
/// (`web/packages/portal-kit/src/e2e.ts`):
///
/// - One X25519 key pair per user.
/// - Message body: JSON `{"v":1,"text":...}` encrypted with a fresh
///   XChaCha20-Poly1305 key (no additional data, combined mode).
/// - That key sealed (`crypto_box_seal`) to each participant's public key.
/// - Private key backed up with `crypto_secretbox_easy` under an Argon2id key
///   derived from the user's messaging passphrase.
/// - All binary values are standard, padded base64.
class E2eCrypto {
  E2eCrypto(this._sodium);

  /// Loads libsodium (built and bundled by the `sodium` package's build hook).
  static Future<E2eCrypto> load() async => E2eCrypto(await Future<SodiumSumo>.value(SodiumSumoInit.init()));

  final SodiumSumo _sodium;

  /// Creates a new key pair and its passphrase-encrypted backup.
  ({KeyPair pair, KeyBackup backup}) createKeys(String passphrase) {
    final pair = _sodium.crypto.box.keyPair();
    return (pair: pair, backup: wrapPrivateKey(pair, passphrase));
  }

  KeyBackup wrapPrivateKey(KeyPair pair, String passphrase) {
    final pwhash = _sodium.crypto.pwhash;
    final salt = _sodium.randombytes.buf(pwhash.saltBytes);
    final ops = pwhash.opsLimitInteractive;
    final mem = pwhash.memLimitInteractive;
    final key = _deriveKey(passphrase, salt, ops, mem);
    final nonce = _sodium.randombytes.buf(_sodium.crypto.secretBox.nonceBytes);
    try {
      final privateKey = pair.secretKey.extractBytes();
      return KeyBackup(
        publicKey: base64Encode(pair.publicKey),
        encryptedPrivateKey: base64Encode(_sodium.crypto.secretBox.easy(message: privateKey, nonce: nonce, key: key)),
        privateKeyNonce: base64Encode(nonce),
        kdfSalt: base64Encode(salt),
        kdfOpsLimit: ops,
        kdfMemLimit: mem,
      );
    } finally {
      key.dispose();
    }
  }

  /// Restores the key pair from the server backup. Throws [SodiumException]
  /// when the passphrase is wrong.
  KeyPair restoreKeys(KeyBackup backup, String passphrase) {
    final key = _deriveKey(passphrase, base64Decode(backup.kdfSalt), backup.kdfOpsLimit, backup.kdfMemLimit);
    try {
      final privateKey = _sodium.crypto.secretBox.openEasy(
        cipherText: base64Decode(backup.encryptedPrivateKey),
        nonce: base64Decode(backup.privateKeyNonce),
        key: key,
      );
      return KeyPair(publicKey: base64Decode(backup.publicKey), secretKey: _sodium.secureCopy(privateKey));
    } finally {
      key.dispose();
    }
  }

  /// Rebuilds a key pair from bytes kept in the device keystore.
  KeyPair keyPairFromBytes(Uint8List publicKey, Uint8List secretKey) =>
      KeyPair(publicKey: publicKey, secretKey: _sodium.secureCopy(secretKey));

  EncryptedMessage encrypt(String text, Map<int, String> recipientPublicKeys) {
    final aead = _sodium.crypto.aeadXChaCha20Poly1305IETF;
    final messageKey = aead.keygen();
    final nonce = _sodium.randombytes.buf(aead.nonceBytes);
    try {
      final body = utf8.encode(jsonEncode({'v': 1, 'text': text}));
      final keyBytes = messageKey.extractBytes();
      return EncryptedMessage(
        id: const Uuid().v4(),
        ciphertext: base64Encode(aead.encrypt(message: body, nonce: nonce, key: messageKey)),
        nonce: base64Encode(nonce),
        keys: {
          for (final entry in recipientPublicKeys.entries)
            '${entry.key}': base64Encode(_sodium.crypto.box.seal(message: keyBytes, publicKey: base64Decode(entry.value))),
        },
      );
    } finally {
      messageKey.dispose();
    }
  }

  /// Returns the message text, or null when this user can't open it (for
  /// example, it was sent before they had a key).
  String? decrypt(EncryptedMessage message, int userId, KeyPair pair) {
    final sealed = message.keys['$userId'];
    if (sealed == null) return null;
    SecureKey? messageKey;
    try {
      final keyBytes = _sodium.crypto.box.sealOpen(
        cipherText: base64Decode(sealed),
        publicKey: pair.publicKey,
        secretKey: pair.secretKey,
      );
      messageKey = _sodium.secureCopy(keyBytes);
      final body = _sodium.crypto.aeadXChaCha20Poly1305IETF.decrypt(
        cipherText: base64Decode(message.ciphertext),
        nonce: base64Decode(message.nonce),
        key: messageKey,
      );
      return (jsonDecode(utf8.decode(body)) as Map<String, dynamic>)['text'] as String?;
    } catch (_) {
      return null;
    } finally {
      messageKey?.dispose();
    }
  }

  SecureKey _deriveKey(String passphrase, Uint8List salt, int ops, int mem) => _sodium.crypto.pwhash.callStr(
        outLen: _sodium.crypto.secretBox.keyBytes,
        password: passphrase,
        salt: salt,
        opsLimit: ops,
        memLimit: mem,
        alg: CryptoPwhashAlgorithm.argon2id13,
      );
}

/// The passphrase-encrypted key backup stored by the API (`/me/messaging-key`).
class KeyBackup {
  KeyBackup({
    required this.publicKey,
    required this.encryptedPrivateKey,
    required this.privateKeyNonce,
    required this.kdfSalt,
    required this.kdfOpsLimit,
    required this.kdfMemLimit,
  });

  factory KeyBackup.fromJson(Map<String, dynamic> json) => KeyBackup(
        publicKey: json['public_key'] as String,
        encryptedPrivateKey: json['encrypted_private_key'] as String,
        privateKeyNonce: json['private_key_nonce'] as String,
        kdfSalt: json['kdf_salt'] as String,
        kdfOpsLimit: json['kdf_ops_limit'] as int,
        kdfMemLimit: json['kdf_mem_limit'] as int,
      );

  final String publicKey;
  final String encryptedPrivateKey;
  final String privateKeyNonce;
  final String kdfSalt;
  final int kdfOpsLimit;
  final int kdfMemLimit;

  Map<String, dynamic> toJson() => {
        'public_key': publicKey,
        'encrypted_private_key': encryptedPrivateKey,
        'private_key_nonce': privateKeyNonce,
        'kdf_salt': kdfSalt,
        'kdf_ops_limit': kdfOpsLimit,
        'kdf_mem_limit': kdfMemLimit,
      };
}

/// An encrypted message as the API stores and returns it.
class EncryptedMessage {
  EncryptedMessage({
    required this.id,
    required this.ciphertext,
    required this.nonce,
    required this.keys,
    this.conversationId,
    this.senderId,
    this.createdAt,
  });

  factory EncryptedMessage.fromJson(Map<String, dynamic> json) => EncryptedMessage(
        id: json['id'] as String,
        conversationId: json['conversation_id'] as String?,
        senderId: json['sender_id'] as int?,
        ciphertext: json['ciphertext'] as String,
        nonce: json['nonce'] as String,
        keys: Map<String, String>.from(json['keys'] as Map),
        createdAt: json['created_at'] == null ? null : DateTime.parse(json['created_at'] as String),
      );

  final String id;
  final String? conversationId;
  final int? senderId;
  final String ciphertext;
  final String nonce;
  final Map<String, String> keys;
  final DateTime? createdAt;

  Map<String, dynamic> toSendJson() => {'id': id, 'ciphertext': ciphertext, 'nonce': nonce, 'keys': keys};
}
