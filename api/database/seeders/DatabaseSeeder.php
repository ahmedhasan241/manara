<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use Database\Factories\TenantFactory;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed plans, a platform admin and one demo school with courses, grades and attendance.
     * Every seeded account uses the password "password".
     */
    public function run(): void
    {
        $plans = collect([
            ['code' => 'teacher', 'name' => 'Teacher', 'description' => 'For one educator and their classes.', 'max_students' => 150, 'max_staff' => 1, 'storage_gb' => 10, 'features' => ['Gradebook', 'Attendance', 'Course materials', 'Announcements', 'Mobile app'], 'sort_order' => 1],
            ['code' => 'school', 'name' => 'School', 'description' => 'For schools with many teachers.', 'max_students' => 1500, 'max_staff' => 120, 'storage_gb' => 200, 'features' => ['Everything in Teacher', 'Parent accounts', 'Public school website', 'Reports and exports', 'Required MFA'], 'sort_order' => 2],
            ['code' => 'university', 'name' => 'University', 'description' => 'For universities and large institutions.', 'max_students' => null, 'max_staff' => null, 'storage_gb' => 2000, 'features' => ['Everything in School', 'Custom domain', 'SSO', 'Dedicated support', 'Data residency'], 'sort_order' => 3],
        ])->map(fn (array $plan) => tap(Plan::updateOrCreate(['code' => $plan['code']], [...$plan, 'translations' => Plan::defaultTranslations($plan['code'])]))->applyDefaultPricing());

        User::factory()->create([
            'name' => 'Platform Admin',
            'email' => 'admin@educloud.test',
            'is_platform_admin' => true,
        ]);

        $tenant = Tenant::create([
            'slug' => 'greenwood',
            'name' => 'Greenwood High School',
            'type' => 'school',
            'site' => [
                'tagline' => 'Curious minds, kind hearts.',
                'about' => 'Greenwood High is a public secondary school serving 900 students.',
                'contact_email' => 'office@greenwood.test',
                'programs' => [
                    ['title' => 'Sciences', 'description' => 'Physics, chemistry and biology with lab work every week.'],
                    ['title' => 'Humanities', 'description' => 'History, literature and languages.'],
                    ['title' => 'Computing', 'description' => 'Programming and digital skills from year 7.'],
                ],
            ],
        ]);
        $tenant->subscriptions()->create(['plan_id' => $plans[1]->id, 'status' => 'active', 'video_addon' => true, 'current_period_ends_at' => now()->addMonth()]);

        TenantFactory::addMember($tenant, Role::Owner, User::factory()->create(['name' => 'Olivia Owner', 'email' => 'owner@greenwood.test']));
        $teacher = TenantFactory::addMember($tenant, Role::Teacher, User::factory()->create(['name' => 'Tom Teacher', 'email' => 'teacher@greenwood.test']));
        $student = TenantFactory::addMember($tenant, Role::Student, User::factory()->create(['name' => 'Sara Student', 'email' => 'student@greenwood.test']));
        TenantFactory::addMember($tenant, Role::Parent, User::factory()->create(['name' => 'Paul Parent', 'email' => 'parent@greenwood.test']), ['guardian_of_id' => $student->id]);

        $students = collect([$student])->merge(
            User::factory(14)->create()->map(fn (User $user) => TenantFactory::addMember($tenant, Role::Student, $user))
        );

        foreach (['Mathematics' => 'Mathematics', 'Physics' => 'Science', 'Literature' => 'Languages'] as $title => $category) {
            $index = array_search($title, ['Mathematics', 'Physics', 'Literature'], true);
            $course = Course::factory()->create([
                'tenant_id' => $tenant->id,
                'code' => strtoupper(substr($title, 0, 4)).'-10'.$index,
                'title' => $title,
                'category' => $category,
                'teacher_id' => $teacher->id,
            ]);
            $students->each(fn (User $s) => $course->enrollments()->create(['tenant_id' => $tenant->id, 'student_id' => $s->id]));

            // A few star ratings, and one assessment still to come for the calendar.
            $students->take(6)->each(fn (User $s) => $course->reviews()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $s->id,
                'rating' => fake()->randomElement([5, 5, 4, 4, 3]),
                'comment' => fake()->randomElement(['Clear explanations and great pace.', 'The recordings help a lot before exams.', 'Challenging but fair.', null]),
            ]));
            Assessment::create([
                'tenant_id' => $tenant->id,
                'course_id' => $course->id,
                'title' => 'Midterm project',
                'type' => 'project',
                'max_score' => 100,
                'weight' => 3,
                'due_at' => now()->addDays(5 + $index * 3)->setTime(17, 0),
                'published_at' => now(),
            ]);

            foreach (range(1, 4) as $week) {
                $assessment = Assessment::create([
                    'tenant_id' => $tenant->id,
                    'course_id' => $course->id,
                    'title' => "Quiz {$week}",
                    'type' => 'quiz',
                    'max_score' => 20,
                    'due_at' => now()->subWeeks(5 - $week),
                    'published_at' => now()->subWeeks(5 - $week),
                ]);
                $session = ClassSession::create([
                    'tenant_id' => $tenant->id,
                    'course_id' => $course->id,
                    'starts_at' => now()->subWeeks(5 - $week)->setTime(9, 0),
                    'topic' => "Week {$week}",
                ]);

                foreach ($students as $s) {
                    Grade::create(['tenant_id' => $tenant->id, 'assessment_id' => $assessment->id, 'student_id' => $s->id, 'score' => fake()->numberBetween(9, 20), 'graded_by' => $teacher->id]);
                    Attendance::create(['tenant_id' => $tenant->id, 'class_session_id' => $session->id, 'student_id' => $s->id, 'status' => fake()->randomElement(['present', 'present', 'present', 'present', 'late', 'absent']), 'recorded_by' => $teacher->id]);
                }
            }
        }

        $this->call(MarketplaceSeeder::class);
        $this->call(ExamSeeder::class);
        $this->call(AcademicSeeder::class);
    }
}
