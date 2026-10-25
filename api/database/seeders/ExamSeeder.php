<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * A published online exam in each Greenwood course, using every question
 * type, so the exam builder and the student exam can be tried right away.
 * Safe to run again: courses that already have it are skipped.
 */
class ExamSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'greenwood')->first();
        if (! $tenant) {
            return;
        }

        foreach (Course::withoutGlobalScopes()->where('tenant_id', $tenant->id)->whereIn('title', array_keys($this->banks()))->get() as $course) {
            $exists = Assessment::withoutGlobalScopes()->where('course_id', $course->id)->where('title', 'Online check-in')->exists();
            if ($exists) {
                continue;
            }

            $questions = $this->banks()[$course->title];
            $assessment = Assessment::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'course_id' => $course->id,
                'title' => 'Online check-in',
                'type' => 'quiz',
                'is_online' => true,
                'time_limit_minutes' => 20,
                'max_attempts' => 2,
                'shuffle_questions' => false,
                'results_visibility' => 'immediately',
                'instructions' => 'Answer every question. Your work is saved as you go, and you can come back to any question before handing in.',
                'max_score' => collect($questions)->sum('points'),
                'weight' => 1,
                'due_at' => now()->addDays(7)->setTime(23, 59),
                'published_at' => now(),
            ]);

            foreach ($questions as $position => $question) {
                $assessment->questions()->create(['tenant_id' => $tenant->id, 'position' => $position, ...$question]);
            }
        }
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function banks(): array
    {
        return [
            'Mathematics' => [
                ['type' => 'single_choice', 'prompt' => 'What is 7 × 8?', 'points' => 1, 'options' => [['id' => 'a', 'text' => '54'], ['id' => 'b', 'text' => '56'], ['id' => 'c', 'text' => '64'], ['id' => 'd', 'text' => '48']], 'answer' => ['correct' => 'b'], 'explanation' => '7 × 8 = 56.'],
                ['type' => 'multiple_choice', 'prompt' => 'Which of these numbers are prime?', 'points' => 2, 'options' => [['id' => 'a', 'text' => '2'], ['id' => 'b', 'text' => '9'], ['id' => 'c', 'text' => '11'], ['id' => 'd', 'text' => '15']], 'answer' => ['correct' => ['a', 'c']], 'explanation' => '9 = 3 × 3 and 15 = 3 × 5 are not prime.'],
                ['type' => 'true_false', 'prompt' => 'The angles of a triangle always add up to 180°.', 'points' => 1, 'answer' => ['correct' => true]],
                ['type' => 'numeric', 'prompt' => 'Solve for x: 3x + 5 = 20', 'points' => 2, 'answer' => ['value' => 5, 'tolerance' => 0], 'explanation' => '3x = 15, so x = 5.'],
                ['type' => 'short_answer', 'prompt' => 'What do we call a polygon with six sides?', 'points' => 1, 'answer' => ['accepted' => ['hexagon']]],
                ['type' => 'fill_blanks', 'prompt' => 'The area of a rectangle is length × [[blank]], and the area of a circle is π × [[blank]]².', 'points' => 2, 'answer' => ['blanks' => [['width', 'breadth'], ['radius', 'r']]]],
                ['type' => 'ordering', 'prompt' => 'Put these numbers in order, from smallest to largest.', 'points' => 2, 'options' => ['items' => [['id' => 'p', 'text' => '0.5'], ['id' => 'q', 'text' => '¾'], ['id' => 'r', 'text' => '1.2'], ['id' => 's', 'text' => '⅓']]], 'answer' => ['order' => ['s', 'p', 'q', 'r']]],
                ['type' => 'matching', 'prompt' => 'Match each shape with its number of sides.', 'points' => 2, 'options' => ['left' => [['id' => 'tri', 'text' => 'Triangle'], ['id' => 'pen', 'text' => 'Pentagon'], ['id' => 'oct', 'text' => 'Octagon']], 'right' => [['id' => '3', 'text' => '3 sides'], ['id' => '5', 'text' => '5 sides'], ['id' => '8', 'text' => '8 sides']]], 'answer' => ['pairs' => ['tri' => '3', 'pen' => '5', 'oct' => '8']]],
                ['type' => 'essay', 'prompt' => 'Explain, in your own words, why dividing by zero is not allowed.', 'points' => 3, 'answer' => ['rubric' => 'Links division to multiplication; notes no number times 0 gives a non-zero result.']],
            ],
            'Physics' => [
                ['type' => 'single_choice', 'prompt' => 'What is the SI unit of force?', 'points' => 1, 'options' => [['id' => 'a', 'text' => 'Joule'], ['id' => 'b', 'text' => 'Newton'], ['id' => 'c', 'text' => 'Watt']], 'answer' => ['correct' => 'b']],
                ['type' => 'multiple_choice', 'prompt' => 'Which of these are forms of energy?', 'points' => 2, 'options' => [['id' => 'a', 'text' => 'Kinetic'], ['id' => 'b', 'text' => 'Potential'], ['id' => 'c', 'text' => 'Velocity'], ['id' => 'd', 'text' => 'Thermal']], 'answer' => ['correct' => ['a', 'b', 'd']], 'explanation' => 'Velocity is a quantity of motion, not a form of energy.'],
                ['type' => 'true_false', 'prompt' => 'Sound travels faster than light.', 'points' => 1, 'answer' => ['correct' => false]],
                ['type' => 'numeric', 'prompt' => 'A car travels 120 km in 2 hours. What is its average speed in km/h?', 'points' => 2, 'answer' => ['value' => 60, 'tolerance' => 0]],
                ['type' => 'short_answer', 'prompt' => 'Which scientist described the three laws of motion?', 'points' => 1, 'answer' => ['accepted' => ['Newton', 'Isaac Newton', 'Sir Isaac Newton']]],
                ['type' => 'fill_blanks', 'prompt' => 'Speed equals [[blank]] divided by [[blank]].', 'points' => 2, 'answer' => ['blanks' => [['distance'], ['time']]]],
                ['type' => 'ordering', 'prompt' => 'Order the planets by distance from the Sun.', 'points' => 2, 'options' => ['items' => [['id' => 'e', 'text' => 'Earth'], ['id' => 'm', 'text' => 'Mercury'], ['id' => 'j', 'text' => 'Jupiter'], ['id' => 'v', 'text' => 'Venus']]], 'answer' => ['order' => ['m', 'v', 'e', 'j']]],
                ['type' => 'matching', 'prompt' => 'Match each quantity with its unit.', 'points' => 2, 'options' => ['left' => [['id' => 'mass', 'text' => 'Mass'], ['id' => 'time', 'text' => 'Time'], ['id' => 'current', 'text' => 'Electric current']], 'right' => [['id' => 'kg', 'text' => 'Kilogram'], ['id' => 's', 'text' => 'Second'], ['id' => 'A', 'text' => 'Ampere']]], 'answer' => ['pairs' => ['mass' => 'kg', 'time' => 's', 'current' => 'A']]],
                ['type' => 'essay', 'prompt' => 'Describe what happens to a ball\'s energy as it falls from a height.', 'points' => 3, 'answer' => ['rubric' => 'Potential energy turns into kinetic energy; mentions air resistance/heat.']],
            ],
            'Literature' => [
                ['type' => 'single_choice', 'prompt' => 'Who wrote "Romeo and Juliet"?', 'points' => 1, 'options' => [['id' => 'a', 'text' => 'Charles Dickens'], ['id' => 'b', 'text' => 'William Shakespeare'], ['id' => 'c', 'text' => 'Jane Austen']], 'answer' => ['correct' => 'b']],
                ['type' => 'multiple_choice', 'prompt' => 'Which of these are poetic devices?', 'points' => 2, 'options' => [['id' => 'a', 'text' => 'Alliteration'], ['id' => 'b', 'text' => 'Metaphor'], ['id' => 'c', 'text' => 'Paragraph'], ['id' => 'd', 'text' => 'Rhyme']], 'answer' => ['correct' => ['a', 'b', 'd']]],
                ['type' => 'true_false', 'prompt' => 'A haiku traditionally has three lines.', 'points' => 1, 'answer' => ['correct' => true]],
                ['type' => 'numeric', 'prompt' => 'How many lines does a sonnet have?', 'points' => 1, 'answer' => ['value' => 14, 'tolerance' => 0]],
                ['type' => 'short_answer', 'prompt' => 'What is the main character of a story called?', 'points' => 1, 'answer' => ['accepted' => ['protagonist', 'the protagonist', 'hero']]],
                ['type' => 'fill_blanks', 'prompt' => 'A story\'s [[blank]] is where and when it happens; its [[blank]] is the sequence of events.', 'points' => 2, 'answer' => ['blanks' => [['setting'], ['plot']]]],
                ['type' => 'ordering', 'prompt' => 'Order the parts of a classic plot.', 'points' => 2, 'options' => ['items' => [['id' => 'c', 'text' => 'Climax'], ['id' => 'e', 'text' => 'Exposition'], ['id' => 'r', 'text' => 'Resolution'], ['id' => 'a', 'text' => 'Rising action']]], 'answer' => ['order' => ['e', 'a', 'c', 'r']]],
                ['type' => 'matching', 'prompt' => 'Match each author with a book.', 'points' => 2, 'options' => ['left' => [['id' => 'orw', 'text' => 'George Orwell'], ['id' => 'aus', 'text' => 'Jane Austen'], ['id' => 'mah', 'text' => 'Naguib Mahfouz']], 'right' => [['id' => '1984', 'text' => '1984'], ['id' => 'pp', 'text' => 'Pride and Prejudice'], ['id' => 'cai', 'text' => 'The Cairo Trilogy']]], 'answer' => ['pairs' => ['orw' => '1984', 'aus' => 'pp', 'mah' => 'cai']]],
                ['type' => 'essay', 'prompt' => 'Choose a book you enjoyed and explain what makes its main character memorable.', 'points' => 3, 'answer' => ['rubric' => 'Names the book and character; gives two specific reasons with examples.']],
            ],
        ];
    }
}
