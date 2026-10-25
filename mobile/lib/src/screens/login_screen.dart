import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../auth/session.dart';
import '../ui/logo.dart';
import '../ui/motion.dart';

/// Email + password, then a 6-digit code when the account uses two-factor auth.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.session});

  final Session session;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  String? _challenge;
  String? _error;
  bool _busy = false;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = widget.session.api;
      if (_challenge != null) {
        await widget.session.completeLogin(await api.verifyMfa(_challenge!, _code.text.trim()));
        return;
      }
      final result = await api.login(_email.text.trim(), _password.text);
      switch (result) {
        case MfaRequired(:final challenge):
          setState(() => _challenge = challenge);
        case LoginSuccess():
          await widget.session.completeLogin(result);
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = "Can't reach the server. Check your connection.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sizeDuration = Motion.reduced(context) ? Duration.zero : Motion.medium;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Reveal(child: Center(child: ManaraLogo(size: 84, vertical: true))),
                    const SizedBox(height: 12),
                    Reveal(
                      delay: Motion.stagger * 2,
                      child: Text(
                        'Guiding every learner',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ),
                    const SizedBox(height: 32),
                    AnimatedSize(
                      duration: sizeDuration,
                      curve: Motion.curve,
                      alignment: Alignment.topCenter,
                      child: FadeSwitcher(
                        state: _error ?? '',
                        alignment: AlignmentDirectional.topStart,
                        child: _error == null
                            ? const SizedBox(width: double.infinity)
                            : Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: Text(_error!, style: TextStyle(color: theme.colorScheme.error), semanticsLabel: 'Error: $_error'),
                              ),
                      ),
                    ),
                    Reveal(
                      delay: Motion.stagger * 4,
                      child: AnimatedSize(
                        duration: sizeDuration,
                        curve: Motion.curve,
                        alignment: Alignment.topCenter,
                        child: FadeSwitcher(
                          state: _challenge == null,
                          child: _challenge == null
                              ? Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    TextField(
                                      controller: _email,
                                      keyboardType: TextInputType.emailAddress,
                                      autofillHints: const [AutofillHints.email],
                                      decoration: const InputDecoration(labelText: 'Email'),
                                    ),
                                    const SizedBox(height: 16),
                                    TextField(
                                      controller: _password,
                                      obscureText: true,
                                      autofillHints: const [AutofillHints.password],
                                      decoration: const InputDecoration(labelText: 'Password'),
                                      onSubmitted: (_) => _submit(),
                                    ),
                                  ],
                                )
                              : Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    const Text('Enter the code from your authenticator app, or a recovery code.'),
                                    const SizedBox(height: 16),
                                    TextField(
                                      controller: _code,
                                      autofocus: true,
                                      keyboardType: TextInputType.number,
                                      autofillHints: const [AutofillHints.oneTimeCode],
                                      decoration: const InputDecoration(labelText: 'Verification code'),
                                      onSubmitted: (_) => _submit(),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Reveal(
                      delay: Motion.stagger * 6,
                      child: FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: FadeSwitcher(
                            state: _busy ? 'busy' : (_challenge == null ? 'sign-in' : 'verify'),
                            duration: Motion.fast,
                            alignment: Alignment.center,
                            child: Text(_busy ? 'Signing in…' : (_challenge == null ? 'Sign in' : 'Verify')),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
