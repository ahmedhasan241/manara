/// Build-time configuration. Override with
/// `flutter run --dart-define=API_URL=https://api.manara.app`.
class AppConfig {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    // 10.0.2.2 is the host machine from the Android emulator.
    defaultValue: 'http://10.0.2.2:8001',
  );

  /// Reverb (WebSocket) settings; must match REVERB_* in api/.env.
  /// Without REVERB_KEY the app falls back to polling for new messages.
  static const reverbKey = String.fromEnvironment('REVERB_KEY');
  static const reverbHost = String.fromEnvironment('REVERB_HOST', defaultValue: '10.0.2.2');
  static const reverbPort = int.fromEnvironment('REVERB_PORT', defaultValue: 8080);
  static const reverbTls = bool.fromEnvironment('REVERB_TLS');
}
