import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../messaging/messaging_service.dart';
import '../ui/logo.dart';
import '../ui/motion.dart';
import '../ui/theme.dart';

/// Messages tab: key setup or unlock first, then the conversation list.
class MessagesTab extends StatelessWidget {
  const MessagesTab({super.key, required this.messaging, required this.myId, required this.canCreateGroups});

  final MessagingService messaging;
  final int myId;
  final bool canCreateGroups;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: messaging,
      builder: (context, _) => FadeSwitcher(
        // Setup and unlock share one key so the passphrase form keeps its state, as before.
        state: switch (messaging.keyState) {
          KeyState.needsSetup || KeyState.needsUnlock => 'passphrase',
          final other => other.name,
        },
        child: switch (messaging.keyState) {
          KeyState.loading => const SkeletonList(),
          KeyState.unavailable => const Center(
              child: Padding(padding: EdgeInsets.all(24), child: Text('Secure messaging is not available on this device.')),
            ),
          KeyState.needsSetup => _PassphraseView(messaging: messaging, creating: true),
          KeyState.needsUnlock => _PassphraseView(messaging: messaging, creating: false),
          KeyState.ready => _ConversationList(messaging: messaging, myId: myId, canCreateGroups: canCreateGroups),
        },
      ),
    );
  }
}

class _PassphraseView extends StatefulWidget {
  const _PassphraseView({required this.messaging, required this.creating});

  final MessagingService messaging;
  final bool creating;

  @override
  State<_PassphraseView> createState() => _PassphraseViewState();
}

class _PassphraseViewState extends State<_PassphraseView> {
  final _passphrase = TextEditingController();
  final _confirm = TextEditingController();
  bool _reset = false;
  bool _busy = false;
  String? _error;

  bool get _creating => widget.creating || _reset;

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _busy = true;
    });
    // Let the progress indicator paint before the key derivation blocks briefly.
    await Future<void>.delayed(const Duration(milliseconds: 50));
    try {
      if (_creating) {
        if (_passphrase.text.length < 10) throw const FormatException('Use at least 10 characters.');
        if (_passphrase.text != _confirm.text) throw const FormatException("The passphrases don't match.");
        await widget.messaging.createKey(_passphrase.text, reset: _reset);
      } else {
        try {
          await widget.messaging.unlock(_passphrase.text);
        } on ApiException {
          rethrow;
        } catch (_) {
          throw const FormatException('That passphrase is not correct.');
        }
      }
    } on FormatException catch (e) {
      setState(() => _error = e.message);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Reveal(
          child: Center(
            child: Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, shape: BoxShape.circle),
              child: Icon(Icons.lock_outline, size: 40, color: theme.colorScheme.primary),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Reveal(
          delay: Motion.stagger * 2,
          child: Text(_creating ? 'Set up secure messaging' : 'Unlock your messages', style: theme.textTheme.titleLarge, textAlign: TextAlign.center),
        ),
        const SizedBox(height: 8),
        Reveal(
          delay: Motion.stagger * 3,
          child: Text(
            _creating
                ? "Choose a messaging passphrase. It encrypts your private key before it's backed up, so you can read your history on any device. It can't be recovered if you forget it."
                : 'Enter your messaging passphrase to restore your encrypted history on this phone.',
            textAlign: TextAlign.center,
            style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
        if (_reset) ...[
          const SizedBox(height: 12),
          Text(
            'Resetting creates a new key. Messages sent to your old key can no longer be read.',
            style: TextStyle(color: theme.colorScheme.error),
            textAlign: TextAlign.center,
          ),
        ],
        const SizedBox(height: 24),
        if (_error != null) ...[
          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
          const SizedBox(height: 12),
        ],
        TextField(
          controller: _passphrase,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Messaging passphrase'),
          onSubmitted: _creating ? null : (_) => _submit(),
        ),
        if (_creating) ...[
          const SizedBox(height: 16),
          TextField(
            controller: _confirm,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Repeat passphrase'),
            onSubmitted: (_) => _submit(),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: _busy
                ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(_creating ? 'Create my key' : 'Unlock'),
          ),
        ),
        if (!widget.creating && !_reset)
          TextButton(onPressed: () => setState(() => _reset = true), child: const Text('I forgot my passphrase')),
      ],
    );
  }
}

class _ConversationList extends StatelessWidget {
  const _ConversationList({required this.messaging, required this.myId, required this.canCreateGroups});

  final MessagingService messaging;
  final int myId;
  final bool canCreateGroups;

  Future<void> _newConversation(BuildContext context) async {
    final conversation = await Navigator.of(context).push<Conversation>(
      MaterialPageRoute(builder: (_) => NewConversationScreen(messaging: messaging, canCreateGroups: canCreateGroups)),
    );
    if (conversation != null && context.mounted) {
      await openChat(context, messaging, conversation.id, myId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final conversations = messaging.conversations;
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _newConversation(context),
        icon: const Icon(Icons.edit_outlined),
        label: const Text('New message'),
      ),
      body: RefreshIndicator(
        onRefresh: messaging.refreshConversations,
        child: conversations.isEmpty
            ? ListView(children: const [
                Padding(padding: EdgeInsets.all(32), child: Text('No conversations yet.', textAlign: TextAlign.center)),
              ])
            : ListView.separated(
                padding: const EdgeInsets.only(bottom: 88),
                itemCount: conversations.length,
                separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
                itemBuilder: (context, i) {
                  final c = conversations[i];
                  final scheme = Theme.of(context).colorScheme;
                  return StaggeredItem(
                    index: i,
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      leading: CircleAvatar(
                        radius: 22,
                        backgroundColor: c.unread > 0 ? scheme.primary : scheme.primaryContainer,
                        foregroundColor: c.unread > 0 ? scheme.onPrimary : scheme.onPrimaryContainer,
                        child: Icon(c.isGroup ? Icons.group_outlined : Icons.person_outline),
                      ),
                      title: Text(
                        c.nameFor(myId),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: c.unread > 0 ? const TextStyle(fontWeight: FontWeight.w700) : null,
                      ),
                      subtitle: Text(c.lastMessageAt == null ? 'No messages yet' : DateFormat.MMMd().add_jm().format(c.lastMessageAt!.toLocal())),
                      trailing: c.unread > 0 ? Badge.count(count: c.unread) : (c.alertsOn ? null : const Icon(Icons.notifications_off_outlined, size: 18)),
                      onTap: () => openChat(context, messaging, c.id, myId),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

/// Opens a conversation by id (also used when a push notification is tapped).
Future<void> openChat(BuildContext context, MessagingService messaging, String conversationId, int myId) async {
  if (messaging.conversations.every((c) => c.id != conversationId)) await messaging.refreshConversations();
  if (!context.mounted) return;
  await Navigator.of(context).push(
    MaterialPageRoute(builder: (_) => ChatScreen(messaging: messaging, conversationId: conversationId, myId: myId)),
  );
  messaging.closeThread();
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.messaging, required this.conversationId, required this.myId});

  final MessagingService messaging;
  final String conversationId;
  final int myId;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _text = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    widget.messaging.openThread(widget.conversationId);
  }

  Conversation? get _conversation => widget.messaging.conversations.where((c) => c.id == widget.conversationId).firstOrNull;

  Future<void> _send(Conversation conversation) async {
    final text = _text.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.messaging.send(conversation, text);
      _text.clear();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = "Couldn't send. Check your connection and try again.");
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.messaging,
      builder: (context, _) {
        final conversation = _conversation;
        if (conversation == null) return const Scaffold(body: Center(child: ManaraLoader()));
        final entries = widget.messaging.threads[conversation.id] ?? const [];
        final names = {for (final p in conversation.participants) p.id: p.name};
        final withoutKeys = conversation.participants.where((p) => p.publicKey == null && p.id != widget.myId).map((p) => p.name).toList();
        final scheme = Theme.of(context).colorScheme;

        return Scaffold(
          appBar: AppBar(
            title: Text(conversation.nameFor(widget.myId)),
            actions: [
              IconButton(
                tooltip: conversation.alertsOn ? 'Mute alerts' : 'Turn alerts on',
                icon: Icon(conversation.alertsOn ? Icons.notifications_active_outlined : Icons.notifications_off_outlined),
                onPressed: () => widget.messaging.setAlerts(conversation, !conversation.alertsOn),
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: entries.isEmpty
                      ? const Center(child: Text('Say hello. Messages are end-to-end encrypted.'))
                      : NotificationListener<ScrollEndNotification>(
                          onNotification: (n) {
                            if (n.metrics.extentAfter == 0) widget.messaging.loadOlder(conversation.id);
                            return false;
                          },
                          child: ListView.builder(
                            reverse: true,
                            padding: const EdgeInsets.all(12),
                            itemCount: entries.length,
                            itemBuilder: (context, i) {
                              final entry = entries[entries.length - 1 - i];
                              final mine = entry.message.senderId == widget.myId;
                              return Align(
                                alignment: mine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 3),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
                                  decoration: BoxDecoration(
                                    color: mine ? scheme.primary : scheme.surfaceContainerHighest,
                                    // A tighter corner on the sender's side gives the bubble a "tail".
                                    borderRadius: BorderRadiusDirectional.only(
                                      topStart: const Radius.circular(18),
                                      topEnd: const Radius.circular(18),
                                      bottomStart: Radius.circular(mine ? 18 : 6),
                                      bottomEnd: Radius.circular(mine ? 6 : 18),
                                    ),
                                  ),
                                  child: DefaultTextStyle.merge(
                                    style: TextStyle(color: mine ? scheme.onPrimary : scheme.onSurface),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        if (!mine && conversation.isGroup)
                                          Text(names[entry.message.senderId] ?? 'Former member', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                        entry.text == null
                                            ? const Text("Can't be decrypted on this key", style: TextStyle(fontStyle: FontStyle.italic))
                                            : Text(entry.text!),
                                        if (entry.message.createdAt != null)
                                          Text(DateFormat.jm().format(entry.message.createdAt!.toLocal()), style: const TextStyle(fontSize: 10)),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                ),
                if (withoutKeys.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text("${withoutKeys.join(', ')} hasn't set up secure messaging yet and won't be able to read new messages.",
                        style: TextStyle(color: scheme.error, fontSize: 12)),
                  ),
                if (_error != null)
                  Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text(_error!, style: TextStyle(color: scheme.error))),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: scheme.surface,
                    border: Border(top: BorderSide(color: scheme.outlineVariant)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _text,
                            minLines: 1,
                            maxLines: 5,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(
                              hintText: 'Write a message',
                              isDense: true,
                              fillColor: scheme.surfaceContainer,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(22),
                                borderSide: BorderSide(color: scheme.primary, width: 1.4),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        AnimatedScale(
                          scale: _sending ? 0.9 : 1,
                          duration: Motion.reduced(context) ? Duration.zero : Motion.fast,
                          curve: Curves.easeOut,
                          child: IconButton.filled(
                            tooltip: 'Send',
                            onPressed: _sending ? null : () => _send(conversation),
                            icon: const Icon(Icons.send),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class NewConversationScreen extends StatefulWidget {
  const NewConversationScreen({super.key, required this.messaging, required this.canCreateGroups});

  final MessagingService messaging;
  final bool canCreateGroups;

  @override
  State<NewConversationScreen> createState() => _NewConversationScreenState();
}

class _NewConversationScreenState extends State<NewConversationScreen> {
  late final Future<List<Contact>> _contacts = widget.messaging.contacts();
  final _selected = <int>{};
  final _title = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _start() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final conversation = await widget.messaging.startConversation(_selected.toList(), title: _title.text.trim().isEmpty ? null : _title.text.trim());
      if (mounted) Navigator.of(context).pop(conversation);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New message'),
        actions: [TextButton(style: onNavyTextButtonStyle, onPressed: _selected.isEmpty || _busy ? null : _start, child: const Text('Start'))],
      ),
      body: FutureBuilder<List<Contact>>(
        future: _contacts,
        builder: (context, snapshot) => FadeSwitcher(
          state: snapshot.hasData ? 'data' : (snapshot.hasError ? 'error' : 'loading'),
          child: !snapshot.hasData
              ? (snapshot.hasError ? const Center(child: Text("Couldn't load people.")) : const SkeletonList(padding: EdgeInsets.all(12)))
              : Column(
                  children: [
                    if (_error != null) Padding(padding: const EdgeInsets.all(12), child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
                    if (_selected.length > 1)
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: TextField(controller: _title, decoration: const InputDecoration(labelText: 'Group name')),
                      ),
                    Expanded(
                      child: ListView(
                        children: [
                          for (final (i, c) in snapshot.data!.indexed)
                            StaggeredItem(
                              index: i,
                              child: CheckboxListTile(
                                value: _selected.contains(c.id),
                                title: Text(c.name),
                                subtitle: Text(c.hasKey ? c.role : '${c.role} · no key yet'),
                                onChanged: (checked) => setState(() {
                                  if (!widget.canCreateGroups) _selected.clear();
                                  checked == true ? _selected.add(c.id) : _selected.remove(c.id);
                                }),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
