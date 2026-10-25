import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../ui/motion.dart';
import '../ui/theme.dart';

const _live = EduColors.live;

/// Opens a lesson's meeting (Zoom app or browser) after recording the join.
Future<void> joinLesson(BuildContext context, ApiClient api, LiveLesson lesson) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    final url = await api.joinLesson(lesson.id);
    // Zoom links open the Zoom app when it's installed.
    if (!await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
      messenger.showSnackBar(const SnackBar(content: Text("Couldn't open the meeting.")));
    }
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  }
}

Future<void> playRecording(BuildContext context, ApiClient api, Recording recording) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    final url = await api.playRecording(recording.id);
    await launchUrl(Uri.parse(url), mode: recording.isLink ? LaunchMode.externalApplication : LaunchMode.inAppBrowserView);
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
  }
}

String _countdown(DateTime at) {
  final minutes = at.difference(DateTime.now()).inMinutes;
  if (minutes <= 0) return 'now';
  if (minutes < 60) return 'in $minutes min';
  if (minutes < 1440) return 'in ${minutes ~/ 60} h ${minutes % 60} min';
  return 'in ${(minutes / 1440).round()} days';
}

/// A lesson row with a date tile, status and a Join button when it's open.
class LessonTile extends StatelessWidget {
  const LessonTile({super.key, required this.lesson, required this.api, this.showCourse = true});

  final LiveLesson lesson;
  final ApiClient api;
  final bool showCourse;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final local = lesson.scheduledAt.toLocal();
    final tileColor = lesson.isLive ? _live : (lesson.isUpcoming ? EduColors.goldDeep : scheme.outline); // White text: deep gold in both themes.

    return Card(
      color: lesson.isLive ? Color.alphaBlend(_live.withValues(alpha: 0.05), scheme.surface) : null,
      shape: lesson.isLive
          ? RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: _live, width: 1.5))
          : null,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            AnimatedContainer(
              duration: Motion.reduced(context) ? Duration.zero : Motion.medium,
              curve: Motion.curve,
              width: 52,
              height: 56,
              decoration: BoxDecoration(color: tileColor, borderRadius: BorderRadius.circular(14)),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(DateFormat.MMM().format(local).toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                  Text('${local.day}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (lesson.isLive)
                    const _LiveChip()
                  else if (showCourse && lesson.courseTitle != null)
                    Text(lesson.courseTitle!, style: TextStyle(color: scheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
                  Text(lesson.title, style: Theme.of(context).textTheme.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                  Text(
                    lesson.isUpcoming
                        ? '${DateFormat.jm().format(local)} · ${_countdown(lesson.scheduledAt)}'
                        : lesson.isLive
                            ? 'Happening now'
                            : '${DateFormat.jm().format(local)} · ${lesson.status}${lesson.recordingsCount > 0 ? ' · ${lesson.recordingsCount} recording(s)' : ''}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            if (lesson.joinable)
              FilledButton(
                style: lesson.isLive ? FilledButton.styleFrom(backgroundColor: _live) : null,
                onPressed: () => joinLesson(context, api, lesson),
                child: Text(lesson.isLive ? 'Join' : 'Wait in'),
              ),
          ],
        ),
      ),
    );
  }
}

class _LiveChip extends StatelessWidget {
  const _LiveChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      padding: const EdgeInsetsDirectional.fromSTEB(4, 1, 8, 1),
      decoration: BoxDecoration(color: _live, borderRadius: BorderRadius.circular(20)),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          PulsingDot(color: Colors.white, size: 6),
          SizedBox(width: 2),
          Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

/// Live and upcoming lessons across all courses, refreshed every 30 seconds so
/// the Join button appears on time.
class UpcomingLessons extends StatefulWidget {
  const UpcomingLessons({super.key, required this.api});

  final ApiClient api;

  @override
  State<UpcomingLessons> createState() => _UpcomingLessonsState();
}

class _UpcomingLessonsState extends State<UpcomingLessons> {
  List<LiveLesson> _lessons = [];
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final lessons = await widget.api.upcomingLessons();
      if (mounted) setState(() => _lessons = lessons.take(3).toList());
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    // Grows smoothly into place when lessons arrive instead of pushing the list down.
    return AnimatedSize(
      duration: Motion.reduced(context) ? Duration.zero : Motion.medium,
      curve: Motion.curve,
      alignment: Alignment.topCenter,
      child: FadeSwitcher(
        state: _lessons.isEmpty,
        child: _lessons.isEmpty
            ? const SizedBox(width: double.infinity)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
                    child: Text('Live lessons', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  ),
                  ...staggered([for (final lesson in _lessons) LessonTile(lesson: lesson, api: widget.api)], startIndex: 1),
                  const SizedBox(height: 16),
                ],
              ),
      ),
    );
  }
}

/// Course tab: the course's lessons, then its recordings.
class CourseLessonsTab extends StatelessWidget {
  const CourseLessonsTab({super.key, required this.api, required this.courseId});

  final ApiClient api;
  final String courseId;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: Future.wait([api.courseLessons(courseId), api.recordings(courseId)]),
      builder: (context, snapshot) {
        final Widget content;
        if (!snapshot.hasData) {
          content = snapshot.hasError ? const Center(child: Text("Couldn't load lessons.")) : const SkeletonList(itemCount: 4);
        } else {
          final lessons = snapshot.data![0] as List<LiveLesson>;
          final recordings = snapshot.data![1] as List<Recording>;
          final theme = Theme.of(context);

          content = ListView(
            padding: const EdgeInsets.all(16),
            children: staggered([
              if (lessons.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('No live lessons yet.')),
              for (final lesson in lessons) LessonTile(lesson: lesson, api: api, showCourse: false),
              const SizedBox(height: 24),
              Text('Recordings', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (recordings.isEmpty) const Text('Recorded lessons appear here after they end.'),
              for (final recording in recordings)
                Pressable(
                  child: Card(
                    child: ListTile(
                      leading: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, borderRadius: BorderRadius.circular(12)),
                        child: Icon(recording.isLink ? Icons.link : Icons.play_arrow_rounded, color: theme.colorScheme.onPrimaryContainer),
                      ),
                      title: Text(recording.title),
                      subtitle: Text([
                        DateFormat.yMMMd().format(recording.createdAt.toLocal()),
                        if (recording.durationSeconds != null) '${(recording.durationSeconds! / 60).round()} min',
                        '${recording.viewCount} views',
                      ].join(' · ')),
                      onTap: () => playRecording(context, api, recording),
                    ),
                  ),
                ),
            ]),
          );
        }
        return FadeSwitcher(state: snapshot.hasData ? 'data' : (snapshot.hasError ? 'error' : 'loading'), child: content);
      },
    );
  }
}
