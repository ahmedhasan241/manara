import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../auth/session.dart';
import '../ui/countries.dart';
import '../ui/motion.dart';
import '../ui/theme.dart';

/// Success or failure of a write, as a SnackBar on the app's messenger
/// (captured before the `await`, so it still works after the screen closes).
/// SnackBars are navy in both themes, so the icon colours are fixed.
void showResultSnackBar(ScaffoldMessengerState messenger, String message, {bool error = false}) {
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Row(
        children: [
          Icon(error ? Icons.error_outline : Icons.check_circle_outline, size: 20, color: error ? const Color(0xFFF2666A) : EduColors.gold),
          const SizedBox(width: 12),
          Expanded(child: Text(message)),
        ],
      ),
    ));
}

const _offline = "Can't reach the server. Check your connection.";

/// Name, phone and where the person lives (country, city, area); saves with `PATCH /me`.
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key, required this.session});

  final Session session;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.session.user?.name ?? '');
  late final _phone = TextEditingController(text: widget.session.user?.phone ?? '');
  late final _city = TextEditingController(text: widget.session.user?.city ?? '');
  late final _area = TextEditingController(text: widget.session.user?.area ?? '');
  late String? _country = widget.session.user?.country;
  Map<String, String> _errors = const {};
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _city.dispose();
    _area.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || !(_form.currentState?.validate() ?? false)) return;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      final result = await widget.session.api.updateProfile(
        name: _name.text,
        phone: _phone.text,
        country: _country ?? '',
        city: _city.text,
        area: _area.text,
      );
      widget.session.updateUser(result.user);
      showResultSnackBar(messenger, result.message);
      navigator.pop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _errors = e.fieldErrors);
      showResultSnackBar(messenger, e.message, error: true);
    } catch (_) {
      showResultSnackBar(messenger, _offline, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickCountry() async {
    final picked = await showCountryPicker(context, selected: _country);
    if (picked != null && mounted) setState(() => _country = picked.isEmpty ? null : picked);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final country = countryByCode(_country);

    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: staggered([
              TextFormField(
                controller: _name,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                autofillHints: const [AutofillHints.name],
                maxLength: 120,
                decoration: InputDecoration(labelText: 'Full name', errorText: _errors['name'], counterText: ''),
                validator: (v) => (v ?? '').trim().isEmpty ? 'Enter your name.' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.telephoneNumber],
                maxLength: 40,
                decoration: InputDecoration(
                  labelText: 'Phone (optional)',
                  prefixIcon: const Icon(Icons.phone_outlined),
                  errorText: _errors['phone'],
                  counterText: '',
                ),
              ),
              const SizedBox(height: 24),
              Text('Where you live', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: _busy ? null : _pickCountry,
                child: InputDecorator(
                  isEmpty: country == null,
                  decoration: InputDecoration(
                    labelText: 'Country',
                    prefixIcon: country == null
                        ? const Icon(Icons.public)
                        : Padding(
                            padding: const EdgeInsetsDirectional.only(start: 14, end: 8),
                            child: Text(country.flag, style: const TextStyle(fontSize: 22)),
                          ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 48, minHeight: 24),
                    suffixIcon: const Icon(Icons.arrow_drop_down),
                    errorText: _errors['country'],
                  ),
                  child: Text(country?.name ?? '', style: theme.textTheme.bodyLarge),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _city,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                autofillHints: const [AutofillHints.addressCity],
                maxLength: 120,
                decoration: InputDecoration(labelText: 'City', hintText: 'e.g. Cairo', errorText: _errors['city'], counterText: ''),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _area,
                textInputAction: TextInputAction.done,
                textCapitalization: TextCapitalization.words,
                maxLength: 120,
                decoration: InputDecoration(labelText: 'Area (optional)', hintText: 'e.g. Maadi', errorText: _errors['area'], counterText: ''),
                onFieldSubmitted: (_) => _save(),
              ),
              const SizedBox(height: 8),
              Text(
                'Your email (${widget.session.user?.email ?? ''}) can only be changed by your school.',
                style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: _BusyLabel(busy: _busy, idle: 'Save changes', working: 'Saving…'),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Current password, then the new one twice; saves with `PUT /me/password`.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key, required this.session});

  final Session session;

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  Map<String, String> _errors = const {};
  bool _busy = false;
  bool _show = false;

  @override
  void dispose() {
    _current.dispose();
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  String? _validateNew(String? value) {
    final v = value ?? '';
    if (v.length < 8) return 'Use at least 8 characters.';
    if (!RegExp(r'[A-Za-z]').hasMatch(v) || !RegExp(r'\d').hasMatch(v)) return 'Use letters and at least one number.';
    if (v == _current.text) return 'Choose a password different from your current one.';
    return null;
  }

  Future<void> _save() async {
    if (_busy || !(_form.currentState?.validate() ?? false)) return;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      final message = await widget.session.api.changePassword(
        current: _current.text,
        password: _password.text,
        confirmation: _confirmation.text,
      );
      showResultSnackBar(messenger, message);
      navigator.pop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _errors = e.fieldErrors);
      showResultSnackBar(messenger, e.message, error: true);
    } catch (_) {
      showResultSnackBar(messenger, _offline, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final toggle = IconButton(
      tooltip: _show ? 'Hide passwords' : 'Show passwords',
      icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined),
      onPressed: () => setState(() => _show = !_show),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: AutofillGroup(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: staggered([
                Text(
                  "You'll stay signed in here. Other phones and browsers will be signed out.",
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _current,
                  obscureText: !_show,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.password],
                  decoration: InputDecoration(labelText: 'Current password', errorText: _errors['current_password'], suffixIcon: toggle),
                  validator: (v) => (v ?? '').isEmpty ? 'Enter your current password.' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: !_show,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: InputDecoration(
                    labelText: 'New password',
                    helperText: 'At least 8 characters, with letters and a number.',
                    errorText: _errors['password'],
                  ),
                  validator: _validateNew,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmation,
                  obscureText: !_show,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: InputDecoration(labelText: 'Confirm new password', errorText: _errors['password_confirmation']),
                  validator: (v) => v != _password.text ? "The passwords don't match." : null,
                  onFieldSubmitted: (_) => _save(),
                ),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: _busy ? null : _save,
                  child: _BusyLabel(busy: _busy, idle: 'Change password', working: 'Changing…'),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class _BusyLabel extends StatelessWidget {
  const _BusyLabel({required this.busy, required this.idle, required this.working});

  final bool busy;
  final String idle;
  final String working;

  @override
  Widget build(BuildContext context) {
    return FadeSwitcher(
      state: busy,
      duration: Motion.fast,
      alignment: Alignment.center,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (busy) ...[
            const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)),
            const SizedBox(width: 10),
          ],
          Text(busy ? working : idle),
        ],
      ),
    );
  }
}

/// A searchable list of countries with flags. Returns the chosen ISO-2 code,
/// an empty string for "No country", or null when dismissed.
Future<String?> showCountryPicker(BuildContext context, {String? selected}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (context) => _CountryPicker(selected: selected),
  );
}

class _CountryPicker extends StatefulWidget {
  const _CountryPicker({this.selected});

  final String? selected;

  @override
  State<_CountryPicker> createState() => _CountryPickerState();
}

class _CountryPickerState extends State<_CountryPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final matches = countries.where((c) => c.matches(_query)).toList();
    final selected = widget.selected?.toUpperCase();

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, controller) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              autofocus: true,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(hintText: 'Search countries', prefixIcon: Icon(Icons.search)),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: matches.isEmpty
                ? Center(child: Text('No countries match "$_query".', style: TextStyle(color: scheme.onSurfaceVariant)))
                : ListView.builder(
                    controller: controller,
                    padding: EdgeInsets.only(bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
                    itemCount: matches.length + (_query.isEmpty && selected != null ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (_query.isEmpty && selected != null) {
                        if (i == 0) {
                          return ListTile(
                            leading: const Icon(Icons.clear),
                            title: const Text('No country'),
                            onTap: () => Navigator.pop(context, ''),
                          );
                        }
                        i -= 1;
                      }
                      final c = matches[i];
                      final isSelected = c.code == selected;
                      return ListTile(
                        leading: Text(c.flag, style: const TextStyle(fontSize: 24)),
                        title: Text(c.name),
                        subtitle: Text(c.nameAr, textDirection: TextDirection.rtl),
                        trailing: isSelected ? Icon(Icons.check, color: scheme.primary) : null,
                        selected: isSelected,
                        onTap: () => Navigator.pop(context, c.code),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
