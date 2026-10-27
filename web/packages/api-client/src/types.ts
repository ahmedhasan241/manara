export type Role = "owner" | "admin" | "teacher" | "student" | "parent";
export type TenantType = "teacher" | "school" | "university";

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Membership {
  role: Role;
  permissions: string[];
  tenant: { id: number; slug: string; name: string; type: TenantType };
}

export interface User {
  id: number;
  name: string;
  email: string;
  locale: string;
  is_platform_admin: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  memberships?: Membership[];
  phone?: string | null;
  headline?: string | null;
  bio?: string | null;
  /** ISO 3166-1 alpha-2 code, e.g. "EG". */
  country?: string | null;
  city?: string | null;
  /** District, neighbourhood or region. */
  area?: string | null;
}

/** Where a person lives, sent with sign-up and profile updates. */
export interface UserLocationInput {
  country?: string | null;
  city?: string | null;
  area?: string | null;
}

export type LoginResult =
  | { token: string; user: User; mfa_required?: undefined }
  | { mfa_required: true; challenge: string };

export interface Plan {
  /** Its first feature line is "Everything in <previous plan>". */
  includes_previous?: boolean;
  /** Admin only: name, description and features per language (English is the base). */
  translations?: Partial<Record<"ar" | "fr" | "es" | "pt" | "zh", { name?: string; description?: string; features?: string[] }>> | null;
  id: number;
  code: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  price_yearly_cents: number;
  /** Monthly price of each seat beyond the plan's included students / staff. */
  extra_student_cents: number;
  extra_staff_cents: number;
  /** Monthly price of the video meetings add-on; null when video meetings are included. */
  video_addon_cents: number | null;
  /** Share of course sales Manara keeps from sellers on this plan (public plans: for the visitor's country). */
  commission_percent: number | null;
  currency: string;
  /** Public plans: the country whose own price this is (null: the default price). */
  price_country?: string | null;
  max_students: number | null;
  max_staff: number | null;
  storage_gb: number;
  features: string[] | null;
  is_active: boolean;
  subscriptions_count?: number;
  /** Admin only: prices per country. */
  prices?: PlanPrice[];
}

/** A plan's price in one country, in that country's currency. */
export interface PlanPrice {
  country: string;
  currency: string;
  price_monthly_cents: number;
  price_yearly_cents: number;
  extra_student_cents: number;
  extra_staff_cents: number;
  video_addon_cents: number | null;
  /** Course sales commission in this country (null: the plan's own). */
  commission_percent?: number | null;
  /** What the plan includes in this country (null: the plan's own allowance). */
  max_students?: number | null;
  max_staff?: number | null;
  storage_gb?: number | null;
}

/** What platform admins send to create or update a plan. */
export type PlanInput = Partial<Omit<Plan, "prices" | "id" | "subscriptions_count" | "price_country" | "includes_previous">> & { prices?: PlanPrice[] };

export type BillingInterval = "monthly" | "yearly";

export interface Subscription {
  id: number;
  status: "trialing" | "active" | "past_due" | "canceled";
  interval: BillingInterval;
  extra_students: number;
  extra_staff: number;
  video_addon: boolean;
  country: string | null;
  currency: string | null;
  /** The agreed price per billing interval, with seats and add-ons. */
  amount_cents: number | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  plan?: Plan;
}

export interface SeatUsage {
  used: number;
  /** Null: unlimited. */
  limit: number | null;
}

/** The workspace's package, for owners and admins (GET /billing). */
export interface Billing {
  subscription: Pick<Subscription, "id" | "status" | "interval" | "extra_students" | "extra_staff" | "video_addon" | "country" | "currency" | "amount_cents" | "trial_ends_at" | "current_period_ends_at">;
  /** The current plan, priced for the workspace's country. */
  plan: Plan;
  seats: { students: SeatUsage; staff: SeatUsage };
  video_meetings: boolean;
  /** Plans the workspace can switch to, priced for its country. */
  plans: Plan[];
}

export interface BillingChange {
  plan?: string;
  interval?: BillingInterval;
  extra_students?: number;
  extra_staff?: number;
  video_addon?: boolean;
}

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  type: TenantType;
  status: "active" | "suspended";
  locale: string;
  timezone: string;
  created_at: string;
  memberships_count?: number;
  subscription?: Subscription | null;
  site?: SiteContent | null;
  branding?: { logo_url?: string; primary_color?: string } | null;
  settings?: { require_mfa?: boolean } | null;
}

export interface SiteContent {
  tagline?: string;
  about?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  programs?: { title: string; description?: string }[];
}

export interface PublicSite {
  slug: string;
  name: string;
  type: TenantType;
  locale: string;
  branding: { logo_url?: string; primary_color?: string };
  site: SiteContent;
  news: { id: string; title: string; body: string; published_at: string }[];
}

export interface Workspace {
  tenant: Tenant;
  role: Role;
  permissions: string[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  term: string | null;
  category?: string | null;
  teacher?: { id: number; name: string } | null;
  enrollments_count?: number;
  assessments_count?: number;
  materials_count?: number;
  reviews_count?: number;
  /** Average star rating; decimal string from the database, or null. */
  reviews_avg_rating?: string | number | null;
  /** Online lessons planned (not canceled) and already held. */
  lessons_count?: number;
  lessons_done_count?: number;
  /** Subject of study, e.g. "Mathematics". */
  subject?: string | null;
  academic_level_id?: string | null;
  class_group_id?: string | null;
  academic_level?: { id: string; name: string; stage: AcademicStage; department: string | null } | null;
  class_group?: { id: string; name: string } | null;
  /** University credit hours; null for schools. */
  credit_hours?: number | null;
  periods_per_week?: number | null;
  /** Percentage needed to pass the subject. */
  pass_percent?: number;
}

// ---------------------------------------------------------------------------
// School / university structure, results, rankings and attendance standing

export type AcademicStage = "kindergarten" | "primary" | "preparatory" | "secondary" | "diploma" | "undergraduate" | "postgraduate";

export interface AcademicSettings {
  /** "percent" for schools, "gpa" (4.0 scale) for universities by default. */
  grading_scale: "percent" | "gpa";
  /** Joining an online lesson later than this counts as late. */
  late_after_minutes: number;
  absence_warning_percent: number;
  /** At or above this share of absences a student is barred / at risk. */
  absence_limit_percent: number;
  /** Whether students and parents see the top of the rankings. */
  rankings_visible: boolean;
  rankings_top: number;
}

export interface ClassGroup {
  id: string;
  academic_level_id: string;
  name: string;
  room: string | null;
  capacity: number | null;
  advisor_id: number | null;
  advisor: { id: number; name: string } | null;
  students_count?: number;
  courses_count?: number;
}

export interface AcademicLevel {
  id: string;
  stage: AcademicStage;
  name: string;
  department: string | null;
  position: number;
  courses_count?: number;
  groups: ClassGroup[];
}

export interface AcademicStructure {
  type: TenantType;
  stages: AcademicStage[];
  settings: AcademicSettings;
  levels: AcademicLevel[];
  students_count: number;
  unassigned_students: number;
}

export interface ClassGroupDetail extends ClassGroup {
  level: Omit<AcademicLevel, "groups">;
  students: { id: number; name: string; email: string }[];
  courses: Course[];
}

export type AttendanceStanding = "ok" | "warning" | "limit";

export interface AttendanceStats {
  sessions: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** Present + late, as a percentage of sessions; null with no sessions. */
  rate: number | null;
  absence_percent: number;
  status: AttendanceStanding;
}

export type StudentStanding = "honors" | "good" | "warning" | "at_risk";

export interface StudentOverall {
  student_id: number;
  courses: number;
  average: number | null;
  gpa: number | null;
  letter: string | null;
  credits: number;
  credits_earned: number;
  failing: number;
  attendance_rate: number | null;
  absences: number;
  standing: StudentStanding;
}

export interface ReportCardSubject {
  course: Pick<Course, "id" | "title" | "code" | "subject" | "term" | "credit_hours" | "pass_percent"> & { teacher: { id: number; name: string } | null };
  credit_hours?: number;
  percent?: number | null;
  graded?: number;
  letter?: string | null;
  points?: number | null;
  passed?: boolean | null;
  attendance?: AttendanceStats;
  rank: number | null;
  of: number;
}

export interface ReportCard {
  student: { id: number; name: string; email: string };
  class_group: { id: string; name: string; room: string | null; level: { id: string; name: string; stage: AcademicStage; department: string | null } | null; advisor: { id: number; name: string } | null } | null;
  settings: AcademicSettings;
  subjects: ReportCardSubject[];
  overall: StudentOverall | null;
  ranks: { group: { rank: number | null; of: number } | null; level: { rank: number | null; of: number } | null; school: { rank: number | null; of: number } };
  absences: { id: string; status: "absent" | "late" | "excused"; note: string | null; date: string | null; topic: string | null; course: { id: string; title: string; subject: string | null } | null }[];
}

export type RankingScope = "school" | "level" | "group" | "course";

/** Staff get full rows; students and parents get rank, name, average, gpa, letter and class only. */
export type RankingRow = Partial<StudentOverall> & { rank: number | null; student_id: number; name: string; average: number | null; class_group: string | null };

export interface Rankings {
  scope: RankingScope;
  id: string | null;
  label: string;
  total: number;
  grading_scale: "percent" | "gpa";
  rows: RankingRow[];
  /** The viewing student's own row (students and parents only). */
  me: RankingRow | null;
}

export interface AttendanceReportRow {
  student_id: number;
  name: string;
  class_group: string | null;
  sessions: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number | null;
  absence_percent: number;
  status: AttendanceStanding;
  courses: (AttendanceStats & { course: { id: string; title: string; subject: string | null } | null })[];
}

export interface AttendanceReport {
  label: string;
  settings: AcademicSettings;
  rows: AttendanceReportRow[];
  totals: { students: number; warning: number; limit: number; rate: number };
}

export interface TeachingOverview {
  today: (Pick<LiveLesson, "id" | "course_id" | "title" | "unit" | "objectives" | "homework" | "scheduled_at" | "duration_minutes" | "status" | "joinable"> & { course: { id: string; title: string; code: string; subject: string | null } | null })[];
  upcoming: { id: string; course_id: string; title: string; unit: string | null; scheduled_at: string; duration_minutes: number; course: { id: string; title: string; subject: string | null } | null }[];
  needs_attendance: { id: string; course_id: string; starts_at: string; topic: string | null; course: { id: string; title: string; subject: string | null } | null }[];
  to_review: { assessment: { id: string; course_id: string; title: string }; course: { id: string; title: string } | null; count: number; oldest: string | null }[];
  classes: (Pick<Course, "id" | "title" | "code" | "subject" | "term" | "credit_hours" | "enrollments_count" | "lessons_count" | "lessons_done_count"> & {
    level: { id: string; name: string; stage: AcademicStage } | null;
    class_group: { id: string; name: string } | null;
    average: number | null;
    pass_rate: number | null;
    attendance_rate: number;
    /** Students failing or over an absence threshold in this subject. */
    flagged: number;
  })[];
  at_risk: { student_id: number; name: string; standing: StudentStanding; average: number | null; attendance_rate: number | null; reasons: { type: "failing" | "absence_warning" | "absence_limit"; course: string | null; value: number | null }[] }[];
  top_students: (StudentOverall & { name: string; rank: number | null })[];
  totals: { courses: number; students: number; lessons_this_week: number; average: number; attendance_rate: number };
}

export interface CourseReviews {
  average: number | null;
  count: number;
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
  can_review: boolean;
  reviews: { id: number; rating: number; comment: string | null; author: string | null; mine: boolean; created_at: string; updated_at: string }[];
}

export type CalendarEventType = "lesson" | "assessment" | "deadline";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  starts_at: string;
  ends_at: string | null;
  /** Lesson status, assessment type or announcement priority. */
  status: string;
  course: { id: string; title: string; code: string } | null;
  target_id: string;
}

export interface Assessment {
  id: string;
  course_id: string;
  title: string;
  type: string;
  max_score: string;
  weight: string;
  due_at: string | null;
  published_at: string | null;
  /** True once the teacher has written questions: students take it online. */
  is_online?: boolean;
  time_limit_minutes?: number | null;
  max_attempts?: number;
  questions_count?: number;
}

/** The nine kinds of online exam question. */
export type ExamQuestionType = "single_choice" | "multiple_choice" | "true_false" | "short_answer" | "numeric" | "fill_blanks" | "ordering" | "matching" | "essay";

export interface ExamItem {
  id: string;
  text: string;
}

/**
 * A question as the teacher writes it. `options` is what students see;
 * `answer` is the key (shape depends on the type, see ExamGrader in the API):
 * single_choice {correct: id} · multiple_choice {correct: ids} · true_false {correct: bool}
 * short_answer {accepted: text[], case_sensitive?} · numeric {value, tolerance?}
 * fill_blanks {blanks: text[][]} (prompt marks blanks with [[blank]]) · ordering {order: ids}
 * matching {pairs: {leftId: rightId}} · essay {rubric?}
 */
export interface ExamQuestion {
  id?: string;
  type: ExamQuestionType;
  prompt: string;
  points: number | string;
  options?: ExamItem[] | { items: ExamItem[] } | { left: ExamItem[]; right: ExamItem[] } | null;
  answer?: Record<string, unknown> | null;
  explanation?: string | null;
}

export type ExamResultsVisibility = "immediately" | "after_due" | "never";

export interface ExamSettings {
  id: string;
  title: string;
  type: string;
  is_online: boolean;
  instructions: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  shuffle_questions: boolean;
  results_visibility: ExamResultsVisibility;
  max_score: string;
  due_at: string | null;
  published_at: string | null;
}

/** The teacher's view: settings, every question with its key, and a summary of attempts. */
export interface ExamDefinition extends ExamSettings {
  questions: (ExamQuestion & { id: string })[];
  stats: { submitted: number; needs_review: number; average: number | null };
}

export type ExamAttemptStatus = "in_progress" | "needs_review" | "graded";

export interface ExamAttemptSummary {
  id: string;
  status: ExamAttemptStatus;
  score: string | null;
  max_score: string;
  started_at: string;
  submitted_at: string | null;
  student?: { id: number; name: string } | null;
}

/** What a student sees before starting. */
export interface ExamOverview extends ExamSettings {
  course: { id: string; name: string };
  question_count: number;
  question_types: ExamQuestionType[];
  attempts_left: number;
  closed: boolean;
  can_start: boolean;
  open_attempt_id: string | null;
  attempts: ExamAttemptSummary[];
}

export interface ExamQuestionResult {
  points: number | null;
  max: number;
  outcome: "correct" | "partial" | "incorrect" | "unanswered" | "pending";
  reviewed?: boolean;
}

/** One sitting: questions (no key while running) and, once released, marks and explanations. */
export interface ExamAttempt {
  id: string;
  status: ExamAttemptStatus;
  started_at: string;
  deadline_at: string | null;
  submitted_at: string | null;
  server_time: string;
  score: string | null;
  max_score: string;
  feedback: string | null;
  results_visible: boolean;
  student: { id: number; name: string } | null;
  exam: ExamSettings & { course: { id: string; name: string } };
  answers: Record<string, unknown>;
  questions: (Omit<ExamQuestion, "id" | "points"> & { id: string; points: number; result?: ExamQuestionResult | null })[];
}

export interface GradeRow {
  id: string;
  assessment_id: string;
  student_id: number;
  student_name: string | null;
  score: string | null;
  feedback: string | null;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface ClassSession {
  id: string;
  course_id: string;
  starts_at: string;
  topic: string | null;
  attendances: { id: string; student_id: number; status: AttendanceStatus; note: string | null }[];
}

export interface AttendanceSummaryRow {
  student_id: number;
  student_name: string | null;
  total: number;
  attended: number;
  absent: number;
  rate: number | null;
}

export interface Material {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  mime_type: string | null;
  size_bytes: number;
  published_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "important" | "urgent";
  deadline_at: string | null;
  published_at: string | null;
  author?: { id: number; name: string } | null;
  course?: { id: string; title: string } | null;
}

export interface AppNotification {
  id: string;
  data: { category: string; title: string; body: string; priority?: string };
  read_at: string | null;
  created_at: string;
}

export interface PlatformStats {
  tenants: { total: number; active: number; by_type: Record<string, number> };
  subscriptions: Record<string, number>;
  mrr_cents: number;
  users: { members: number; active_last_7_days: number; by_role: Partial<Record<Role, number>>; suspended: number };
  signups_last_30_days: Record<string, number>;
  system: { failed_jobs: number; queued_jobs: number };
}

export interface MessagingKey {
  public_key: string;
  encrypted_private_key: string;
  private_key_nonce: string;
  kdf_salt: string;
  kdf_ops_limit: number;
  kdf_mem_limit: number;
  version?: number;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  title: string | null;
  last_message_at: string | null;
  unread: number;
  notify: "all" | "none";
  muted_until: string | null;
  participants: { id: number; name: string; public_key: string | null }[];
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: number | null;
  ciphertext: string;
  nonce: string;
  keys: Record<string, string>;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  role: Role;
  has_key: boolean;
}

export type LessonStatus = "scheduled" | "live" | "ended" | "canceled";

export interface LiveLesson {
  id: string;
  course_id: string;
  course: { id: string; title: string; code: string } | null;
  title: string;
  description: string | null;
  /** Lesson plan: unit / chapter, learning objectives, homework, links, and what was covered. */
  unit: string | null;
  objectives: string[];
  homework: string | null;
  homework_due_at: string | null;
  resources: LessonResource[];
  summary: string | null;
  scheduled_at: string;
  ends_at: string;
  duration_minutes: number;
  status: LessonStatus;
  started_at: string | null;
  ended_at: string | null;
  provider: "zoom" | "jitsi";
  auto_record: boolean;
  joinable: boolean;
  host: { id: number; name: string } | null;
  attendees_count: number | null;
  recordings_count: number | null;
}

export interface LessonResource {
  title: string;
  url: string;
}

export type LessonPlan = Pick<LiveLesson, "unit" | "objectives" | "homework" | "homework_due_at" | "resources" | "summary">;

export interface LessonAttendee {
  id: number;
  name: string;
  joined: boolean;
  first_joined_at: string | null;
  join_count: number;
}

export interface Recording {
  id: string;
  course_id: string;
  live_lesson_id: string | null;
  lesson: { id: string; title: string; scheduled_at: string } | null;
  title: string;
  source: "zoom" | "upload" | "link";
  status: "processing" | "ready" | "failed";
  external_url: string | null;
  mime_type: string | null;
  size_bytes: number;
  duration_seconds: number | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

export interface LearnerChild {
  id: number;
  name: string;
  relationship: string | null;
  selected: boolean;
}

export interface LearnerCourse {
  id: string;
  code: string;
  title: string;
  teacher: string | null;
  category: string | null;
  description: string | null;
  lessons_count: number;
  lessons_done_count: number;
  rating: number | null;
  reviews_count: number;
  grade_average: number | null;
  graded_count: number;
  attendance_rate: number | null;
  grade_trend: number[];
  next_lesson: { id: string; title: string; scheduled_at: string; status: LessonStatus } | null;
}

export interface LearnerOverview {
  student: { id: number; name: string } | null;
  totals: { courses: number; grade_average: number | null; attendance_rate: number | null; upcoming_lessons: number } | null;
  courses: LearnerCourse[];
  upcoming_lessons: { id: string; title: string; course: string | null; scheduled_at: string; status: LessonStatus; joinable: boolean }[];
  recent_grades: { id: string; course: string | null; assessment: string; score: number; max_score: number; percent: number; feedback: string | null; graded_at: string }[];
  deadlines: { id: string; title: string; deadline_at: string; priority: string; course_id: string | null }[];
  alerts: { type: "attendance" | "grades"; course: string; message: string }[];
}

export interface PlatformUser extends UserLocationInput {
  id: number;
  name: string;
  email: string;
  is_platform_admin: boolean;
  mfa_enabled: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  last_login_at: string | null;
  created_at: string;
  memberships: { role: Role; tenant: { id: number; name: string; slug: string } | null }[];
}

export interface PlatformUserDetail extends PlatformUser {
  devices: number;
  children: { id: number; name: string; tenant_id: number }[];
  guardians: { id: number; name: string; email: string }[];
  activity: { id: number; action: string; ip_address: string | null; created_at: string }[];
}

export interface PlatformSubscription extends Subscription {
  tenant: Pick<Tenant, "id" | "name" | "slug" | "type" | "status">;
  plan: Plan;
  canceled_at: string | null;
  created_at: string;
}

export interface MarketingContent {
  hero: { eyebrow: string; title: string; subtitle: string; primary_cta: string; secondary_cta: string };
  stats: { value: string; label: string }[];
  audiences: { key: string; title: string; subtitle: string; benefits: string[] }[];
  features: { icon: string; title: string; body: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  faq: { question: string; answer: string }[];
  cta: { title: string; subtitle: string; button: string };
}

export interface Device {
  id: number;
  name: string;
  last_used_at: string | null;
  created_at: string;
  current: boolean;
}

/* ---------- Course marketplace ---------- */

export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all";

export interface CatalogCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  level: CourseLevel;
  language: string;
  price_cents: number;
  currency: string;
  instructor: { id: number; name: string } | null;
  organization: { name: string; slug: string; type: TenantType } | null;
  rating: number | null;
  reviews_count: number;
  students_count: number;
  lectures_count: number;
  duration_seconds: number;
  published_at: string | null;
}

export interface CurriculumLecture {
  id: string;
  title: string;
  type: "video" | "article";
  duration_seconds: number;
  is_preview: boolean;
  completed: boolean;
  /** Only for people who may watch (and in the course builder). */
  video_url?: string | null;
  has_file?: boolean;
  body?: string | null;
}

export interface CurriculumSection {
  id: string;
  title: string;
  lectures: CurriculumLecture[];
}

export interface CatalogCourseDetail extends CatalogCourse {
  description: string | null;
  outcomes: string[];
  requirements: string[];
  updated_at: string;
  curriculum: CurriculumSection[];
  instructor_stats: { courses: number; students: number; reviews: number };
  reviews: {
    average: number | null;
    count: number;
    breakdown: Record<string, number>;
    latest: { id: number; rating: number; comment: string | null; author: string | null; created_at: string }[];
  };
}

export interface CatalogOrganization {
  name: string;
  slug: string;
  type: TenantType;
  courses: number;
}

/** A teacher, lecturer or doctor in the instructors directory. */
export interface CatalogInstructorSummary {
  id: number;
  name: string;
  headline: string | null;
  organization: { name: string; slug: string; type: TenantType } | null;
  categories: string[];
  courses: number;
  lectures: number;
  students: number;
  reviews: number;
  rating: number | null;
}

/** One instructor's public profile page. */
export interface CatalogInstructor {
  id: number;
  name: string;
  headline: string | null;
  bio: string | null;
  teaching_since: string | null;
  organizations: { name: string; slug: string; type: TenantType }[];
  categories: string[];
  students: number;
  rating: number | null;
  reviews_count: number;
  lectures_count: number;
  duration_seconds: number;
  courses: CatalogCourse[];
  /** Free lectures anyone can watch. */
  previews: { id: string; title: string; type: "video" | "article"; duration_seconds: number; course: { title: string | null; slug: string | null } }[];
  reviews: { id: number; rating: number; comment: string | null; author: string | null; course: string | null; created_at: string }[];
}

export interface CatalogStats {
  courses: number;
  instructors: number;
  organizations: number;
  learners: number;
  lectures: number;
}

export interface LearningCourse extends CatalogCourse {
  source: "purchase" | "free" | "enrollment";
  progress: { done: number; total: number };
  last_viewed_at: string | null;
  acquired_at: string;
}

export interface PlayerCourse extends CatalogCourse {
  description: string | null;
  outcomes: string[];
  curriculum: CurriculumSection[];
  progress: { done: number; total: number };
  resume_lecture_id: string | null;
  positions: Record<string, number>;
  review: { rating: number; comment: string | null } | null;
  owned: boolean;
  /** Code of the completion certificate, once every lecture is done. */
  certificate: string | null;
}

export interface Certificate {
  code: string;
  recipient_name: string;
  course_title: string;
  course_slug: string | null;
  instructor_name: string | null;
  organization_name: string | null;
  duration_seconds: number;
  issued_at: string;
}

export interface Playback {
  id: string;
  type: "video" | "article";
  title: string;
  body: string | null;
  url: string | null;
  external: boolean;
  mime_type: string | null;
}

export interface Order {
  id: string;
  number: string;
  status: "pending" | "paid" | "canceled";
  subtotal_cents: number;
  discount_cents?: number;
  total_cents: number;
  currency: string;
  coupon_code?: string | null;
  /** The currency the buyer saw prices in, and its rate to `currency` then. */
  display_currency: string | null;
  exchange_rate: number | null;
  provider: string | null;
  paid_at: string | null;
  created_at: string;
  items: { id: number; course_id: string; title: string; price_cents: number }[];
}

export interface CourseMarketplaceSettings {
  id: string;
  title: string;
  is_public: boolean;
  marketplace_status: "draft" | "published" | "suspended";
  slug: string | null;
  subtitle: string | null;
  category: string | null;
  description: string | null;
  level: CourseLevel;
  language: string;
  price_cents: number;
  currency: string;
  outcomes: string[] | null;
  requirements: string[] | null;
  marketplace_published_at: string | null;
}

export interface SalesReport {
  currency: string;
  revenue_cents: number;
  platform_fee_percent: number;
  earnings_cents: number;
  sales: number;
  learners: number;
  courses: { id: string; title: string; slug: string | null; status: string; price_cents: number; learners: number; revenue_cents: number }[];
  recent: { id: number; course: string; price_cents: number; paid_at: string }[];
}

export interface MarketplaceAdminReport {
  gross_cents: number;
  platform_fee_percent: number;
  platform_revenue_cents: number;
  orders: number;
  learners: number;
  published: number;
  courses: (CatalogCourse & { status: string })[];
  recent_orders: (Order & { user: { id: number; name: string; email: string } | null })[];
}

export interface MemberRow {
  id: number;
  role: Role;
  student_number: string | null;
  user: { id: number; name: string; email: string; last_login_at: string | null } & UserLocationInput;
}

export interface Coupon {
  id: number;
  code: string;
  percent_off: number;
  course_id: string | null;
  course: { id: string; title: string } | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

/** What a code takes off: discounted price (cents) per course it covers. */
export interface CouponCheck {
  code: string;
  percent_off: number;
  prices: Record<string, number>;
}

export interface LectureNote {
  id: number;
  lecture_id: string;
  position_seconds: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  lecture: { id: string; title: string; position: number } | null;
}

export interface LearningStats {
  streak: number;
  today_seconds: number;
  week_seconds: number;
  weekly_goal_minutes: number;
  week: { day: string; seconds: number }[];
}
