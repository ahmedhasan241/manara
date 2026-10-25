import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api/models.dart';
import '../auth/session.dart';
import '../sync/offline_queue.dart';
import '../ui/motion.dart';
import 'live_lessons.dart';

class CourseScreen extends StatelessWidget {
  const CourseScreen({super.key, required this.course, required this.session, required this.queue});

  final Course course;
  final Session session;
  final OfflineQueue queue;

  @override
  Widget build(BuildContext context) {
    final canTakeAttendance = session.membership?.permissions.contains('attendance.write') ?? false;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(course.title),
          bottom: const TabBar(tabs: [Tab(text: 'Live & recordings'), Tab(text: 'Grades'), Tab(text: 'Attendance')]),
        ),
        body: TabBarView(
          children: [
            CourseLessonsTab(api: session.api, courseId: course.id),
            _GradesTab(course: course, session: session),
            canTakeAttendance
                ? _RollCallTab(course: course, session: session, queue: queue)
                : const Center(child: Text('Your attendance record is on the web portal.')),
          ],
        ),
      ),
    );
  }
}

class _GradesTab extends StatelessWidget {
  const _GradesTab({required this.course, required this.session});

  final Course course;
  final Session session;

  @override
  Widget build(BuildContext context) {
    final api = session.api;
    return FutureBuilder(
      future: Future.wait([api.assessments(course.id), api.grades(course.id)]),
      builder: (context, snapshot) => FadeSwitcher(
        state: snapshot.hasData ? 'data' : (snapshot.hasError ? 'error' : 'loading'),
        child: _content(context, snapshot),
      ),
    );
  }

  Widget _content(BuildContext context, AsyncSnapshot<List<dynamic>> snapshot) {
    if (!snapshot.hasData) {
      return snapshot.hasError ? const Center(child: Text("Couldn't load grades.")) : const SkeletonList(leading: false);
    }
    final assessments = snapshot.data![0] as List<Assessment>;
    final grades = snapshot.data![1] as List<GradeRow>;
    final isStaff = session.membership?.isStaff ?? false;
    if (assessments.isEmpty) return const Center(child: Text('No assessments yet.'));
    final theme = Theme.of(context);

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: assessments.length,
      itemBuilder: (context, i) {
        final a = assessments[i];
        final scores = grades.where((g) => g.assessmentId == a.id && g.score != null).toList();
        final String value;
        if (isStaff) {
          final avg = scores.isEmpty ? null : scores.map((g) => g.score!).reduce((x, y) => x + y) / scores.length;
          value = avg == null ? '—' : 'avg ${(avg / a.maxScore * 100).toStringAsFixed(0)}%';
        } else {
          final mine = scores.firstOrNull;
          value = mine == null ? '—' : '${mine.score!.toStringAsFixed(mine.score! % 1 == 0 ? 0 : 1)} / ${a.maxScore.toStringAsFixed(0)}';
        }
        return StaggeredItem(
          index: i,
          child: Card(
            child: ListTile(
              title: Text(a.title),
              subtitle: a.dueAt == null ? null : Text('Due ${DateFormat.yMMMd().format(a.dueAt!.toLocal())}'),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: value == '—' ? theme.colorScheme.surfaceContainerHigh : theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  value,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: value == '—' ? theme.colorScheme.onSurfaceVariant : theme.colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Roll call for the most recent session. Every tap is written to the offline
/// queue immediately, so it works with no signal.
class _RollCallTab extends StatefulWidget {
  const _RollCallTab({required this.course, required this.session, required this.queue});

  final Course course;
  final Session session;
  final OfflineQueue queue;

  @override
  State<_RollCallTab> createState() => _RollCallTabState();
}

class _RollCallTabState extends State<_RollCallTab> {
  static const _statuses = {'present': 'Present', 'late': 'Late', 'absent': 'Absent', 'excused': 'Excused'};
  late final Future<(ClassSession?, List<Student>)> _data = _load();
  final Map<int, String> _marks = {};

  Future<(ClassSession?, List<Student>)> _load() async {
    final api = widget.session.api;
    final results = await Future.wait([api.sessions(widget.course.id), api.students(widget.course.id)]);
    final sessions = results[0] as List<ClassSession>;
    final latest = sessions.firstOrNull;
    if (latest != null) _marks.addAll(latest.marks);
    return (latest, results[1] as List<Student>);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _data,
      builder: (context, snapshot) => FadeSwitcher(
        state: snapshot.hasData ? 'data' : (snapshot.hasError ? 'error' : 'loading'),
        child: _content(context, snapshot),
      ),
    );
  }

  Widget _content(BuildContext context, AsyncSnapshot<(ClassSession?, List<Student>)> snapshot) {
    if (!snapshot.hasData) {
      return snapshot.hasError ? const Center(child: Text("Couldn't load the class list.")) : const SkeletonList(leading: false);
    }
    final (session, students) = snapshot.data!;
    if (session == null) return const Center(child: Text('Create a class session on the web portal first.'));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          '${DateFormat.yMMMd().add_jm().format(session.startsAt.toLocal())}${session.topic != null ? ' · ${session.topic}' : ''}',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 12),
        for (final (i, s) in students.indexed)
          StaggeredItem(
            index: i,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.name, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      showSelectedIcon: false,
                      emptySelectionAllowed: true,
                      segments: [for (final e in _statuses.entries) ButtonSegment(value: e.key, label: Text(e.value))],
                      selected: {if (_marks[s.id] != null) _marks[s.id]!},
                      onSelectionChanged: (selection) {
                        if (selection.isEmpty) return;
                        setState(() => _marks[s.id] = selection.first);
                        widget.queue.markAttendance(sessionId: session.id, studentId: s.id, status: selection.first);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
