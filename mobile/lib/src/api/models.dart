class Membership {
  Membership({required this.role, required this.tenantSlug, required this.tenantName, required this.permissions});

  factory Membership.fromJson(Map<String, dynamic> json) => Membership(
        role: json['role'] as String,
        tenantSlug: json['tenant']['slug'] as String,
        tenantName: json['tenant']['name'] as String,
        permissions: List<String>.from(json['permissions'] as List),
      );

  final String role;
  final String tenantSlug;
  final String tenantName;
  final List<String> permissions;

  bool get isStaff => const ['owner', 'admin', 'teacher'].contains(role);
}

class User {
  User({
    required this.id,
    required this.name,
    required this.email,
    required this.mfaEnabled,
    required this.memberships,
    this.phone,
    this.country,
    this.city,
    this.area,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as int,
        name: json['name'] as String,
        email: json['email'] as String,
        mfaEnabled: json['mfa_enabled'] as bool? ?? false,
        phone: json['phone'] as String?,
        country: json['country'] as String?,
        city: json['city'] as String?,
        area: json['area'] as String?,
        memberships: ((json['memberships'] as List?) ?? const [])
            .map((m) => Membership.fromJson(m as Map<String, dynamic>))
            .toList(),
      );

  final int id;
  final String name;
  final String email;
  final bool mfaEnabled;
  final List<Membership> memberships;
  final String? phone;

  /// ISO 3166-1 alpha-2 code, e.g. "EG".
  final String? country;
  final String? city;
  final String? area;
}

class Course {
  Course({required this.id, required this.code, required this.title, this.teacherName, this.term});

  factory Course.fromJson(Map<String, dynamic> json) => Course(
        id: json['id'] as String,
        code: json['code'] as String,
        title: json['title'] as String,
        term: json['term'] as String?,
        teacherName: (json['teacher'] as Map<String, dynamic>?)?['name'] as String?,
      );

  final String id;
  final String code;
  final String title;
  final String? term;
  final String? teacherName;
}

class Assessment {
  Assessment({required this.id, required this.title, required this.maxScore, this.dueAt});

  factory Assessment.fromJson(Map<String, dynamic> json) => Assessment(
        id: json['id'] as String,
        title: json['title'] as String,
        maxScore: double.parse(json['max_score'].toString()),
        dueAt: json['due_at'] == null ? null : DateTime.parse(json['due_at'] as String),
      );

  final String id;
  final String title;
  final double maxScore;
  final DateTime? dueAt;
}

class GradeRow {
  GradeRow({required this.assessmentId, required this.studentId, this.score, this.feedback});

  factory GradeRow.fromJson(Map<String, dynamic> json) => GradeRow(
        assessmentId: json['assessment_id'] as String,
        studentId: json['student_id'] as int,
        score: json['score'] == null ? null : double.parse(json['score'].toString()),
        feedback: json['feedback'] as String?,
      );

  final String assessmentId;
  final int studentId;
  final double? score;
  final String? feedback;
}

class ClassSession {
  ClassSession({required this.id, required this.startsAt, this.topic, required this.marks});

  factory ClassSession.fromJson(Map<String, dynamic> json) => ClassSession(
        id: json['id'] as String,
        startsAt: DateTime.parse(json['starts_at'] as String),
        topic: json['topic'] as String?,
        marks: {
          for (final a in (json['attendances'] as List? ?? const []))
            (a['student_id'] as int): a['status'] as String,
        },
      );

  final String id;
  final DateTime startsAt;
  final String? topic;
  final Map<int, String> marks;
}

class LiveLesson {
  LiveLesson({
    required this.id,
    required this.courseId,
    required this.title,
    required this.scheduledAt,
    required this.durationMinutes,
    required this.status,
    required this.joinable,
    this.courseTitle,
    this.description,
    this.hostName,
    this.recordingsCount = 0,
  });

  factory LiveLesson.fromJson(Map<String, dynamic> json) => LiveLesson(
        id: json['id'] as String,
        courseId: json['course_id'] as String,
        courseTitle: (json['course'] as Map<String, dynamic>?)?['title'] as String?,
        title: json['title'] as String,
        description: json['description'] as String?,
        scheduledAt: DateTime.parse(json['scheduled_at'] as String),
        durationMinutes: json['duration_minutes'] as int,
        status: json['status'] as String,
        joinable: json['joinable'] as bool? ?? false,
        hostName: (json['host'] as Map<String, dynamic>?)?['name'] as String?,
        recordingsCount: json['recordings_count'] as int? ?? 0,
      );

  final String id;
  final String courseId;
  final String? courseTitle;
  final String title;
  final String? description;
  final DateTime scheduledAt;
  final int durationMinutes;

  /// scheduled | live | ended | canceled
  final String status;
  final bool joinable;
  final String? hostName;
  final int recordingsCount;

  bool get isLive => status == 'live';
  bool get isUpcoming => status == 'scheduled';
}

class Recording {
  Recording({required this.id, required this.title, required this.createdAt, this.durationSeconds, this.viewCount = 0, this.isLink = false});

  factory Recording.fromJson(Map<String, dynamic> json) => Recording(
        id: json['id'] as String,
        title: json['title'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
        durationSeconds: json['duration_seconds'] as int?,
        viewCount: json['view_count'] as int? ?? 0,
        isLink: json['source'] == 'link',
      );

  final String id;
  final String title;
  final DateTime createdAt;
  final int? durationSeconds;
  final int viewCount;
  final bool isLink;
}

class Participant {
  Participant({required this.id, required this.name, this.publicKey});

  factory Participant.fromJson(Map<String, dynamic> json) =>
      Participant(id: json['id'] as int, name: json['name'] as String, publicKey: json['public_key'] as String?);

  final int id;
  final String name;
  final String? publicKey;
}

class Conversation {
  Conversation({
    required this.id,
    required this.type,
    required this.participants,
    this.title,
    this.lastMessageAt,
    this.unread = 0,
    this.alertsOn = true,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String?,
        lastMessageAt: json['last_message_at'] == null ? null : DateTime.parse(json['last_message_at'] as String),
        unread: json['unread'] as int? ?? 0,
        alertsOn: json['notify'] != 'none',
        participants: (json['participants'] as List).map((p) => Participant.fromJson(p as Map<String, dynamic>)).toList(),
      );

  final String id;
  final String type;
  final String? title;
  final DateTime? lastMessageAt;
  final int unread;
  final bool alertsOn;
  final List<Participant> participants;

  bool get isGroup => type == 'group';

  String nameFor(int myId) => title ?? participants.where((p) => p.id != myId).map((p) => p.name).join(', ');
}

class Contact {
  Contact({required this.id, required this.name, required this.role, required this.hasKey});

  factory Contact.fromJson(Map<String, dynamic> json) => Contact(
        id: json['id'] as int,
        name: json['name'] as String,
        role: json['role'] as String,
        hasKey: json['has_key'] as bool? ?? false,
      );

  final int id;
  final String name;
  final String role;
  final bool hasKey;
}

class Student {
  Student({required this.id, required this.name});

  factory Student.fromJson(Map<String, dynamic> json) => Student(id: json['id'] as int, name: json['name'] as String);

  final int id;
  final String name;
}
