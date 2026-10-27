<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\AcademicLevel;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassGroup;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Grade;
use App\Models\LiveLesson;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use Database\Factories\TenantFactory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * School and university structure for the demo: Greenwood High gets Grade 10
 * with two classes and lesson plans for its online lessons, and a small demo
 * university (Nile University) shows credit hours, GPA and professors.
 * Safe to run again: workspaces that already have levels are skipped.
 */
class AcademicSeeder extends Seeder
{
    public function run(): void
    {
        $this->greenwood();
        $this->university();
    }

    private function greenwood(): void
    {
        $tenant = Tenant::where('slug', 'greenwood')->first();
        if (! $tenant || AcademicLevel::withoutGlobalScopes()->where('tenant_id', $tenant->id)->exists()) {
            return;
        }

        $teacher = User::where('email', 'teacher@greenwood.test')->first();
        $level = $this->level($tenant, 'secondary', 'Grade 10', null, 0);
        $this->level($tenant, 'secondary', 'Grade 11', null, 1);
        $this->level($tenant, 'preparatory', 'Grade 9', null, -1);
        $a = $this->group($tenant, $level, '10-A', $teacher, 'Room 204');
        $b = $this->group($tenant, $level, '10-B', null, 'Room 206');

        $courses = Course::withoutGlobalScopes()->where('tenant_id', $tenant->id)->whereIn('title', ['Mathematics', 'Physics', 'Literature'])->get();
        $students = $courses->first()?->enrollments()->withoutGlobalScopes()->orderBy('student_id')->pluck('student_id') ?? collect();
        $this->place($tenant, $a, $students->take(8));
        $this->place($tenant, $b, $students->slice(8));

        $subjects = ['Mathematics' => ['Mathematics', 5], 'Physics' => ['Science', 4], 'Literature' => ['Arabic & English literature', 3]];
        foreach ($courses as $course) {
            [$subject, $periods] = $subjects[$course->title];
            $course->update(['subject' => $subject, 'academic_level_id' => $level->id, 'periods_per_week' => $periods, 'pass_percent' => 50]);
            $this->lessons($course, $teacher, $this->plans()[$course->title]);
        }
    }

    private function university(): void
    {
        if (Tenant::where('slug', 'nile-university')->exists()) {
            return;
        }

        $tenant = Tenant::create([
            'slug' => 'nile-university',
            'name' => 'Nile University',
            'type' => 'university',
            'site' => ['tagline' => 'Engineering the future.', 'about' => 'A private university with faculties of engineering, business and computer science.'],
        ]);
        if ($plan = Plan::where('code', 'university')->first()) {
            $tenant->subscriptions()->create(['plan_id' => $plan->id, 'status' => 'active', 'video_addon' => true, 'current_period_ends_at' => now()->addMonth()]);
        }

        TenantFactory::addMember($tenant, Role::Owner, User::factory()->create(['name' => 'Dean Nadia Farouk', 'email' => 'dean@nile.test']));
        $professor = TenantFactory::addMember($tenant, Role::Teacher, User::factory()->create(['name' => 'Dr. Karim Hassan', 'email' => 'professor@nile.test', 'headline' => 'Professor of Electrical Engineering']));
        $student = TenantFactory::addMember($tenant, Role::Student, User::factory()->create(['name' => 'Laila Mansour', 'email' => 'student@nile.test']));
        $students = collect([$student])->merge(User::factory(11)->create()->map(fn (User $u) => TenantFactory::addMember($tenant, Role::Student, $u)));

        $year1 = $this->level($tenant, 'undergraduate', 'Year 1', 'Faculty of Engineering', 0);
        $this->level($tenant, 'undergraduate', 'Year 2', 'Faculty of Engineering', 1);
        $this->level($tenant, 'postgraduate', 'Master’s – Year 1', 'Faculty of Engineering', 2);
        $g1 = $this->group($tenant, $year1, 'Section 1', $professor, 'Hall B-12');
        $g2 = $this->group($tenant, $year1, 'Section 2', $professor, 'Hall B-14');
        $this->place($tenant, $g1, $students->take(6)->pluck('id'));
        $this->place($tenant, $g2, $students->slice(6)->pluck('id'));

        foreach ([['EE-101', 'Circuit Analysis', 'Electrical engineering', 4], ['MATH-110', 'Calculus I', 'Mathematics', 3], ['ENG-105', 'Technical Writing', 'Humanities', 2]] as $i => [$code, $title, $subject, $credits]) {
            $course = Course::create([
                'tenant_id' => $tenant->id, 'code' => $code, 'title' => $title, 'subject' => $subject, 'term' => 'Fall 2026',
                'academic_level_id' => $year1->id, 'credit_hours' => $credits, 'periods_per_week' => $credits, 'pass_percent' => 60,
                'teacher_id' => $professor->id, 'description' => "{$title} for first-year engineering students.",
            ]);
            $students->each(fn (User $s) => $course->enrollments()->create(['tenant_id' => $tenant->id, 'student_id' => $s->id]));

            foreach ([['Assignment 1', 'assignment', 20, 1], ['Midterm exam', 'exam', 100, 3], ['Lab report', 'project', 30, 2]] as $w => [$name, $type, $max, $weight]) {
                $assessment = Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => $name, 'type' => $type, 'max_score' => $max, 'weight' => $weight, 'due_at' => now()->subWeeks(4 - $w), 'published_at' => now()->subWeeks(5 - $w)]);
                foreach ($students as $n => $s) {
                    // A spread from excellent to struggling, so rankings and warnings show.
                    $ratio = max(0.3, min(1.0, 0.98 - $n * 0.055 + fake()->randomFloat(2, -0.06, 0.06) - $i * 0.02));
                    Grade::create(['tenant_id' => $tenant->id, 'assessment_id' => $assessment->id, 'student_id' => $s->id, 'score' => round($max * $ratio, 1), 'graded_by' => $professor->id]);
                }
            }
            foreach (range(1, 8) as $week) {
                $session = ClassSession::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'starts_at' => now()->subWeeks(9 - $week)->setTime(10, 0), 'topic' => "Lecture {$week}"]);
                foreach ($students as $n => $s) {
                    $status = $n >= 10 && $week % 3 !== 0 ? 'absent' : fake()->randomElement(['present', 'present', 'present', 'present', 'late', $n > 7 ? 'absent' : 'present']);
                    Attendance::create(['tenant_id' => $tenant->id, 'class_session_id' => $session->id, 'student_id' => $s->id, 'status' => $status, 'recorded_by' => $professor->id]);
                }
            }
            $this->lessons($course, $professor, [
                ['Week 9: '.$title, 'Unit 4', ['Review the key ideas of unit 3', 'Work through three exam-style problems'], 'Problem set 4, questions 1–6.'],
                ['Office hours: '.$title, null, ['Answer questions before the final'], null],
            ]);
        }
    }

    private function level(Tenant $tenant, string $stage, string $name, ?string $department, int $position): AcademicLevel
    {
        return AcademicLevel::create(['tenant_id' => $tenant->id, 'stage' => $stage, 'name' => $name, 'department' => $department, 'position' => $position]);
    }

    private function group(Tenant $tenant, AcademicLevel $level, string $name, ?User $advisor, ?string $room): ClassGroup
    {
        return ClassGroup::create(['tenant_id' => $tenant->id, 'academic_level_id' => $level->id, 'name' => $name, 'advisor_id' => $advisor?->id, 'room' => $room, 'capacity' => 30]);
    }

    /**
     * @param  Collection<int, int>  $studentIds
     */
    private function place(Tenant $tenant, ClassGroup $group, Collection $studentIds): void
    {
        $group->students()->attach($studentIds->mapWithKeys(fn ($id) => [$id => ['tenant_id' => $tenant->id]])->all());
    }

    /**
     * Two taught lessons (with summary and homework) and the coming ones (one today).
     *
     * @param  list<array{0: string, 1: string|null, 2: list<string>, 3: string|null}>  $plans
     */
    private function lessons(Course $course, ?User $host, array $plans): void
    {
        foreach ($plans as $i => [$title, $unit, $objectives, $homework]) {
            $at = match ($i) {
                0 => now()->addHours(2 + LiveLesson::withoutGlobalScopes()->where('host_id', $host?->id)->where('status', 'scheduled')->where('scheduled_at', '<=', now()->endOfDay())->count())->startOfHour(),
                1 => now()->addDays(2)->setTime(10, 0),
                default => now()->addDays(2 + $i * 2)->setTime(10, 0),
            };
            LiveLesson::create([
                'tenant_id' => $course->tenant_id,
                'course_id' => $course->id,
                'host_id' => $host?->id,
                'title' => $title,
                'unit' => $unit,
                'objectives' => $objectives,
                'homework' => $homework,
                'homework_due_at' => $homework ? $at->copy()->addDays(5)->setTime(23, 59) : null,
                'resources' => [['title' => 'Lesson slides', 'url' => 'https://example.com/slides/'.Str::slug($title).'.pdf']],
                'scheduled_at' => $at,
                'duration_minutes' => 45,
                'status' => 'scheduled',
                'provider' => 'jitsi',
                'join_url' => 'https://meet.jit.si/educloud-'.Str::lower(Str::random(12)),
            ]);
        }

        // Earlier lessons that already happened.
        foreach (['Introduction and course map', 'Practice and review'] as $w => $title) {
            $at = now()->subWeeks(2 - $w)->setTime(10, 0);
            LiveLesson::create([
                'tenant_id' => $course->tenant_id, 'course_id' => $course->id, 'host_id' => $host?->id,
                'title' => "{$course->title}: {$title}", 'unit' => 'Unit 1',
                'objectives' => ['Recall the main ideas', 'Practise with worked examples'],
                'homework' => 'Finish the practice sheet.', 'summary' => 'We covered the main ideas and solved the worked examples together. Most students completed the practice in class.',
                'scheduled_at' => $at, 'started_at' => $at, 'ended_at' => $at->copy()->addMinutes(45), 'duration_minutes' => 45,
                'status' => 'ended', 'provider' => 'jitsi', 'join_url' => 'https://meet.jit.si/educloud-'.Str::lower(Str::random(12)),
            ]);
        }
    }

    /**
     * @return array<string, list<array{0: string, 1: string|null, 2: list<string>, 3: string|null}>>
     */
    private function plans(): array
    {
        return [
            'Mathematics' => [
                ['Quadratic equations', 'Unit 3: Algebra', ['Solve quadratics by factorising', 'Use the quadratic formula', 'Interpret the discriminant'], 'Exercise 3B, questions 1–12.'],
                ['Graphs of quadratics', 'Unit 3: Algebra', ['Sketch parabolas from their equation', 'Find the vertex and axis of symmetry'], 'Sketch the four graphs on the worksheet.'],
                ['Algebra review', 'Unit 3: Algebra', ['Prepare for the midterm project'], null],
            ],
            'Physics' => [
                ['Newton’s laws in action', 'Unit 2: Forces', ['State the three laws of motion', 'Draw free-body diagrams', 'Solve F = ma problems'], 'Read pages 54–60 and answer the review questions.'],
                ['Friction and motion', 'Unit 2: Forces', ['Compare static and kinetic friction'], 'Lab write-up: friction on an inclined plane.'],
            ],
            'Literature' => [
                ['Reading poetry closely', 'Unit 4: Poetry', ['Identify imagery and metaphor', 'Discuss the poem’s tone'], 'Write a 200-word response to the poem.'],
                ['Writing a literary essay', 'Unit 4: Poetry', ['Plan an essay with a clear thesis', 'Use quotations as evidence'], 'Draft your introduction paragraph.'],
            ],
        ];
    }
}
