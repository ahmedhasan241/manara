<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Assessment;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnlineExamTest extends TestCase
{
    use RefreshDatabase;

    /**
     * One question of every kind, worth 2 points each (18 in total).
     *
     * @return list<array<string, mixed>>
     */
    private function questions(): array
    {
        return [
            ['type' => 'single_choice', 'prompt' => 'Capital of France?', 'points' => 2, 'options' => [['id' => 'a', 'text' => 'Paris'], ['id' => 'b', 'text' => 'Rome']], 'answer' => ['correct' => 'a'], 'explanation' => 'Paris has been the capital since 987.'],
            ['type' => 'multiple_choice', 'prompt' => 'Prime numbers?', 'points' => 2, 'options' => [['id' => 'a', 'text' => '2'], ['id' => 'b', 'text' => '3'], ['id' => 'c', 'text' => '4']], 'answer' => ['correct' => ['a', 'b']]],
            ['type' => 'true_false', 'prompt' => 'Water boils at 100°C at sea level.', 'points' => 2, 'answer' => ['correct' => true]],
            ['type' => 'short_answer', 'prompt' => 'Chemical symbol for gold?', 'points' => 2, 'answer' => ['accepted' => ['Au']]],
            ['type' => 'numeric', 'prompt' => 'Value of pi to two decimals?', 'points' => 2, 'answer' => ['value' => 3.14, 'tolerance' => 0.01]],
            ['type' => 'fill_blanks', 'prompt' => 'The [[blank]] is the largest planet; [[blank]] is closest to the Sun.', 'points' => 2, 'answer' => ['blanks' => [['Jupiter'], ['Mercury']]]],
            ['type' => 'ordering', 'prompt' => 'Order from smallest.', 'points' => 2, 'options' => ['items' => [['id' => 'x', 'text' => 'Atom'], ['id' => 'y', 'text' => 'Cell'], ['id' => 'z', 'text' => 'Organ']]], 'answer' => ['order' => ['x', 'y', 'z']]],
            ['type' => 'matching', 'prompt' => 'Match countries and capitals.', 'points' => 2, 'options' => ['left' => [['id' => 'eg', 'text' => 'Egypt'], ['id' => 'jp', 'text' => 'Japan']], 'right' => [['id' => 'cai', 'text' => 'Cairo'], ['id' => 'tok', 'text' => 'Tokyo']]], 'answer' => ['pairs' => ['eg' => 'cai', 'jp' => 'tok']]],
            ['type' => 'essay', 'prompt' => 'Why do seasons happen?', 'points' => 2, 'answer' => ['rubric' => 'Mentions axial tilt.']],
        ];
    }

    /**
     * @return array{0: Tenant, 1: Course, 2: Assessment, 3: User, 4: User, 5: User}
     */
    private function exam(array $settings = []): array
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 2);
        [$amal, $omar] = $course->students()->get()->all();
        $teacher = $this->member($tenant, Role::Teacher);
        $assessment = $course->assessments()->create(['tenant_id' => $tenant->id, 'title' => 'Unit test', 'type' => 'quiz', 'published_at' => now()]);

        $this->asMember($teacher, $tenant, 'PUT', "/api/v1/assessments/{$assessment->id}/exam", [
            'max_attempts' => 2,
            'results_visibility' => 'immediately',
            'questions' => $this->questions(),
            ...$settings,
        ])->assertOk();

        return [$tenant, $course, $assessment->refresh(), $teacher, $amal, $omar];
    }

    public function test_teachers_build_an_exam_with_every_question_type(): void
    {
        [$tenant, , $assessment, $teacher] = $this->exam();

        $this->assertTrue($assessment->is_online);
        $this->assertSame('18.00', $assessment->max_score);
        $this->asMember($teacher, $tenant, 'GET', "/api/v1/assessments/{$assessment->id}/exam")
            ->assertOk()
            ->assertJsonCount(9, 'questions')
            ->assertJsonPath('questions.0.answer.correct', 'a');

        // A choice question without a correct answer is refused.
        $this->asMember($teacher, $tenant, 'PUT', "/api/v1/assessments/{$assessment->id}/exam", [
            'max_attempts' => 1,
            'results_visibility' => 'immediately',
            'questions' => [['type' => 'single_choice', 'prompt' => 'Pick', 'points' => 1, 'options' => [['id' => 'a', 'text' => 'A'], ['id' => 'b', 'text' => 'B']], 'answer' => []]],
        ])->assertUnprocessable()->assertJsonValidationErrors('questions.0');
    }

    public function test_students_take_an_exam_that_is_marked_and_recorded(): void
    {
        [$tenant, , $assessment, $teacher, $amal] = $this->exam();
        $ids = $assessment->questions()->pluck('id', 'type');

        $this->asMember($amal, $tenant, 'GET', "/api/v1/assessments/{$assessment->id}/exam/overview")
            ->assertOk()->assertJsonPath('can_start', true)->assertJsonPath('question_count', 9);

        $attempt = $this->asMember($amal, $tenant, 'POST', "/api/v1/assessments/{$assessment->id}/attempts")
            ->assertCreated()
            ->assertJsonMissingPath('questions.0.answer')
            ->json();

        // Autosave keeps answers while the attempt runs.
        $this->asMember($amal, $tenant, 'PATCH', "/api/v1/exam-attempts/{$attempt['id']}", ['answers' => [$ids['single_choice'] => 'a']])->assertOk();

        $answers = [
            $ids['single_choice'] => 'a',                       // right: 2
            $ids['multiple_choice'] => ['a', 'c'],              // one right, one wrong: 0
            $ids['true_false'] => true,                         // right: 2
            $ids['short_answer'] => '  au ',                    // case and spaces ignored: 2
            $ids['numeric'] => '3,141',                         // comma decimal, within tolerance: 2
            $ids['fill_blanks'] => ['jupiter', 'Venus'],        // half: 1
            $ids['ordering'] => ['x', 'z', 'y'],                // one in place: 0.67
            $ids['matching'] => ['eg' => 'cai', 'jp' => 'tok'], // right: 2
            $ids['essay'] => 'Because the Earth is tilted.',    // waits for the teacher
        ];

        $result = $this->asMember($amal, $tenant, 'POST', "/api/v1/exam-attempts/{$attempt['id']}/submit", ['answers' => $answers])
            ->assertOk()
            ->assertJsonPath('status', 'needs_review')
            ->assertJsonPath('results_visible', true)
            ->assertJsonPath('questions.0.explanation', 'Paris has been the capital since 987.')
            ->json();

        $byId = collect($result['questions'])->keyBy('id');
        $this->assertSame('correct', $byId[$ids['short_answer']]['result']['outcome']);
        $this->assertSame('partial', $byId[$ids['fill_blanks']]['result']['outcome']);
        $this->assertSame('incorrect', $byId[$ids['multiple_choice']]['result']['outcome']);
        $this->assertSame('pending', $byId[$ids['essay']]['result']['outcome']);
        $this->assertNull($byId[$ids['essay']]['answer'], 'The essay rubric is for teachers only.');
        $this->assertEquals(11.67, $result['score']);

        // Not in the gradebook until the essay is marked.
        $this->assertNull(Grade::where('student_id', $amal->id)->first());

        $this->asMember($teacher, $tenant, 'GET', "/api/v1/assessments/{$assessment->id}/attempts")->assertJsonPath('0.status', 'needs_review');
        $this->asMember($teacher, $tenant, 'PATCH', "/api/v1/exam-attempts/{$attempt['id']}/review", ['points' => [$ids['essay'] => 1.5], 'feedback' => 'Good start.'])
            ->assertOk()
            ->assertJsonPath('status', 'graded')
            ->assertJsonPath('score', '13.17');

        $this->assertSame('13.17', Grade::where('student_id', $amal->id)->value('score'));
        $this->asMember($amal, $tenant, 'GET', "/api/v1/exam-attempts/{$attempt['id']}")->assertJsonPath('feedback', 'Good start.');
    }

    public function test_attempts_limits_time_limits_and_privacy(): void
    {
        [$tenant, , $assessment, , $amal, $omar] = $this->exam(['time_limit_minutes' => 10, 'results_visibility' => 'never', 'max_attempts' => 1]);

        $attempt = $this->asMember($amal, $tenant, 'POST', "/api/v1/assessments/{$assessment->id}/attempts")->assertCreated()->json();

        // Classmates can't open someone else's attempt.
        $this->asMember($omar, $tenant, 'GET', "/api/v1/exam-attempts/{$attempt['id']}")->assertNotFound();

        // Past the time limit the attempt is handed in automatically.
        $this->travel(11)->minutes();
        $this->asMember($amal, $tenant, 'GET', "/api/v1/exam-attempts/{$attempt['id']}")
            ->assertOk()
            ->assertJsonPath('results_visible', false)
            ->assertJsonPath('score', null)
            ->assertJsonMissingPath('questions.0.answer');
        $this->assertNotSame('in_progress', $assessment->attempts()->first()->status);

        // One attempt only.
        $this->asMember($amal, $tenant, 'POST', "/api/v1/assessments/{$assessment->id}/attempts")->assertUnprocessable();
        $this->asMember($amal, $tenant, 'GET', "/api/v1/assessments/{$assessment->id}/exam/overview")->assertJsonPath('can_start', false)->assertJsonPath('attempts_left', 0);
    }
}
