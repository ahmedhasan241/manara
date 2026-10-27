<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\CourseReview;
use App\Models\CourseSection;
use App\Models\Lecture;
use App\Models\LectureProgress;
use App\Models\Membership;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo course marketplace: a university, a medical school, independent
 * teachers and the demo school publishing self-paced courses, plus a learner
 * ("learner@educloud.test") who bought some. Safe to run more than once.
 * Every seeded account uses the password "password".
 */
class MarketplaceSeeder extends Seeder
{
    /**
     * Openly licensed sample videos (Blender Foundation films via the Internet
     * Archive and Blender, and an MDN CC0 clip), so the player has something to play.
     */
    private const array VIDEOS = [
        'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
        'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
        'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
        'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        'https://archive.org/download/Sintel/sintel-2048-surround_512kb.mp4',
    ];

    /**
     * Public profiles for the demo instructors: [headline, bio].
     *
     * @var array<string, array{0: string, 1: string}>
     */
    private const array PROFILES = [
        'karim@northfield.test' => ['Professor of Applied Mathematics', "I've taught calculus and statistics at Northfield for fifteen years. My courses start from the intuition, then build the maths step by step, with plenty of worked examples."],
        'elena@northfield.test' => ['Lecturer in Academic Writing', 'I help students turn good ideas into clear essays and reports. Expect short lessons, real examples and practical checklists you can use straight away.'],
        'sara@medica.test' => ['Emergency physician and clinical educator', 'I work in emergency medicine and teach first aid and clinical skills. My goal is to make life-saving knowledge simple, memorable and easy to practise.'],
        'lucia@rivera.test' => ['Product designer and design teacher', 'Twelve years designing apps and brands. I teach colour, layout and UX through small projects, so you finish every course with work you can show.'],
        'omar@codecraft.test' => ['Software engineer and startup mentor', 'I build web products and mentor first-time founders. My courses are hands-on: you write real code and plan real businesses from the first lesson.'],
    ];

    public function run(): void
    {
        $plan = Plan::orderBy('sort_order')->first();

        $publishers = [
            ['slug' => 'northfield', 'name' => 'Northfield University', 'type' => 'university', 'instructors' => [['Dr. Karim Haddad', 'karim@northfield.test'], ['Prof. Elena Petrova', 'elena@northfield.test']]],
            ['slug' => 'medica', 'name' => 'Medica School of Health', 'type' => 'university', 'instructors' => [['Dr. Sara Mansour', 'sara@medica.test']]],
            ['slug' => 'rivera-studio', 'name' => "Ms. Rivera's Design Studio", 'type' => 'teacher', 'instructors' => [['Lucia Rivera', 'lucia@rivera.test']]],
            ['slug' => 'codecraft', 'name' => 'CodeCraft with Omar', 'type' => 'teacher', 'instructors' => [['Omar Farouk', 'omar@codecraft.test']]],
        ];

        $instructors = [];
        foreach ($publishers as $publisher) {
            $tenant = Tenant::firstOrCreate(['slug' => $publisher['slug']], ['name' => $publisher['name'], 'type' => $publisher['type']]);
            if ($plan && ! $tenant->subscriptions()->exists()) {
                $tenant->subscriptions()->create(['plan_id' => $plan->id, 'status' => 'active', 'video_addon' => true, 'current_period_ends_at' => now()->addMonth()]);
            }
            foreach ($publisher['instructors'] as $i => [$name, $email]) {
                $user = User::firstOrCreate(['email' => $email], ['name' => $name, 'password' => 'password']);
                if (! $user->headline && isset(self::PROFILES[$email])) {
                    $user->update(['headline' => self::PROFILES[$email][0], 'bio' => self::PROFILES[$email][1]]);
                }
                Membership::withoutGlobalScopes()->firstOrCreate(['tenant_id' => $tenant->id, 'user_id' => $user->id], ['role' => $i === 0 ? Role::Owner : Role::Teacher]);
                $instructors[$email] = [$tenant, $user];
            }
        }

        $catalog = [
            ['karim@northfield.test', 'Calculus I: Limits to Integrals', 'Mathematics', 'beginner', 2999, 'Understand change and accumulation with clear visuals and practice.', ['Compute limits and derivatives', 'Solve optimisation problems', 'Integrate with substitution'], ['Basic algebra']],
            ['karim@northfield.test', 'Linear Algebra for Data Science', 'Mathematics', 'intermediate', 3999, 'Vectors, matrices and the maths behind machine learning.', ['Work with matrices and vectors', 'Understand eigenvalues', 'Apply PCA'], ['Calculus I']],
            ['elena@northfield.test', 'Introduction to Physics: Mechanics', 'Science', 'beginner', 0, 'Forces, motion and energy, explained with everyday examples.', ['Use Newton\'s laws', 'Solve energy problems', 'Analyse motion graphs'], []],
            ['elena@northfield.test', 'Academic Writing in English', 'Languages', 'all', 1999, 'Write essays and reports that are clear, structured and convincing.', ['Structure an argument', 'Cite sources properly', 'Edit your own writing'], []],
            ['sara@medica.test', 'Human Anatomy Essentials', 'Medicine', 'beginner', 4999, 'A guided tour of the body\'s systems for future health professionals.', ['Name the major organ systems', 'Read anatomical diagrams', 'Use medical terminology'], ['Interest in health sciences']],
            ['sara@medica.test', 'First Aid & Emergency Care', 'Medicine', 'all', 0, 'Life-saving skills everyone should know.', ['Perform CPR steps', 'Treat burns and bleeding', 'Know when to call for help'], []],
            ['lucia@rivera.test', 'UI/UX Design Foundations', 'Design', 'beginner', 2499, 'Design interfaces people love: research, wireframes and prototypes.', ['Run quick user research', 'Wireframe and prototype', 'Build a design system'], []],
            ['lucia@rivera.test', 'Colour Theory for Designers', 'Design', 'all', 1499, 'Pick palettes with confidence for screens and print.', ['Build harmonious palettes', 'Check contrast', 'Use colour to guide attention'], []],
            ['omar@codecraft.test', 'Web Development Bootcamp: HTML, CSS & JS', 'Development', 'beginner', 3499, 'Go from zero to your first live website.', ['Build responsive pages', 'Write modern JavaScript', 'Publish a website'], ['A computer and curiosity']],
            ['omar@codecraft.test', 'React & Next.js: Build Real Apps', 'Development', 'intermediate', 4499, 'Components, data fetching and deployment for modern web apps.', ['Build React components', 'Fetch data on the server', 'Deploy a Next.js app'], ['JavaScript basics']],
            ['omar@codecraft.test', 'Startup Business Basics', 'Business', 'all', 0, 'Validate an idea, find customers and plan your first year.', ['Validate an idea', 'Write a one-page plan', 'Price your product'], []],
        ];

        $courses = [];
        foreach ($catalog as $n => [$email, $title, $category, $level, $price, $subtitle, $outcomes, $requirements]) {
            [$tenant, $teacher] = $instructors[$email];
            $slug = str($title)->slug()->limit(60, '')->toString();
            $course = Course::withoutGlobalScopes()->firstOrCreate(['slug' => $slug], [
                'tenant_id' => $tenant->id,
                'code' => strtoupper(substr($category, 0, 3)).'-'.(200 + $n),
                'title' => $title,
                'description' => "{$subtitle} Self-paced lectures, short quizzes in every section and lifetime access. Taught by {$teacher->name} at {$tenant->name}.",
                'category' => $category,
                'teacher_id' => $teacher->id,
                'is_public' => true,
                'marketplace_status' => 'published',
                'subtitle' => $subtitle,
                'level' => $level,
                'language' => 'en',
                'price_cents' => $price,
                'outcomes' => $outcomes,
                'requirements' => $requirements,
                'marketplace_published_at' => now()->subDays(30 - $n * 2),
            ]);
            $courses[] = $course;

            if (! CourseSection::withoutGlobalScopes()->where('course_id', $course->id)->exists()) {
                foreach (['Getting started', 'Core ideas', 'Practice & projects'] as $s => $sectionTitle) {
                    $section = CourseSection::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => $sectionTitle, 'position' => $s + 1]);
                    foreach (range(1, $s === 0 ? 2 : 3) as $l) {
                        $article = $s === 2 && $l === 3;
                        Lecture::create([
                            'tenant_id' => $tenant->id,
                            'course_id' => $course->id,
                            'section_id' => $section->id,
                            'title' => match (true) {
                                $s === 0 && $l === 1 => 'Welcome and how this course works',
                                $s === 0 => 'Setting up for success',
                                $article => 'Summary notes and next steps',
                                default => "{$sectionTitle}: part {$l}",
                            },
                            'type' => $article ? 'article' : 'video',
                            'video_url' => $article ? null : self::VIDEOS[($n + $s + $l) % count(self::VIDEOS)],
                            'body' => $article ? "## Key takeaways\n\n- Review each lecture's main idea.\n- Try the practice project before moving on.\n- Ask questions in the course messages.\n\nGreat work finishing this section!" : null,
                            'duration_seconds' => $article ? 300 : (6 + (($n * 7 + $s * 3 + $l) % 14)) * 60,
                            'is_preview' => $s === 0 && $l === 1,
                            'position' => $l,
                        ]);
                    }
                }
            }
        }

        // Learners with reviews, and the demo learner who bought a few courses.
        $reviewers = collect(['Amira Saleh', 'Daniel Kim', 'Fatima Noor', 'Lucas Martin', 'Priya Shah', 'Yusuf Ali'])
            ->map(fn (string $name) => User::firstOrCreate(['email' => str($name)->lower()->replace(' ', '.').'@learners.test'], ['name' => $name, 'password' => 'password']));
        $comments = ['Clear, friendly and well structured.', 'Exactly what I needed for my exams.', 'Great examples, I finally get it!', 'Practical and to the point.', 'Loved the projects at the end.', null];
        foreach ($courses as $c => $course) {
            foreach ($reviewers->take(3 + $c % 4) as $r => $reviewer) {
                CourseAccess::firstOrCreate(['user_id' => $reviewer->id, 'course_id' => $course->id], ['tenant_id' => $course->tenant_id, 'source' => $course->price_cents ? 'purchase' : 'free']);
                CourseReview::withoutGlobalScopes()->firstOrCreate(
                    ['course_id' => $course->id, 'user_id' => $reviewer->id],
                    ['tenant_id' => $course->tenant_id, 'rating' => [5, 5, 4, 5, 4, 3][($c + $r) % 6], 'comment' => $comments[($c + $r) % 6]],
                );
            }
        }

        $learner = User::firstOrCreate(['email' => 'learner@educloud.test'], ['name' => 'Layla Learner', 'password' => 'password']);
        foreach ([$courses[0], $courses[6], $courses[8]] as $i => $course) {
            if (CourseAccess::where('user_id', $learner->id)->where('course_id', $course->id)->exists()) {
                continue;
            }
            $order = Order::create(['user_id' => $learner->id, 'number' => 'MN-'.strtoupper(Str::random(8)), 'status' => 'paid', 'subtotal_cents' => $course->price_cents, 'total_cents' => $course->price_cents, 'currency' => 'USD', 'provider' => 'test', 'provider_reference' => 'seed', 'paid_at' => now()->subDays(10 - $i)]);
            $order->items()->create(['course_id' => $course->id, 'tenant_id' => $course->tenant_id, 'title' => $course->title, 'price_cents' => $course->price_cents]);
            CourseAccess::create(['user_id' => $learner->id, 'course_id' => $course->id, 'tenant_id' => $course->tenant_id, 'source' => 'purchase', 'order_id' => $order->id, 'last_viewed_at' => now()->subDays($i)]);
            // Some progress so "Continue learning" has something to show.
            Lecture::withoutGlobalScopes()->where('course_id', $course->id)->orderBy('section_id')->orderBy('position')->take(3 - $i)->get()
                ->each(fn (Lecture $l) => LectureProgress::create(['user_id' => $learner->id, 'course_id' => $course->id, 'lecture_id' => $l->id, 'completed_at' => now()->subDays(2)]));
        }

        // The demo school shares its Mathematics class as a free public course too.
        $maths = Course::withoutGlobalScopes()->where('title', 'Mathematics')->first();
        if ($maths && ! $maths->is_public) {
            $maths->update(['is_public' => true, 'slug' => 'greenwood-mathematics', 'subtitle' => 'Greenwood High\'s maths class, open to everyone.', 'price_cents' => 0, 'level' => 'beginner']);
            $section = CourseSection::create(['tenant_id' => $maths->tenant_id, 'course_id' => $maths->id, 'title' => 'Algebra refresher', 'position' => 1]);
            Lecture::create(['tenant_id' => $maths->tenant_id, 'course_id' => $maths->id, 'section_id' => $section->id, 'title' => 'Equations in 10 minutes', 'type' => 'video', 'video_url' => self::VIDEOS[2], 'duration_seconds' => 600, 'is_preview' => true, 'position' => 1]);
            $maths->update(['marketplace_status' => 'published', 'marketplace_published_at' => now()]);
        }
    }
}
