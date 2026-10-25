import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'src/api/api_client.dart';
import 'src/auth/session.dart';
import 'src/messaging/messaging_service.dart';
import 'src/push/push_service.dart';
import 'src/screens/home_screen.dart';
import 'src/screens/lock_screen.dart';
import 'src/screens/login_screen.dart';
import 'src/sync/offline_queue.dart';
import 'src/ui/logo.dart';
import 'src/ui/motion.dart';
import 'src/ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  final push = PushService(api);
  await push.init();
  final session = Session(api, push: push);
  final queue = OfflineQueue(api);
  final messaging = MessagingService(api);

  // Messaging follows the signed-in user.
  session.addListener(() {
    final user = session.user;
    if (user != null && !session.locked && session.membership != null) {
      messaging.start(user.id);
    } else if (user == null) {
      messaging.stop();
    }
  });

  await session.restore();
  await queue.start();
  runApp(ManaraApp(session: session, queue: queue, push: push, messaging: messaging));
}

class ManaraApp extends StatelessWidget {
  const ManaraApp({super.key, required this.session, required this.queue, required this.push, required this.messaging});

  final Session session;
  final OfflineQueue queue;
  final PushService push;
  final MessagingService messaging;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) => MaterialApp(
        title: 'Manara',
        scaffoldMessengerKey: push.messengerKey,
        debugShowCheckedModeBanner: false,
        scrollBehavior: const EduScrollBehavior(),
        theme: buildTheme(Brightness.light),
        darkTheme: buildTheme(Brightness.dark),
        themeMode: ThemeMode.system,
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('en'), Locale('ar')],
        home: !session.ready
            ? const Scaffold(body: Center(child: ManaraLoader()))
            : session.locked
                ? LockScreen(session: session)
                : session.signedIn
                    ? HomeScreen(session: session, queue: queue, push: push, messaging: messaging)
                    : LoginScreen(session: session),
      ),
    );
  }
}
