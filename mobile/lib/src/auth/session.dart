import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../push/push_service.dart';

/// Signed-in state. The API token lives in the platform keystore (Keychain /
/// Android Keystore). With biometric lock on, the app asks for fingerprint or
/// Face ID before it uses the stored token.
class Session extends ChangeNotifier {
  Session(this.api, {this.push, FlutterSecureStorage? storage, LocalAuthentication? localAuth})
      : _storage = storage ?? const FlutterSecureStorage(),
        _localAuth = localAuth ?? LocalAuthentication();

  final ApiClient api;
  final PushService? push;
  final FlutterSecureStorage _storage;
  final LocalAuthentication _localAuth;

  User? user;
  Membership? membership;
  bool locked = false;
  bool biometricEnabled = false;
  bool ready = false;

  bool get signedIn => user != null;

  Future<void> restore() async {
    final token = await _storage.read(key: 'token');
    biometricEnabled = await _storage.read(key: 'biometric') == 'on';
    if (token != null) {
      api.token = token;
      api.tenant = await _storage.read(key: 'tenant');
      locked = biometricEnabled;
      if (!locked) await _loadUser();
    }
    ready = true;
    notifyListeners();
  }

  Future<void> completeLogin(LoginSuccess result) async {
    api.token = result.token;
    await _storage.write(key: 'token', value: result.token);
    user = result.user;
    if (result.user.memberships.isNotEmpty) await selectWorkspace(result.user.memberships.first);
    notifyListeners();
    await push?.register();
  }

  Future<void> selectWorkspace(Membership m) async {
    membership = m;
    api.tenant = m.tenantSlug;
    await _storage.write(key: 'tenant', value: m.tenantSlug);
    notifyListeners();
  }

  /// Replaces the signed-in user after a profile change, keeping the current workspace.
  void updateUser(User updated) {
    user = updated;
    membership = updated.memberships.where((m) => m.tenantSlug == membership?.tenantSlug).firstOrNull ?? membership;
    notifyListeners();
  }

  Future<bool> canUseBiometrics() async => await _localAuth.canCheckBiometrics || await _localAuth.isDeviceSupported();

  Future<void> setBiometric(bool enabled) async {
    if (enabled && !await _authenticate('Confirm to turn on biometric unlock')) return;
    biometricEnabled = enabled;
    await _storage.write(key: 'biometric', value: enabled ? 'on' : 'off');
    notifyListeners();
  }

  Future<void> unlock() async {
    if (!await _authenticate('Unlock Manara')) return;
    locked = false;
    await _loadUser();
    notifyListeners();
  }

  Future<void> signOut() async {
    await push?.unregister();
    try {
      await api.logout();
    } catch (_) {}
    await _storage.delete(key: 'token');
    await _storage.delete(key: 'tenant');
    api.token = null;
    api.tenant = null;
    user = null;
    membership = null;
    locked = false;
    notifyListeners();
  }

  Future<bool> _authenticate(String reason) async {
    try {
      return await _localAuth.authenticate(localizedReason: reason);
    } catch (_) {
      return false;
    }
  }

  Future<void> _loadUser() async {
    try {
      user = await api.me();
      membership = user!.memberships.where((m) => m.tenantSlug == api.tenant).firstOrNull ?? user!.memberships.firstOrNull;
      api.tenant = membership?.tenantSlug;
      await push?.register();
    } on ApiException catch (e) {
      if (e.isUnauthorized) await signOut();
    } catch (_) {
      // Offline at launch: keep the token and let cached screens work.
    }
  }
}
