<?php

use App\Http\Controllers\Api\V1\AcademicController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AssessmentController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CalendarController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CertificateController;
use App\Http\Controllers\Api\V1\ConversationController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\CourseReviewController;
use App\Http\Controllers\Api\V1\CurriculumController;
use App\Http\Controllers\Api\V1\ExamController;
use App\Http\Controllers\Api\V1\ExportController;
use App\Http\Controllers\Api\V1\GradeController;
use App\Http\Controllers\Api\V1\LearnerController;
use App\Http\Controllers\Api\V1\LearningController;
use App\Http\Controllers\Api\V1\LectureNoteController;
use App\Http\Controllers\Api\V1\LiveLessonController;
use App\Http\Controllers\Api\V1\MaterialController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\MemberController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\MessagingKeyController;
use App\Http\Controllers\Api\V1\MfaController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\Platform\MarketplaceAdminController;
use App\Http\Controllers\Api\V1\Platform\PlanAdminController;
use App\Http\Controllers\Api\V1\Platform\SiteContentController;
use App\Http\Controllers\Api\V1\Platform\StatsController;
use App\Http\Controllers\Api\V1\Platform\SubscriptionAdminController;
use App\Http\Controllers\Api\V1\Platform\TenantAdminController;
use App\Http\Controllers\Api\V1\Platform\UserAdminController;
use App\Http\Controllers\Api\V1\PublicController;
use App\Http\Controllers\Api\V1\PushTokenController;
use App\Http\Controllers\Api\V1\RecordingController;
use App\Http\Controllers\Api\V1\SalesController;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\TeachingController;
use App\Http\Controllers\Api\V1\WishlistController;
use App\Http\Controllers\Api\V1\WorkspaceController;
use App\Http\Controllers\Api\V1\ZoomWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('v1.')->group(function () {
    // Public: marketing site and subscriber websites
    Route::get('plans', [PublicController::class, 'plans'])->name('plans');
    Route::post('coupons/check', [CouponController::class, 'check'])->middleware('throttle:30,1')->name('coupons.check');
    Route::get('currencies', [PublicController::class, 'currencies'])->name('currencies');
    Route::get('marketing', [PublicController::class, 'marketing'])->name('marketing');
    Route::get('sites/{slug}', [PublicController::class, 'site'])->name('sites.show');
    Route::get('certificates/{code}', [CertificateController::class, 'verify'])->middleware('throttle:60,1')->name('certificates.verify');

    // Video streams use short-lived signed URLs instead of tokens, so <video> can seek.
    Route::get('recordings/{recording}/stream', [RecordingController::class, 'stream'])->middleware('signed')->name('recordings.stream');
    Route::get('lectures/{lecture}/stream', [LearningController::class, 'stream'])->middleware('signed')->name('lectures.stream');

    // Public course catalog (no sign-in)
    Route::prefix('catalog')->name('catalog.')->group(function () {
        Route::get('courses', [CatalogController::class, 'index'])->name('courses');
        Route::get('courses/{slug}', [CatalogController::class, 'show'])->name('courses.show');
        Route::get('categories', [CatalogController::class, 'categories'])->name('categories');
        Route::get('organizations', [CatalogController::class, 'organizations'])->name('organizations');
        Route::get('instructors', [CatalogController::class, 'instructors'])->name('instructors');
        Route::get('instructors/{user}', [CatalogController::class, 'instructor'])->name('instructors.show');
        Route::get('stats', [CatalogController::class, 'stats'])->name('stats');
        Route::post('lectures/{lecture}/preview', [CatalogController::class, 'preview'])->middleware('throttle:60,1')->name('lectures.preview');
    });

    // Video provider events (signature-checked inside the controller).
    Route::post('webhooks/zoom', ZoomWebhookController::class)->middleware('throttle:120,1')->name('webhooks.zoom');

    // Authentication
    Route::middleware('throttle:auth')->prefix('auth')->name('auth.')->group(function () {
        Route::post('register', [AuthController::class, 'registerWorkspace'])->name('register');
        Route::post('register-learner', [AuthController::class, 'registerLearner'])->name('register-learner');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->name('forgot-password');
        Route::post('reset-password', [AuthController::class, 'resetPassword'])->name('reset-password');
        Route::post('login', [AuthController::class, 'login'])->name('login');
        Route::post('mfa', [AuthController::class, 'mfaChallenge'])->name('mfa');
    });

    Route::middleware(['auth:sanctum', 'active', 'throttle:api'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        // Self-paced learning and purchases (any signed-in user, no workspace needed)
        Route::get('learning', [LearningController::class, 'index'])->name('learning.index');
        Route::get('learning/courses/{slug}', [LearningController::class, 'show'])->name('learning.show');
        Route::get('learning/courses/{slug}/status', [LearningController::class, 'status'])->name('learning.status');
        Route::put('learning/courses/{slug}/review', [LearningController::class, 'review'])->name('learning.review');
        Route::post('learning/lectures/{lecture}/play', [LearningController::class, 'play'])->name('learning.play');
        Route::post('learning/lectures/{lecture}/progress', [LearningController::class, 'progress'])->name('learning.progress');
        Route::get('learning/courses/{slug}/notes', [LectureNoteController::class, 'index'])->name('notes.index');
        Route::post('learning/lectures/{lecture}/notes', [LectureNoteController::class, 'store'])->name('notes.store');
        Route::patch('learning/notes/{note}', [LectureNoteController::class, 'update'])->name('notes.update');
        Route::delete('learning/notes/{note}', [LectureNoteController::class, 'destroy'])->name('notes.destroy');
        Route::get('learning/stats', [LectureNoteController::class, 'stats'])->name('learning.stats');
        Route::put('learning/goal', [LectureNoteController::class, 'goal'])->name('learning.goal');
        Route::post('catalog/courses/{slug}/enroll', [OrderController::class, 'enrollFree'])->name('catalog.enroll');
        Route::get('my/certificates', [CertificateController::class, 'index'])->name('certificates.index');
        Route::get('wishlist', [WishlistController::class, 'index'])->name('wishlist.index');
        Route::get('wishlist/ids', [WishlistController::class, 'ids'])->name('wishlist.ids');
        Route::put('wishlist/{course}', [WishlistController::class, 'store'])->whereUuid('course')->name('wishlist.store');
        Route::delete('wishlist/{course}', [WishlistController::class, 'destroy'])->whereUuid('course')->name('wishlist.destroy');

        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::post('orders/{order}/pay', [OrderController::class, 'pay'])->name('orders.pay');
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');

        // The signed-in user, across all workspaces
        Route::prefix('me')->name('me.')->group(function () {
            Route::get('/', [AuthController::class, 'me'])->name('show');
            Route::patch('/', [MeController::class, 'update'])->name('update');
            Route::put('password', [MeController::class, 'password'])->middleware('throttle:10,1')->name('password');
            Route::get('activity', [MeController::class, 'activity'])->name('activity');
            Route::get('devices', [MeController::class, 'devices'])->name('devices');
            Route::delete('devices/{token}', [MeController::class, 'revokeDevice'])->name('devices.revoke');
            Route::get('export', [MeController::class, 'export'])->name('export');
            Route::post('mfa/setup', [MfaController::class, 'setup'])->name('mfa.setup');
            Route::post('mfa/confirm', [MfaController::class, 'confirm'])->name('mfa.confirm');
            Route::post('mfa/disable', [MfaController::class, 'disable'])->name('mfa.disable');
            Route::get('messaging-key', [MessagingKeyController::class, 'show'])->name('messaging-key.show');
            Route::put('messaging-key', [MessagingKeyController::class, 'store'])->name('messaging-key.store');
            Route::post('push-tokens', [PushTokenController::class, 'store'])->name('push-tokens.store');
            Route::delete('push-tokens', [PushTokenController::class, 'destroy'])->name('push-tokens.destroy');
        });

        // Inside one workspace (X-Tenant header)
        Route::middleware('tenant')->group(function () {
            Route::get('workspace', [WorkspaceController::class, 'show'])->name('workspace.show');
            Route::patch('workspace', [WorkspaceController::class, 'update'])->name('workspace.update');
            Route::get('workspace/activity', [WorkspaceController::class, 'activity'])->name('workspace.activity');

            Route::post('members/bulk', [MemberController::class, 'bulk'])->name('members.bulk');
            Route::apiResource('members', MemberController::class)->parameters(['members' => 'membership'])->except('show');

            Route::apiResource('courses', CourseController::class);
            Route::get('courses/{course}/students', [CourseController::class, 'students'])->name('courses.students');
            Route::post('courses/{course}/enrollments', [CourseController::class, 'enroll'])->name('courses.enroll');
            Route::delete('courses/{course}/enrollments/{student}', [CourseController::class, 'unenroll'])->name('courses.unenroll');

            Route::get('courses/{course}/curriculum', [CurriculumController::class, 'show'])->name('curriculum.show');
            Route::patch('courses/{course}/marketplace', [CurriculumController::class, 'updateSettings'])->name('curriculum.settings');
            Route::post('courses/{course}/sections', [CurriculumController::class, 'storeSection'])->name('sections.store');
            Route::patch('sections/{section}', [CurriculumController::class, 'updateSection'])->name('sections.update');
            Route::delete('sections/{section}', [CurriculumController::class, 'destroySection'])->name('sections.destroy');
            Route::post('sections/{section}/lectures', [CurriculumController::class, 'storeLecture'])->name('lectures.store');
            Route::patch('lectures/{lecture}', [CurriculumController::class, 'updateLecture'])->name('lectures.update');
            Route::delete('lectures/{lecture}', [CurriculumController::class, 'destroyLecture'])->name('lectures.destroy');
            Route::post('curriculum/{kind}/{id}/move', [CurriculumController::class, 'move'])->whereIn('kind', ['sections', 'lectures'])->name('curriculum.move');
            Route::get('sales', SalesController::class)->name('sales');
            Route::apiResource('coupons', CouponController::class)->only(['index', 'store', 'update', 'destroy']);

            Route::get('courses/{course}/reviews', [CourseReviewController::class, 'index'])->name('reviews.index');
            Route::put('courses/{course}/reviews', [CourseReviewController::class, 'upsert'])->name('reviews.upsert');
            Route::delete('courses/{course}/reviews', [CourseReviewController::class, 'destroy'])->name('reviews.destroy');

            Route::get('calendar', CalendarController::class)->name('calendar');

            Route::get('courses/{course}/assessments', [AssessmentController::class, 'index'])->name('assessments.index');
            Route::post('courses/{course}/assessments', [AssessmentController::class, 'store'])->name('assessments.store');
            Route::patch('assessments/{assessment}', [AssessmentController::class, 'update'])->name('assessments.update');
            Route::delete('assessments/{assessment}', [AssessmentController::class, 'destroy'])->name('assessments.destroy');

            // Online exams
            Route::get('assessments/{assessment}/exam', [ExamController::class, 'show'])->name('exams.show');
            Route::put('assessments/{assessment}/exam', [ExamController::class, 'save'])->name('exams.save');
            Route::get('assessments/{assessment}/exam/overview', [ExamController::class, 'overview'])->name('exams.overview');
            Route::get('assessments/{assessment}/attempts', [ExamController::class, 'attempts'])->name('exams.attempts');
            Route::post('assessments/{assessment}/attempts', [ExamController::class, 'start'])->name('exams.start');
            Route::get('exam-attempts/{attempt}', [ExamController::class, 'attempt'])->name('exams.attempt');
            Route::patch('exam-attempts/{attempt}', [ExamController::class, 'saveAnswers'])->name('exams.answers');
            Route::post('exam-attempts/{attempt}/submit', [ExamController::class, 'submit'])->name('exams.submit');
            Route::patch('exam-attempts/{attempt}/review', [ExamController::class, 'review'])->name('exams.review');

            Route::get('courses/{course}/grades', [GradeController::class, 'index'])->name('grades.index');
            Route::put('assessments/{assessment}/grades', [GradeController::class, 'upsert'])->name('grades.upsert');

            Route::get('courses/{course}/sessions', [AttendanceController::class, 'sessions'])->name('sessions.index');
            Route::post('courses/{course}/sessions', [AttendanceController::class, 'storeSession'])->name('sessions.store');
            Route::put('sessions/{session}/attendance', [AttendanceController::class, 'mark'])->name('attendance.mark');
            Route::get('courses/{course}/attendance/summary', [AttendanceController::class, 'summary'])->name('attendance.summary');

            Route::get('courses/{course}/materials', [MaterialController::class, 'index'])->name('materials.index');
            Route::post('courses/{course}/materials', [MaterialController::class, 'store'])->name('materials.store');
            Route::get('materials/{material}/download', [MaterialController::class, 'download'])->name('materials.download');
            Route::delete('materials/{material}', [MaterialController::class, 'destroy'])->name('materials.destroy');

            Route::get('announcements', [AnnouncementController::class, 'index'])->name('announcements.index');
            Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
            Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');

            Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
            Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
            Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');

            Route::get('exports/courses/{course}/grades.csv', [ExportController::class, 'grades'])->name('exports.grades');
            Route::get('exports/courses/{course}/attendance.csv', [ExportController::class, 'attendance'])->name('exports.attendance');

            Route::get('learner/children', [LearnerController::class, 'children'])->name('learner.children');
            Route::get('learner/overview', [LearnerController::class, 'overview'])->name('learner.overview');

            Route::get('live-lessons/upcoming', [LiveLessonController::class, 'upcoming'])->name('live-lessons.upcoming');
            Route::get('courses/{course}/live-lessons', [LiveLessonController::class, 'index'])->name('live-lessons.index');
            Route::post('courses/{course}/live-lessons', [LiveLessonController::class, 'store'])->name('live-lessons.store');
            Route::get('live-lessons/{lesson}', [LiveLessonController::class, 'show'])->name('live-lessons.show');
            Route::patch('live-lessons/{lesson}', [LiveLessonController::class, 'update'])->name('live-lessons.update');
            Route::delete('live-lessons/{lesson}', [LiveLessonController::class, 'destroy'])->name('live-lessons.destroy');
            Route::post('live-lessons/{lesson}/start', [LiveLessonController::class, 'start'])->name('live-lessons.start');
            Route::post('live-lessons/{lesson}/end', [LiveLessonController::class, 'end'])->name('live-lessons.end');
            Route::post('live-lessons/{lesson}/join', [LiveLessonController::class, 'join'])->name('live-lessons.join');
            Route::get('live-lessons/{lesson}/attendees', [LiveLessonController::class, 'attendees'])->name('live-lessons.attendees');
            Route::patch('live-lessons/{lesson}/plan', [LiveLessonController::class, 'plan'])->name('live-lessons.plan');

            // School / university structure, results, rankings and attendance standing
            Route::prefix('academic')->name('academic.')->group(function () {
                Route::get('structure', [AcademicController::class, 'structure'])->name('structure');
                Route::patch('settings', [AcademicController::class, 'updateSettings'])->name('settings');
                Route::post('levels', [AcademicController::class, 'storeLevel'])->name('levels.store');
                Route::patch('levels/{level}', [AcademicController::class, 'updateLevel'])->name('levels.update');
                Route::delete('levels/{level}', [AcademicController::class, 'destroyLevel'])->name('levels.destroy');
                Route::post('levels/{level}/groups', [AcademicController::class, 'storeGroup'])->name('groups.store');
                Route::get('groups/{group}', [AcademicController::class, 'group'])->name('groups.show');
                Route::patch('groups/{group}', [AcademicController::class, 'updateGroup'])->name('groups.update');
                Route::delete('groups/{group}', [AcademicController::class, 'destroyGroup'])->name('groups.destroy');
                Route::put('groups/{group}/students', [AcademicController::class, 'syncStudents'])->name('groups.students');
                Route::get('rankings', [AcademicController::class, 'rankings'])->name('rankings');
                Route::get('report-card', [AcademicController::class, 'reportCard'])->name('report-card');
                Route::get('attendance', [AcademicController::class, 'attendance'])->name('attendance');
            });
            Route::get('teaching/overview', TeachingController::class)->name('teaching.overview');

            Route::get('courses/{course}/recordings', [RecordingController::class, 'index'])->name('recordings.index');
            Route::post('courses/{course}/recordings', [RecordingController::class, 'store'])->name('recordings.store');
            Route::patch('recordings/{recording}', [RecordingController::class, 'update'])->name('recordings.update');
            Route::delete('recordings/{recording}', [RecordingController::class, 'destroy'])->name('recordings.destroy');
            Route::post('recordings/{recording}/play', [RecordingController::class, 'play'])->name('recordings.play');

            Route::get('messaging/contacts', [ConversationController::class, 'contacts'])->name('messaging.contacts');
            Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
            Route::post('conversations', [ConversationController::class, 'store'])->name('conversations.store');
            Route::patch('conversations/{conversation}/settings', [ConversationController::class, 'settings'])->name('conversations.settings');
            Route::post('conversations/{conversation}/read', [ConversationController::class, 'read'])->name('conversations.read');
            Route::get('conversations/{conversation}/messages', [MessageController::class, 'index'])->name('messages.index');
            Route::post('conversations/{conversation}/messages', [MessageController::class, 'store'])->name('messages.store');

            Route::get('sync/pull', [SyncController::class, 'pull'])->name('sync.pull');
            Route::post('sync/push', [SyncController::class, 'push'])->name('sync.push');
        });

        // Manara staff
        Route::middleware('platform')->prefix('platform')->name('platform.')->group(function () {
            Route::get('stats', StatsController::class)->name('stats');
            Route::get('marketplace', [MarketplaceAdminController::class, 'index'])->name('marketplace.index');
            Route::patch('marketplace/courses/{course}', [MarketplaceAdminController::class, 'update'])->name('marketplace.update');
            Route::get('tenants', [TenantAdminController::class, 'index'])->name('tenants.index');
            Route::get('tenants/{tenant}', [TenantAdminController::class, 'show'])->name('tenants.show');
            Route::patch('tenants/{tenant}', [TenantAdminController::class, 'update'])->name('tenants.update');
            Route::get('tenants/{tenant}/members', [TenantAdminController::class, 'members'])->name('tenants.members');
            Route::post('tenants/{tenant}/subscription', [TenantAdminController::class, 'changePlan'])->name('tenants.subscription');
            Route::apiResource('plans', PlanAdminController::class)->only(['index', 'store', 'update']);

            Route::get('users', [UserAdminController::class, 'index'])->name('users.index');
            Route::get('users/{user}', [UserAdminController::class, 'show'])->name('users.show');
            Route::patch('users/{user}', [UserAdminController::class, 'update'])->name('users.update');
            Route::post('users/{user}/reset-mfa', [UserAdminController::class, 'resetMfa'])->name('users.reset-mfa');

            Route::get('subscriptions', [SubscriptionAdminController::class, 'index'])->name('subscriptions.index');
            Route::patch('subscriptions/{subscription}', [SubscriptionAdminController::class, 'update'])->name('subscriptions.update');

            Route::get('website', [SiteContentController::class, 'index'])->name('website.index');
            Route::put('website/{key}', [SiteContentController::class, 'update'])->name('website.update');
            Route::delete('website/{key}', [SiteContentController::class, 'destroy'])->name('website.reset');
        });
    });
});
