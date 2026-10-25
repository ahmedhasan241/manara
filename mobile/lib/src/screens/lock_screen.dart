import 'package:flutter/material.dart';

import '../auth/session.dart';
import '../ui/logo.dart';
import '../ui/motion.dart';

class LockScreen extends StatefulWidget {
  const LockScreen({super.key, required this.session});

  final Session session;

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => widget.session.unlock());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Reveal(child: ManaraLogo(size: 72, vertical: true)),
              const SizedBox(height: 28),
              Reveal(
                delay: Motion.stagger,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, shape: BoxShape.circle),
                  child: Icon(Icons.fingerprint, size: 44, color: theme.colorScheme.primary),
                ),
              ),
              const SizedBox(height: 16),
              Reveal(
                delay: Motion.stagger * 2,
                child: Text('Manara is locked', style: theme.textTheme.titleMedium),
              ),
              const SizedBox(height: 24),
              Reveal(
                delay: Motion.stagger * 4,
                child: FilledButton.icon(
                  onPressed: widget.session.unlock,
                  icon: const Icon(Icons.lock_open),
                  label: const Text('Unlock'),
                ),
              ),
              Reveal(
                delay: Motion.stagger * 5,
                child: TextButton(onPressed: widget.session.signOut, child: const Text('Sign in with password instead')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
