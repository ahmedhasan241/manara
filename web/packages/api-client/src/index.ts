import type {
  UserLocationInput,
  AcademicLevel,
  AcademicSettings,
  AcademicStage,
  AcademicStructure,
  AttendanceReport,
  ClassGroup,
  ClassGroupDetail,
  LessonPlan,
  RankingScope,
  Rankings,
  ReportCard,
  TeachingOverview,
  Announcement,
  AppNotification,
  Assessment,
  AttendanceStatus,
  AttendanceSummaryRow,
  CalendarEvent,
  Certificate,
  Coupon,
  CouponCheck,
  ChatMessage,
  ClassSession,
  Contact,
  Conversation,
  Course,
  CourseReviews,
  Device,
  GradeRow,
  LearnerChild,
  LearnerOverview,
  LearningStats,
  LectureNote,
  LessonAttendee,
  LiveLesson,
  LoginResult,
  MarketingContent,
  Material,
  MessagingKey,
  Paginated,
  Plan,
  PlatformStats,
  PlatformSubscription,
  PlatformUser,
  PlatformUserDetail,
  Role,
  Subscription,
  PublicSite,
  Recording,
  Tenant,
  User,
  Workspace,
  CatalogCourse,
  CatalogCourseDetail,
  CatalogInstructor,
  CatalogInstructorSummary,
  ExamAttempt,
  ExamAttemptSummary,
  ExamDefinition,
  ExamOverview,
  ExamQuestion,
  ExamResultsVisibility,
  CatalogOrganization,
  CatalogStats,
  CourseLevel,
  CourseMarketplaceSettings,
  CurriculumSection,
  LearningCourse,
  MarketplaceAdminReport,
  MemberRow,
  Order,
  Playback,
  PlayerCourse,
  SalesReport,
  TenantType,
} from "./types";

export * from "./types";
export * from "./currency";

export interface ClientOptions {
  baseUrl: string;
  token?: string | null;
  tenant?: string | null;
  /** For parents: which child's records to return (X-Student). */
  student?: string | null;
  /** Interface language for API messages (X-Locale). */
  locale?: string | null;
  /** Currency to quote prices in (X-Currency). */
  currency?: string | null;
  /** Passed to fetch, e.g. Next.js `{ next: { revalidate: 60 } }`. */
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
    public code?: string,
  ) {
    super(message);
  }
}

export function createClient({ baseUrl, token, tenant, student, locale, currency, init }: ClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (tenant) headers["X-Tenant"] = tenant;
    if (student) headers["X-Student"] = student;
    if (locale) headers["X-Locale"] = locale;
    if (currency) headers["X-Currency"] = currency;
    if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1${path}`, {
      ...init,
      method,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });

    if (response.status === 204) return undefined as T;

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(response.status, payload.message ?? response.statusText, payload.errors, payload.code);
    }
    return payload as T;
  }

  const get = <T>(path: string) => request<T>("GET", path);
  const qs = (params: Record<string, string | number | boolean | undefined>) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
    return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
  };

  return {
    request,

    // Public
    plans: () => get<Plan[]>("/plans"),
    site: (slug: string) => get<PublicSite>(`/sites/${encodeURIComponent(slug)}`),

    // Public course catalog
    catalogCourses: (params: { search?: string; category?: string; level?: CourseLevel; price?: "free" | "paid"; organization?: string; instructor?: number; sort?: string; page?: number; per_page?: number } = {}) =>
      get<Paginated<CatalogCourse>>(`/catalog/courses${qs(params)}`),
    catalogCourse: (slug: string) => get<CatalogCourseDetail>(`/catalog/courses/${encodeURIComponent(slug)}`),
    catalogCategories: () => get<{ name: string; courses: number }[]>("/catalog/categories"),
    catalogOrganizations: (type?: TenantType) => get<CatalogOrganization[]>(`/catalog/organizations${qs({ type })}`),
    catalogInstructors: (params: { search?: string; category?: string; type?: "school" | "university" | "teacher" } = {}) => get<CatalogInstructorSummary[]>(`/catalog/instructors${qs(params)}`),
    catalogInstructor: (id: number) => get<CatalogInstructor>(`/catalog/instructors/${id}`),
    catalogStats: () => get<CatalogStats>("/catalog/stats"),
    previewLecture: (id: string) => request<Playback>("POST", `/catalog/lectures/${id}/preview`),

    // Self-paced learning and purchases (signed in, no workspace needed)
    registerLearner: (data: { name: string; email: string; password: string; device_name?: string } & UserLocationInput) =>
      request<{ token: string; user: User }>("POST", "/auth/register-learner", data),
    forgotPassword: (email: string) => request<{ message: string }>("POST", "/auth/forgot-password", { email }),
    resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
      request<{ message: string }>("POST", "/auth/reset-password", data),
    myLearning: () => get<LearningCourse[]>("/learning"),
    learningCourse: (slug: string) => get<PlayerCourse>(`/learning/courses/${encodeURIComponent(slug)}`),
    learningStatus: (slug: string) =>
      get<{ owned: boolean; can_watch: boolean; wishlisted: boolean; review: { rating: number; comment: string | null } | null }>(`/learning/courses/${encodeURIComponent(slug)}/status`),
    playLecture: (id: string) => request<Playback>("POST", `/learning/lectures/${id}/play`),
    saveLectureProgress: (id: string, data: { completed?: boolean; position_seconds?: number }) =>
      request<{ lecture_id: string; completed: boolean; progress: { done: number; total: number }; certificate: string | null }>("POST", `/learning/lectures/${id}/progress`, data),
    reviewLearningCourse: (slug: string, data: { rating: number; comment?: string | null }) => request<unknown>("PUT", `/learning/courses/${encodeURIComponent(slug)}/review`, data),
    enrollFree: (slug: string) => request<{ owned: boolean }>("POST", `/catalog/courses/${encodeURIComponent(slug)}/enroll`),
    wishlist: () => get<(CatalogCourse & { saved_at: string })[]>("/wishlist"),
    wishlistIds: () => get<string[]>("/wishlist/ids"),
    addToWishlist: (courseId: string) => request<{ saved: boolean }>("PUT", `/wishlist/${courseId}`),
    removeFromWishlist: (courseId: string) => request<{ saved: boolean }>("DELETE", `/wishlist/${courseId}`),
    myCertificates: () => get<Certificate[]>("/my/certificates"),
    verifyCertificate: (code: string) => get<Certificate>(`/certificates/${encodeURIComponent(code)}`),
    orders: () => get<Order[]>("/orders"),
    order: (id: string) => get<Order>(`/orders/${id}`),
    createOrder: (courseIds: string[], coupon?: string) => request<{ order: Order | null; granted: string[] }>("POST", "/orders", { course_ids: courseIds, coupon }),
    checkCoupon: (code: string, courseIds: string[]) => request<CouponCheck>("POST", "/coupons/check", { code, course_ids: courseIds }),
    courseNotes: (slug: string) => get<LectureNote[]>(`/learning/courses/${encodeURIComponent(slug)}/notes`),
    addNote: (lectureId: string, data: { body: string; position_seconds?: number | null }) => request<LectureNote>("POST", `/learning/lectures/${lectureId}/notes`, data),
    updateNote: (id: number, body: string) => request<LectureNote>("PATCH", `/learning/notes/${id}`, { body }),
    deleteNote: (id: number) => request<{ deleted: boolean }>("DELETE", `/learning/notes/${id}`),
    learningStats: () => get<LearningStats>("/learning/stats"),
    setWeeklyGoal: (minutes: number) => request<LearningStats>("PUT", "/learning/goal", { weekly_goal_minutes: minutes }),
    payOrder: (id: string) => request<Order>("POST", `/orders/${id}/pay`),
    cancelOrder: (id: string) => request<Order>("POST", `/orders/${id}/cancel`),

    // Auth
    register: (data: {
      name: string;
      email: string;
      password: string;
      workspace_name: string;
      workspace_slug: string;
      workspace_type: string;
      plan?: string;
    } & UserLocationInput) => request<{ token: string; user: User }>("POST", "/auth/register", data),
    login: (email: string, password: string, device_name = "web") =>
      request<LoginResult>("POST", "/auth/login", { email, password, device_name }),
    verifyMfa: (challenge: string, code: string) =>
      request<{ token: string; user: User }>("POST", "/auth/mfa", { challenge, code }),
    logout: () => request<void>("POST", "/auth/logout"),

    // Me
    me: () => get<{ data: User }>("/me").then((r) => r.data),
    updateMe: (data: Partial<Pick<User, "name" | "locale" | "phone" | "headline" | "bio" | "country" | "city" | "area">>) =>
      request<{ message: string; user: User }>("PATCH", "/me", data),
    /** Signs out every other device; this one stays signed in. */
    changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
      request<{ message: string }>("PUT", "/me/password", data),
    myActivity: () => get<Paginated<{ id: number; action: string; ip_address: string; user_agent: string; created_at: string }>>("/me/activity"),
    devices: () => get<Device[]>("/me/devices"),
    revokeDevice: (id: number) => request<void>("DELETE", `/me/devices/${id}`),
    mfaSetup: () => request<{ secret: string; otpauth_uri: string }>("POST", "/me/mfa/setup"),
    mfaConfirm: (code: string) => request<{ recovery_codes: string[] }>("POST", "/me/mfa/confirm", { code }),

    // Workspace
    workspace: () => get<Workspace>("/workspace"),
    updateWorkspace: (data: Partial<Tenant>) => request<Tenant>("PATCH", "/workspace", data),
    courses: (params: { search?: string; page?: number; category?: string } = {}) => get<Paginated<Course>>(`/courses${qs(params)}`),
    course: (id: string) => get<Course>(`/courses/${id}`),
    createCourse: (data: Pick<Course, "code" | "title"> & Partial<Course>) => request<Course>("POST", "/courses", data),
    updateCourse: (id: string, data: Partial<Pick<Course, "code" | "title" | "description" | "term" | "category" | "subject" | "academic_level_id" | "class_group_id" | "credit_hours" | "periods_per_week" | "pass_percent">> & { teacher_id?: number | null; is_archived?: boolean }) =>
      request<Course>("PATCH", `/courses/${id}`, data),
    courseStudents: (id: string) => get<{ id: number; name: string; email: string }[]>(`/courses/${id}/students`),
    courseReviews: (courseId: string) => get<CourseReviews>(`/courses/${courseId}/reviews`),
    saveReview: (courseId: string, data: { rating: number; comment?: string | null }) => request<unknown>("PUT", `/courses/${courseId}/reviews`, data),
    deleteReview: (courseId: string) => request<void>("DELETE", `/courses/${courseId}/reviews`),
    curriculum: (courseId: string) => get<{ settings: CourseMarketplaceSettings; curriculum: CurriculumSection[]; students: number }>(`/courses/${courseId}/curriculum`),
    updateMarketplace: (courseId: string, data: Partial<Omit<CourseMarketplaceSettings, "id" | "title" | "marketplace_status" | "marketplace_published_at">> & { publish?: boolean }) =>
      request<CourseMarketplaceSettings>("PATCH", `/courses/${courseId}/marketplace`, data),
    createSection: (courseId: string, title: string) => request<{ id: string }>("POST", `/courses/${courseId}/sections`, { title }),
    updateSection: (id: string, title: string) => request<unknown>("PATCH", `/sections/${id}`, { title }),
    deleteSection: (id: string) => request<void>("DELETE", `/sections/${id}`),
    createLecture: (sectionId: string, form: FormData) => request<{ id: string }>("POST", `/sections/${sectionId}/lectures`, form),
    updateLecture: (id: string, data: { title?: string; body?: string | null; video_url?: string | null; duration_minutes?: number; is_preview?: boolean }) =>
      request<unknown>("PATCH", `/lectures/${id}`, data),
    deleteLecture: (id: string) => request<void>("DELETE", `/lectures/${id}`),
    moveCurriculumItem: (kind: "sections" | "lectures", id: string, direction: "up" | "down") => request<void>("POST", `/curriculum/${kind}/${id}/move`, { direction }),
    sales: () => get<SalesReport>("/sales"),
    coupons: () => get<Coupon[]>("/coupons"),
    createCoupon: (data: { code: string; percent_off: number; course_id?: string | null; max_uses?: number | null; expires_at?: string | null }) => request<Coupon>("POST", "/coupons", data),
    setCouponActive: (id: number, active: boolean) => request<Coupon>("PATCH", `/coupons/${id}`, { is_active: active }),
    deleteCoupon: (id: number) => request<{ deleted: boolean }>("DELETE", `/coupons/${id}`),
    members: (params: { role?: string; search?: string; page?: number } = {}) => get<Paginated<MemberRow>>(`/members${qs(params)}`),
    addMember: (data: { name: string; email: string; role: Role; student_number?: string; children?: number[] }) => request<MemberRow>("POST", "/members", data),
    addMembersBulk: (data: { role: Role; people: { name: string; email: string; student_number?: string }[]; course_id?: string }) =>
      request<{ added: number; existing: number }>("POST", "/members/bulk", data),
    removeMember: (id: number) => request<void>("DELETE", `/members/${id}`),
    enrollStudents: (courseId: string, studentIds: number[]) => request<{ enrolled: number }>("POST", `/courses/${courseId}/enrollments`, { student_ids: studentIds }),
    calendar: (from: string, to: string) => get<{ from: string; to: string; events: CalendarEvent[] }>(`/calendar${qs({ from, to })}`),
    assessments: (courseId: string) => get<Assessment[]>(`/courses/${courseId}/assessments`),
    createAssessment: (courseId: string, data: Partial<Assessment>) =>
      request<Assessment>("POST", `/courses/${courseId}/assessments`, data),
    grades: (courseId: string) => get<GradeRow[]>(`/courses/${courseId}/grades`),
    saveGrades: (assessmentId: string, grades: { student_id: number; score: number | null; feedback?: string }[]) =>
      request<GradeRow[]>("PUT", `/assessments/${assessmentId}/grades`, { grades }),

    // Online exams
    exam: (assessmentId: string) => get<ExamDefinition>(`/assessments/${assessmentId}/exam`),
    saveExam: (assessmentId: string, data: { time_limit_minutes: number | null; max_attempts: number; shuffle_questions: boolean; results_visibility: ExamResultsVisibility; instructions: string | null; questions: ExamQuestion[] }) =>
      request<ExamDefinition>("PUT", `/assessments/${assessmentId}/exam`, data),
    examAttempts: (assessmentId: string) => get<ExamAttemptSummary[]>(`/assessments/${assessmentId}/attempts`),
    examOverview: (assessmentId: string) => get<ExamOverview>(`/assessments/${assessmentId}/exam/overview`),
    startExam: (assessmentId: string) => request<ExamAttempt>("POST", `/assessments/${assessmentId}/attempts`),
    examAttempt: (attemptId: string) => get<ExamAttempt>(`/exam-attempts/${attemptId}`),
    saveExamAnswers: (attemptId: string, answers: Record<string, unknown>) =>
      request<{ saved_at: string; deadline_at: string | null } | ExamAttempt>("PATCH", `/exam-attempts/${attemptId}`, { answers }),
    submitExam: (attemptId: string, answers: Record<string, unknown>) => request<ExamAttempt>("POST", `/exam-attempts/${attemptId}/submit`, { answers }),
    reviewExamAttempt: (attemptId: string, data: { points?: Record<string, number>; feedback?: string | null }) =>
      request<ExamAttempt>("PATCH", `/exam-attempts/${attemptId}/review`, data),
    sessions: (courseId: string) => get<ClassSession[]>(`/courses/${courseId}/sessions`),
    createSession: (courseId: string, data: { starts_at: string; topic?: string }) =>
      request<ClassSession>("POST", `/courses/${courseId}/sessions`, data),
    markAttendance: (sessionId: string, records: { student_id: number; status: AttendanceStatus }[]) =>
      request<unknown>("PUT", `/sessions/${sessionId}/attendance`, { records }),
    attendanceSummary: (courseId: string) => get<AttendanceSummaryRow[]>(`/courses/${courseId}/attendance/summary`),
    materials: (courseId: string) => get<Material[]>(`/courses/${courseId}/materials`),
    uploadMaterial: (courseId: string, form: FormData) => request<Material>("POST", `/courses/${courseId}/materials`, form),
    deleteMaterial: (id: string) => request<void>("DELETE", `/materials/${id}`),
    announcements: () => get<Paginated<Announcement>>("/announcements"),
    createAnnouncement: (data: Pick<Announcement, "title" | "body"> & Partial<Announcement> & { course_id?: string }) =>
      request<Announcement>("POST", "/announcements", data),
    notifications: () => get<{ data: AppNotification[]; unread_count: number }>("/notifications"),
    markAllNotificationsRead: () => request<void>("POST", "/notifications/read-all"),

    // School / university structure, results, rankings, attendance standing
    academicStructure: () => get<AcademicStructure>("/academic/structure"),
    updateAcademicSettings: (data: Partial<AcademicSettings>) => request<AcademicSettings>("PATCH", "/academic/settings", data),
    createLevel: (data: { stage: AcademicStage; name: string; department?: string | null; position?: number }) => request<AcademicLevel>("POST", "/academic/levels", data),
    updateLevel: (id: string, data: Partial<{ stage: AcademicStage; name: string; department: string | null; position: number }>) => request<AcademicLevel>("PATCH", `/academic/levels/${id}`, data),
    deleteLevel: (id: string) => request<void>("DELETE", `/academic/levels/${id}`),
    classGroup: (id: string) => get<ClassGroupDetail>(`/academic/groups/${id}`),
    createClassGroup: (levelId: string, data: { name: string; advisor_id?: number | null; room?: string | null; capacity?: number | null }) => request<ClassGroup>("POST", `/academic/levels/${levelId}/groups`, data),
    updateClassGroup: (id: string, data: Partial<{ name: string; advisor_id: number | null; room: string | null; capacity: number | null }>) => request<ClassGroup>("PATCH", `/academic/groups/${id}`, data),
    deleteClassGroup: (id: string) => request<void>("DELETE", `/academic/groups/${id}`),
    /** Sets the class's students; `enroll` also enrolls them in every subject taught to the class. */
    setClassStudents: (id: string, studentIds: number[], enroll = false) => request<{ students: number }>("PUT", `/academic/groups/${id}/students`, { student_ids: studentIds, enroll }),
    rankings: (params: { scope?: RankingScope; id?: string } = {}) => get<Rankings>(`/academic/rankings${qs(params)}`),
    /** Students and parents get their own (or their child's); staff pass a student id. */
    reportCard: (studentId?: number) => get<ReportCard>(`/academic/report-card${qs({ student_id: studentId })}`),
    attendanceReport: (params: { scope?: RankingScope; id?: string; status?: "warning" | "limit" | "flagged" } = {}) => get<AttendanceReport>(`/academic/attendance${qs(params)}`),
    teachingOverview: () => get<TeachingOverview>("/teaching/overview"),

    // Live lessons and recordings
    upcomingLessons: () => get<LiveLesson[]>("/live-lessons/upcoming"),
    lesson: (id: string) => get<LiveLesson & { recordings: Recording[] }>(`/live-lessons/${id}`),
    courseLessons: (courseId: string) => get<LiveLesson[]>(`/courses/${courseId}/live-lessons`),
    scheduleLesson: (courseId: string, data: { title: string; description?: string; scheduled_at: string; duration_minutes?: number; auto_record?: boolean } & Partial<LessonPlan>) =>
      request<LiveLesson>("POST", `/courses/${courseId}/live-lessons`, data),
    /** Lesson plan fields; editable before and after the lesson. */
    saveLessonPlan: (id: string, data: Partial<LessonPlan>) => request<LiveLesson>("PATCH", `/live-lessons/${id}/plan`, data),
    updateLesson: (id: string, data: Partial<Pick<LiveLesson, "title" | "description" | "scheduled_at" | "duration_minutes" | "auto_record">>) =>
      request<LiveLesson>("PATCH", `/live-lessons/${id}`, data),
    cancelLesson: (id: string) => request<void>("DELETE", `/live-lessons/${id}`),
    startLesson: (id: string) => request<{ host_url: string; passcode: string | null; lesson: LiveLesson }>("POST", `/live-lessons/${id}/start`),
    endLesson: (id: string) => request<LiveLesson>("POST", `/live-lessons/${id}/end`),
    joinLesson: (id: string) => request<{ join_url: string; passcode: string | null }>("POST", `/live-lessons/${id}/join`),
    lessonAttendees: (id: string) => get<LessonAttendee[]>(`/live-lessons/${id}/attendees`),
    recordings: (courseId: string) => get<Recording[]>(`/courses/${courseId}/recordings`),
    uploadRecording: (courseId: string, form: FormData) => request<Recording>("POST", `/courses/${courseId}/recordings`, form),
    updateRecording: (id: string, data: { title?: string; published?: boolean }) => request<Recording>("PATCH", `/recordings/${id}`, data),
    deleteRecording: (id: string) => request<void>("DELETE", `/recordings/${id}`),
    playRecording: (id: string) => request<{ url: string; external: boolean; mime_type: string | null }>("POST", `/recordings/${id}/play`),

    // Encrypted messaging
    messagingKey: () => get<{ data: MessagingKey | null }>("/me/messaging-key").then((r) => r.data),
    saveMessagingKey: (key: MessagingKey & { reset?: boolean }) => request<{ data: { public_key: string; version: number } }>("PUT", "/me/messaging-key", key),
    contacts: (search?: string) => get<Contact[]>(`/messaging/contacts${qs({ search })}`),
    conversations: () => get<Conversation[]>("/conversations"),
    startConversation: (data: { type: "direct"; user_id: number } | { type: "group"; title: string; user_ids: number[] }) =>
      request<Conversation>("POST", "/conversations", data),
    messages: (conversationId: string, params: { before?: string; since?: string; limit?: number } = {}) =>
      get<ChatMessage[]>(`/conversations/${conversationId}/messages${qs(params)}`),
    sendMessage: (conversationId: string, message: Pick<ChatMessage, "id" | "ciphertext" | "nonce" | "keys">) =>
      request<ChatMessage>("POST", `/conversations/${conversationId}/messages`, message),
    markConversationRead: (conversationId: string) => request<void>("POST", `/conversations/${conversationId}/read`),
    conversationSettings: (conversationId: string, data: { notify?: "all" | "none"; muted_until?: string | null }) =>
      request<{ notify: string; muted_until: string | null }>("PATCH", `/conversations/${conversationId}/settings`, data),

    // Students and families
    learnerChildren: () => get<LearnerChild[]>("/learner/children"),
    learnerOverview: () => get<LearnerOverview>("/learner/overview"),

    // Product website
    marketing: () => get<MarketingContent & { plans: Plan[] }>("/marketing"),

    // Platform staff
    platformStats: () => get<PlatformStats>("/platform/stats"),
    platformTenant: (id: number) => get<{ tenant: Tenant & { subscriptions: (Subscription & { plan: Plan; created_at: string })[] }; counts: Partial<Record<Role, number>> }>(`/platform/tenants/${id}`),
    platformTenantMembers: (id: number, params: { role?: string; search?: string; page?: number } = {}) =>
      get<Paginated<{ id: number; role: Role; user: { id: number; name: string; email: string; last_login_at: string | null; suspended_at: string | null } }>>(`/platform/tenants/${id}/members${qs(params)}`),
    platformChangePlan: (tenantId: number, data: { plan_id: number; status: string; interval?: string; current_period_ends_at?: string | null }) =>
      request<Subscription>("POST", `/platform/tenants/${tenantId}/subscription`, data),
    platformUsers: (params: { search?: string; role?: string; status?: string; tenant_id?: number; page?: number } = {}) =>
      get<Paginated<PlatformUser>>(`/platform/users${qs(params)}`),
    platformUser: (id: number) => get<PlatformUserDetail>(`/platform/users/${id}`),
    platformSuspendUser: (id: number, suspended: boolean, reason?: string) => request<PlatformUser>("PATCH", `/platform/users/${id}`, { suspended, reason }),
    platformResetMfa: (id: number) => request<void>("POST", `/platform/users/${id}/reset-mfa`),
    platformSubscriptions: (params: { status?: string; page?: number } = {}) => get<Paginated<PlatformSubscription>>(`/platform/subscriptions${qs(params)}`),
    platformUpdateSubscription: (id: number, data: { status?: string; trial_ends_at?: string | null; current_period_ends_at?: string | null }) =>
      request<PlatformSubscription>("PATCH", `/platform/subscriptions/${id}`, data),
    platformCreatePlan: (data: Partial<Plan>) => request<Plan>("POST", "/platform/plans", data),
    platformUpdatePlan: (id: number, data: Partial<Plan>) => request<Plan>("PATCH", `/platform/plans/${id}`, data),
    platformWebsite: () => get<MarketingContent>("/platform/website"),
    platformUpdateWebsite: <K extends keyof MarketingContent>(key: K, content: MarketingContent[K]) =>
      request<MarketingContent[K]>("PUT", `/platform/website/${key}`, { content }),
    platformResetWebsite: (key: keyof MarketingContent) => request<unknown>("DELETE", `/platform/website/${key}`),
    platformTenants: (params: { search?: string; status?: string; page?: number } = {}) =>
      get<Paginated<Tenant>>(`/platform/tenants${qs(params)}`),
    platformUpdateTenant: (id: number, data: Partial<Pick<Tenant, "status" | "name">>) =>
      request<Tenant>("PATCH", `/platform/tenants/${id}`, data),
    platformPlans: () => get<Plan[]>("/platform/plans"),
    platformMarketplace: () => get<MarketplaceAdminReport>("/platform/marketplace"),
    platformCourseStatus: (courseId: string, status: "published" | "suspended") => request<unknown>("PATCH", `/platform/marketplace/courses/${courseId}`, { status }),
  };
}

export type ApiClient = ReturnType<typeof createClient>;

export function formatMoney(cents: number, currency = "USD", locale = "en") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(
    cents / 100,
  );
}
