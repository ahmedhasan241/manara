import 'dart:async';

import 'package:flutter/material.dart';

import '../api/models.dart';
import '../auth/session.dart';
import '../messaging/messaging_service.dart';
import '../push/push_service.dart';
import '../sync/offline_queue.dart';
import '../ui/logo.dart';
import '../ui/motion.dart';
import '../ui/theme.dart';
import 'course_screen.dart';
import 'live_lessons.dart';
import 'messages_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.session, required this.queue, required this.push, required this.messaging});

  final Session session;
  final OfflineQueue queue;
  final PushService push;
  final MessagingService messaging;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const _messagesTab = 1;
  int _tab = 0;
  StreamSubscription<String>? _opened;

  @override
  void initState() {
    super.initState();
    // Tapping a message notification opens that conversation.
    _opened = widget.push.openedConversations.listen(_openConversation);
    final launch = widget.push.takeLaunchConversation();
    if (launch != null) WidgetsBinding.instance.addPostFrameCallback((_) => _openConversation(launch));

    // Lesson alerts land on the Courses tab, where live lessons sit at the top with a Join button.
    _openedLessons = widget.push.openedLessons.listen((_) => setState(() => _tab = 0));
    if (widget.push.takeLaunchLesson() != null) _tab = 0;
  }

  StreamSubscription<String>? _openedLessons;

  @override
  void dispose() {
    _opened?.cancel();
    _openedLessons?.cancel();
    super.dispose();
  }

  Future<void> _openConversation(String conversationId) async {
    setState(() => _tab = _messagesTab);
    final messaging = widget.messaging;
    // Wait until the key is unlocked; the Messages tab shows the unlock form meanwhile.
    if (messaging.keyState != KeyState.ready) return;
    await openChat(context, messaging, conversationId, widget.session.user!.id);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _CoursesTab(session: widget.session, queue: widget.queue),
      MessagesTab(
        messaging: widget.messaging,
        myId: widget.session.user!.id,
        canCreateGroups: widget.session.membership?.isStaff ?? false,
      ),
      _NotificationsTab(session: widget.session),
      SettingsScreen(session: widget.session),
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            const ManaraMark(size: 30),
            const SizedBox(width: 12),
            Expanded(child: Text(widget.session.membership?.tenantName ?? 'Manara', maxLines: 1, overflow: TextOverflow.ellipsis)),
          ],
        ),
        bottom: PreferredSize(preferredSize: const Size.fromHeight(0), child: _SyncBanner(queue: widget.queue)),
      ),
      body: FadeSwitcher(state: _tab, duration: const Duration(milliseconds: 220), child: pages[_tab]),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
        child: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book), label: 'Courses'),
            NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Messages'),
            NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
            NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
          ],
        ),
      ),
    );
  }
}

class _SyncBanner extends StatelessWidget {
  const _SyncBanner({required this.queue});

  final OfflineQueue queue;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: queue,
      builder: (context, _) {
        if (queue.isOnline && queue.pendingCount == 0) return const SizedBox.shrink();
        final scheme = Theme.of(context).colorScheme;
        return Semantics(
          liveRegion: true,
          child: Container(
            width: double.infinity,
            color: queue.isOnline ? scheme.primaryContainer : scheme.tertiaryContainer,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Text(
              queue.isOnline
                  ? (queue.isSyncing ? 'Syncing ${queue.pendingCount} change(s)…' : '${queue.pendingCount} change(s) waiting to sync')
                  : "You're offline. Changes are saved on this phone and will sync later.",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        );
      },
    );
  }
}

class _CoursesTab extends StatefulWidget {
  const _CoursesTab({required this.session, required this.queue});

  final Session session;
  final OfflineQueue queue;

  @override
  State<_CoursesTab> createState() => _CoursesTabState();
}

class _CoursesTabState extends State<_CoursesTab> {
  late Future<List<Course>> _courses = widget.session.api.courses();

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        setState(() => _courses = widget.session.api.courses());
        await _courses;
      },
      child: FutureBuilder<List<Course>>(
        future: _courses,
        builder: (context, snapshot) => FadeSwitcher(
          state: snapshot.connectionState != ConnectionState.done ? 'loading' : (snapshot.hasError ? 'error' : 'done'),
          child: _content(context, snapshot),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, AsyncSnapshot<List<Course>> snapshot) {
    if (snapshot.connectionState != ConnectionState.done) {
      return const SkeletonList();
    }
    if (snapshot.hasError) {
      return ListView(children: const [Padding(padding: EdgeInsets.all(24), child: Text("Couldn't load courses. Pull to retry."))]);
    }
    final courses = snapshot.data!;
    if (courses.isEmpty) {
      return ListView(children: const [Padding(padding: EdgeInsets.all(24), child: Text('No courses yet.'))]);
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      // First rows: a greeting, then live and upcoming lessons across all courses.
      itemCount: courses.length + 2,
      separatorBuilder: (_, i) => SizedBox(height: i == 0 ? 20 : 8),
      itemBuilder: (context, i) {
        if (i == 0) return Reveal(child: _HomeHero(session: widget.session, courseCount: courses.length));
        if (i == 1) return UpcomingLessons(api: widget.session.api);
        final c = courses[i - 2];
        return StaggeredItem(
          index: i,
          child: _CourseCard(
            course: c,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => CourseScreen(course: c, session: widget.session, queue: widget.queue),
            )),
          ),
        );
      },
    );
  }
}

/// Navy welcome banner at the top of the Courses tab, lit by the lighthouse mark.
class _HomeHero extends StatelessWidget {
  const _HomeHero({required this.session, required this.courseCount});

  final Session session;
  final int courseCount;

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final background = dark ? EduColors.navyLight : EduColors.navy;
    final name = (session.user?.name ?? '').trim().split(RegExp(r'\s+')).first;
    final role = session.membership?.role ?? '';

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: dark ? Border.all(color: EduColors.gold.withValues(alpha: 0.18)) : null,
        // Navy, with a gold glow where the light comes from (the gradient carries the base colour).
        gradient: RadialGradient(
          center: AlignmentDirectional.topEnd,
          radius: 1.2,
          colors: [Color.alphaBlend(EduColors.gold.withValues(alpha: 0.22), background), background],
          stops: const [0, 0.6],
        ),
      ),
      child: Stack(
        children: [
          // The lighthouse, faint, in the corner the light comes from.
          const PositionedDirectional(
            end: -14,
            top: -12,
            child: Opacity(opacity: 0.16, child: ManaraMark(size: 128)),
          ),
          PositionedDirectional(
            end: 72,
            bottom: -40,
            child: Container(
              width: 92,
              height: 92,
              decoration: BoxDecoration(shape: BoxShape.circle, color: EduColors.gold.withValues(alpha: 0.07)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$_greeting,', style: theme.textTheme.bodyMedium?.copyWith(color: EduColors.gold)),
                if (name.isNotEmpty)
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.headlineSmall?.copyWith(color: Colors.white),
                  ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (role.isNotEmpty) _HeroChip(icon: Icons.badge_outlined, label: role[0].toUpperCase() + role.substring(1)),
                    _HeroChip(icon: Icons.menu_book_outlined, label: courseCount == 1 ? '1 course' : '$courseCount courses'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        border: Border.all(color: EduColors.gold.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: EduColors.gold),
          const SizedBox(width: 6),
          Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: Colors.white)),
        ],
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course, required this.onTap});

  final Course course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final source = course.code.isNotEmpty ? course.code : course.title;
    final badge = (source.length > 3 ? source.substring(0, 3) : source).toUpperCase();
    return Pressable(
      child: Card(
        child: ListTile(
          contentPadding: const EdgeInsetsDirectional.fromSTEB(14, 6, 10, 6),
          leading: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: scheme.primaryContainer, borderRadius: BorderRadius.circular(12)),
            child: Text(
              badge,
              style: TextStyle(color: scheme.onPrimaryContainer, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.3),
            ),
          ),
          title: Text(course.title),
          subtitle: Text([course.code, course.teacherName].whereType<String>().join(' · ')),
          trailing: Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
          onTap: onTap,
        ),
      ),
    );
  }
}

class _NotificationsTab extends StatelessWidget {
  const _NotificationsTab({required this.session});

  final Session session;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: session.api.notifications(),
      builder: (context, snapshot) => FadeSwitcher(
        state: snapshot.hasData ? 'data' : (snapshot.hasError ? 'error' : 'loading'),
        child: _content(context, snapshot),
      ),
    );
  }

  Widget _content(BuildContext context, AsyncSnapshot<List<Map<String, dynamic>>> snapshot) {
    if (!snapshot.hasData) {
      return snapshot.hasError ? const Center(child: Text("Couldn't load notifications.")) : const SkeletonList(leading: false);
    }
    final items = snapshot.data!;
    if (items.isEmpty) return const Center(child: Text("You're all caught up."));
    final scheme = Theme.of(context).colorScheme;
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: items.length,
      itemBuilder: (context, i) {
        final data = items[i]['data'] as Map<String, dynamic>;
        final unread = items[i]['read_at'] == null;
        return StaggeredItem(
          index: i,
          child: ListTile(
            leading: Icon(unread ? Icons.circle : Icons.circle_outlined, size: 12, color: unread ? scheme.primary : null),
            title: Text(data['title'] as String, style: TextStyle(fontWeight: unread ? FontWeight.w600 : null)),
            subtitle: Text(data['body'] as String? ?? ''),
          ),
        );
      },
    );
  }
}
