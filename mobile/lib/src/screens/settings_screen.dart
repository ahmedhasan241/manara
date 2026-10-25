import 'package:flutter/material.dart';

import '../auth/session.dart';
import '../ui/countries.dart';
import '../ui/motion.dart';
import '../ui/theme.dart';
import 'profile_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key, required this.session});

  final Session session;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: session,
      builder: (context, _) {
        final user = session.user;
        if (user == null) return const SizedBox.shrink();
        final theme = Theme.of(context);
        final scheme = theme.colorScheme;
        final initials = user.name.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty).take(2).map((part) => part[0].toUpperCase()).join();

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: staggered([
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: EduColors.navy,
                      foregroundColor: EduColors.gold,
                      child: initials.isEmpty
                          ? const Icon(Icons.person)
                          : Text(initials, style: theme.textTheme.titleMedium?.copyWith(color: EduColors.gold)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.name, style: theme.textTheme.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                          Text(
                            user.email,
                            style: theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (_location(user.country, user.city, user.area) case final place?)
                            Text(
                              place,
                              style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: const Text('Edit profile'),
                    subtitle: const Text('Name, phone and where you live'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => EditProfileScreen(session: session))),
                  ),
                  ListTile(
                    leading: const Icon(Icons.lock_outline),
                    title: const Text('Change password'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ChangePasswordScreen(session: session))),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  if (user.memberships.length > 1)
                    ListTile(
                      leading: const Icon(Icons.apartment),
                      title: const Text('Workspace'),
                      trailing: DropdownButton<String>(
                        value: session.membership?.tenantSlug,
                        underline: const SizedBox.shrink(),
                        borderRadius: BorderRadius.circular(12),
                        onChanged: (slug) => session.selectWorkspace(user.memberships.firstWhere((m) => m.tenantSlug == slug)),
                        items: [for (final m in user.memberships) DropdownMenuItem(value: m.tenantSlug, child: Text(m.tenantName))],
                      ),
                    ),
                  FutureBuilder<bool>(
                    future: session.canUseBiometrics(),
                    builder: (context, snapshot) => SwitchListTile(
                      secondary: const Icon(Icons.fingerprint),
                      title: const Text('Unlock with fingerprint or Face ID'),
                      value: session.biometricEnabled,
                      onChanged: snapshot.data == true ? session.setBiometric : null,
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.verified_user_outlined),
                    title: const Text('Two-factor authentication'),
                    subtitle: Text(user.mfaEnabled ? 'On' : 'Off — turn it on in the web portal settings'),
                    trailing: Icon(
                      user.mfaEnabled ? Icons.check_circle : Icons.info_outline,
                      size: 20,
                      color: user.mfaEnabled ? scheme.primary : scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Pressable(
              child: Card(
                child: ListTile(
                  leading: Icon(Icons.logout, color: scheme.error),
                  title: Text('Sign out', style: TextStyle(color: scheme.error, fontWeight: FontWeight.w600)),
                  onTap: session.signOut,
                ),
              ),
            ),
          ]),
        );
      },
    );
  }
}

/// "🇪🇬 Maadi, Cairo, Egypt", or null when nothing is set.
String? _location(String? country, String? city, String? area) {
  final c = countryByCode(country);
  final parts = [area, city, c?.name].whereType<String>().where((p) => p.trim().isNotEmpty).toList();
  if (parts.isEmpty) return null;
  return [if (c != null) c.flag, parts.join(', ')].join(' ');
}
