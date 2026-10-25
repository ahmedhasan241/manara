<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Models\Assessment;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Models\User;
use App\Services\AcademicRecords;
use App\Services\ExamGrader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Online exams on top of assessments. Teachers write the questions and
 * review essays; students sit timed attempts that are marked straight away
 * and recorded in the gradebook (best attempt counts).
 */
class ExamController extends TenantController
{
    public function __construct(private ExamGrader $grader, private AcademicRecords $records) {}

    /**
     * The exam with its answer key, for the teacher's builder.
     */
    public function show(Assessment $assessment): JsonResponse
    {
        Gate::authorize('grades.write');

        $attempts = $assessment->attempts()->whereNotNull('submitted_at')->get(['score', 'max_score', 'status']);

        return response()->json([
            ...$this->settings($assessment),
            'questions' => $assessment->questions()->get(),
            'stats' => [
                'submitted' => $attempts->count(),
                'needs_review' => $attempts->where('status', 'needs_review')->count(),
                'average' => $attempts->whereNotNull('score')->isEmpty() ? null : round((float) $attempts->whereNotNull('score')->avg('score'), 2),
            ],
        ]);
    }

    /**
     * Saves the settings and the whole question list at once (the builder
     * sends everything). The assessment's maximum becomes the total points.
     */
    public function save(Request $request, Assessment $assessment): JsonResponse
    {
        Gate::authorize('grades.write');

        $data = $request->validate([
            'time_limit_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'max_attempts' => ['required', 'integer', 'min:1', 'max:10'],
            'shuffle_questions' => ['boolean'],
            'results_visibility' => ['required', Rule::in(['immediately', 'after_due', 'never'])],
            'instructions' => ['nullable', 'string', 'max:5000'],
            'questions' => ['required', 'array', 'min:1', 'max:200'],
            'questions.*.id' => ['nullable', 'uuid'],
            'questions.*.type' => ['required', Rule::in(ExamQuestion::TYPES)],
            'questions.*.prompt' => ['required', 'string', 'max:5000'],
            'questions.*.points' => ['required', 'numeric', 'min:0', 'max:1000'],
            'questions.*.options' => ['nullable', 'array'],
            'questions.*.answer' => ['nullable', 'array'],
            'questions.*.explanation' => ['nullable', 'string', 'max:5000'],
        ]);

        foreach ($data['questions'] as $i => $question) {
            $this->validateQuestion($question, "questions.$i");
        }

        DB::transaction(function () use ($assessment, $data) {
            $keep = [];
            foreach (array_values($data['questions']) as $position => $input) {
                $question = $assessment->questions()->updateOrCreate(
                    ['id' => $input['id'] ?? (string) str()->uuid()],
                    [
                        'position' => $position,
                        'type' => $input['type'],
                        'prompt' => $input['prompt'],
                        'points' => $input['points'],
                        'options' => $input['options'] ?? null,
                        'answer' => $input['answer'] ?? null,
                        'explanation' => $input['explanation'] ?? null,
                    ],
                );
                $keep[] = $question->id;
            }
            $assessment->questions()->whereNotIn('id', $keep)->delete();

            $total = (float) collect($data['questions'])->sum('points');
            $assessment->update([
                'is_online' => true,
                'time_limit_minutes' => $data['time_limit_minutes'] ?? null,
                'max_attempts' => $data['max_attempts'],
                'shuffle_questions' => $data['shuffle_questions'] ?? false,
                'results_visibility' => $data['results_visibility'],
                'instructions' => $data['instructions'] ?? null,
                ...($total > 0 ? ['max_score' => $total] : []),
            ]);
        });

        return $this->show($assessment->refresh());
    }

    /**
     * Every submitted or running attempt, for the teacher's results table.
     */
    public function attempts(Assessment $assessment): JsonResponse
    {
        Gate::authorize('grades.write');

        return response()->json($assessment->attempts()
            ->with('student:id,name')
            ->latest('started_at')
            ->get()
            ->map(fn (ExamAttempt $a) => [
                'id' => $a->id,
                'student' => $a->student ? ['id' => $a->student->id, 'name' => $a->student->name] : null,
                'status' => $a->status,
                'score' => $a->score,
                'max_score' => $a->max_score,
                'started_at' => $a->started_at,
                'submitted_at' => $a->submitted_at,
            ]));
    }

    /**
     * What a student (or their parent) sees before starting: the rules, how
     * many questions, their past attempts and whether they can start.
     */
    public function overview(Assessment $assessment): JsonResponse
    {
        Gate::authorize('grades.view');
        $this->ensureCanSeeCourse($assessment->course);
        abort_unless($assessment->is_online && $assessment->published_at, 404);

        $learnerId = $this->membership()->learnerId();
        $attempts = $assessment->attempts()->where('student_id', $learnerId)->latest('started_at')->get();
        foreach ($attempts->where('status', 'in_progress') as $attempt) {
            if ($attempt->isOverdue()) {
                $this->finish($attempt);
            }
        }
        $attempts = $attempts->fresh();
        $open = $attempts->firstWhere('status', 'in_progress');
        $closed = $assessment->due_at !== null && now()->greaterThan($assessment->due_at);
        $left = max(0, $assessment->max_attempts - $attempts->count());

        return response()->json([
            ...$this->settings($assessment),
            'course' => ['id' => $assessment->course->id, 'name' => $assessment->course->title],
            'question_count' => $assessment->questions()->count(),
            'question_types' => $assessment->questions()->distinct()->pluck('type'),
            'attempts_left' => $left,
            'closed' => $closed,
            'can_start' => $this->membership()->role === Role::Student && ! $open && $left > 0 && ! $closed,
            'open_attempt_id' => $open?->id,
            'attempts' => $attempts->map(fn (ExamAttempt $a) => [
                'id' => $a->id,
                'status' => $a->status,
                'score' => $assessment->resultsVisible() ? $a->score : null,
                'max_score' => $a->max_score,
                'started_at' => $a->started_at,
                'submitted_at' => $a->submitted_at,
            ])->values(),
        ]);
    }

    /**
     * Starts a new attempt for the signed-in student.
     */
    public function start(Assessment $assessment): JsonResponse
    {
        Gate::authorize('grades.view');
        abort_unless($this->membership()->role === Role::Student, 403);
        $this->ensureCanSeeCourse($assessment->course);
        abort_unless($assessment->is_online && $assessment->published_at, 404);

        $student = $this->membership()->user_id;
        $existing = $assessment->attempts()->where('student_id', $student)->get();
        if ($open = $existing->firstWhere('status', 'in_progress')) {
            return response()->json($this->present($open));
        }
        if ($assessment->due_at !== null && now()->greaterThan($assessment->due_at)) {
            throw ValidationException::withMessages(['exam' => __('This exam is closed.')]);
        }
        if ($existing->count() >= $assessment->max_attempts) {
            throw ValidationException::withMessages(['exam' => __('You have used all your attempts.')]);
        }

        $order = $assessment->questions()->pluck('id');
        $attempt = $assessment->attempts()->create([
            'student_id' => $student,
            'status' => 'in_progress',
            'question_order' => ($assessment->shuffle_questions ? $order->shuffle() : $order)->values()->all(),
            'answers' => [],
            'max_score' => $assessment->questions()->sum('points'),
            'started_at' => now(),
            'deadline_at' => $assessment->time_limit_minutes ? now()->addMinutes($assessment->time_limit_minutes) : null,
        ]);

        return response()->json($this->present($attempt), 201);
    }

    /**
     * One attempt: the questions (no answer key while it's running) and, once
     * results are released, the marks, the right answers and explanations.
     */
    public function attempt(ExamAttempt $attempt): JsonResponse
    {
        $this->ensureCanSeeAttempt($attempt);
        if ($attempt->status === 'in_progress' && $attempt->isOverdue()) {
            $this->finish($attempt);
        }

        return response()->json($this->present($attempt->refresh()));
    }

    /**
     * Autosaves the student's answers while the attempt is running.
     */
    public function saveAnswers(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $this->ensureOwnRunningAttempt($attempt);
        $data = $request->validate(['answers' => ['present', 'array']]);

        if ($attempt->isOverdue()) {
            $this->finish($attempt);

            return response()->json($this->present($attempt->refresh()));
        }

        $known = array_flip($attempt->question_order ?? []);
        $attempt->update(['answers' => array_intersect_key($data['answers'], $known)]);

        return response()->json(['saved_at' => now(), 'deadline_at' => $attempt->deadline_at]);
    }

    /**
     * Hands the attempt in: answers are saved, marked and recorded.
     */
    public function submit(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $this->ensureOwnRunningAttempt($attempt);
        $data = $request->validate(['answers' => ['sometimes', 'array']]);

        if (isset($data['answers']) && ! $attempt->isOverdue()) {
            $known = array_flip($attempt->question_order ?? []);
            $attempt->answers = array_intersect_key($data['answers'], $known);
        }
        $this->finish($attempt);

        return response()->json($this->present($attempt->refresh()));
    }

    /**
     * The teacher marks essays (or adjusts any question) and adds feedback.
     */
    public function review(Request $request, ExamAttempt $attempt): JsonResponse
    {
        Gate::authorize('grades.write');
        abort_if($attempt->status === 'in_progress', 422, __('The student is still taking this exam.'));

        $data = $request->validate([
            'points' => ['sometimes', 'array'],
            'points.*' => ['numeric', 'min:0'],
            'feedback' => ['nullable', 'string', 'max:5000'],
        ]);

        $questions = $attempt->assessment->questions()->get()->keyBy('id');
        $results = $attempt->results ?? [];
        foreach ($data['points'] ?? [] as $questionId => $points) {
            $question = $questions->get($questionId);
            if (! $question) {
                continue;
            }
            $points = min((float) $points, (float) $question->points);
            $results[$questionId] = [
                'points' => round($points, 2),
                'max' => (float) $question->points,
                'outcome' => $points >= (float) $question->points ? 'correct' : ($points > 0 ? 'partial' : 'incorrect'),
                'reviewed' => true,
            ];
        }

        $attempt->results = $results;
        $attempt->feedback = $data['feedback'] ?? $attempt->feedback;
        $this->finish($attempt, $request->user());

        return response()->json($this->present($attempt->refresh(), forStaff: true));
    }

    /**
     * Marks the attempt, closes it and writes the best score to the gradebook.
     */
    private function finish(ExamAttempt $attempt, ?User $actor = null): void
    {
        $assessment = $attempt->assessment;
        $marked = $this->grader->gradeAttempt($attempt, $assessment->questions()->get());

        DB::transaction(function () use ($attempt, $assessment, $marked, $actor) {
            $attempt->fill([
                'results' => $marked['results'],
                'score' => $marked['score'],
                'max_score' => $marked['max'],
                'status' => $marked['needs_review'] ? 'needs_review' : 'graded',
                'submitted_at' => $attempt->submitted_at ?? now(),
            ])->save();

            $best = $assessment->attempts()->where('student_id', $attempt->student_id)->where('status', 'graded')->max('score');
            if ($best !== null) {
                $this->records->recordGrade($assessment, ['student_id' => $attempt->student_id, 'score' => $best], $actor ?? $assessment->course->teacher ?? $attempt->student);
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ExamAttempt $attempt, bool $forStaff = false): array
    {
        $assessment = $attempt->assessment;
        $forStaff = $forStaff || $this->membership()->role->isStaff();
        $finished = $attempt->status !== 'in_progress';
        $reveal = $forStaff || ($finished && $assessment->resultsVisible());
        $questions = $assessment->questions()->get()->keyBy('id');
        $order = collect($attempt->question_order ?? [])->filter(fn ($id) => $questions->has($id));

        return [
            'id' => $attempt->id,
            'status' => $attempt->status,
            'started_at' => $attempt->started_at,
            'deadline_at' => $attempt->deadline_at,
            'submitted_at' => $attempt->submitted_at,
            'server_time' => now(),
            'score' => $reveal ? $attempt->score : null,
            'max_score' => $attempt->max_score,
            'feedback' => $reveal ? $attempt->feedback : null,
            'results_visible' => $reveal,
            'student' => $forStaff ? $attempt->student?->only(['id', 'name']) : null,
            'exam' => [...$this->settings($assessment), 'course' => ['id' => $assessment->course->id, 'name' => $assessment->course->title]],
            'answers' => $attempt->answers ?? [],
            'questions' => $order->map(function (string $id) use ($questions, $attempt, $reveal, $forStaff) {
                $question = $questions->get($id);

                return [
                    'id' => $question->id,
                    'type' => $question->type,
                    'prompt' => $question->prompt,
                    'points' => (float) $question->points,
                    'options' => $this->studentOptions($question, $attempt->id),
                    ...($reveal ? [
                        // An essay's "answer" is the teacher's marking rubric: staff only.
                        'answer' => $question->type === 'essay' && ! $forStaff ? null : $question->answer,
                        'explanation' => $question->explanation,
                        'result' => $attempt->results[$question->id] ?? null,
                    ] : []),
                ];
            })->values(),
        ];
    }

    /**
     * Options as the student sees them: items to order and the right-hand
     * column of a matching question are shuffled (the same way every time
     * for this attempt), so the layout never gives the answer away.
     *
     * @return array<string, mixed>|array<int, mixed>|null
     */
    private function studentOptions(ExamQuestion $question, string $attemptId): ?array
    {
        $options = $question->options;
        $mix = fn (array $items) => collect($items)->sortBy(fn ($item) => md5($attemptId.($item['id'] ?? json_encode($item))))->values()->all();

        return match ($question->type) {
            'ordering' => isset($options['items']) ? ['items' => $mix($options['items'])] : $options,
            'matching' => isset($options['left'], $options['right']) ? ['left' => $options['left'], 'right' => $mix($options['right'])] : $options,
            default => $options,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function settings(Assessment $assessment): array
    {
        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'type' => $assessment->type,
            'is_online' => $assessment->is_online,
            'instructions' => $assessment->instructions,
            'time_limit_minutes' => $assessment->time_limit_minutes,
            'max_attempts' => $assessment->max_attempts,
            'shuffle_questions' => $assessment->shuffle_questions,
            'results_visibility' => $assessment->results_visibility,
            'max_score' => $assessment->max_score,
            'due_at' => $assessment->due_at,
            'published_at' => $assessment->published_at,
        ];
    }

    /**
     * Checks a question has what its type needs (choices and a key, items to
     * order, pairs to match, …).
     *
     * @param  array<string, mixed>  $q
     */
    private function validateQuestion(array $q, string $field): void
    {
        $options = $q['options'] ?? [];
        $answer = $q['answer'] ?? [];
        $ids = fn (array $items) => collect($items)->pluck('id')->map(fn ($id) => (string) $id)->all();

        $error = match ($q['type']) {
            'single_choice' => count($options) < 2 || ! in_array((string) ($answer['correct'] ?? ''), $ids($options), true) ? __('Add at least two choices and mark the right one.') : null,
            'multiple_choice' => count($options) < 2 || empty($answer['correct']) || array_diff(array_map('strval', (array) $answer['correct']), $ids($options)) !== [] ? __('Add at least two choices and mark the right ones.') : null,
            'true_false' => ! array_key_exists('correct', $answer) || ! is_bool($answer['correct']) ? __('Choose whether the statement is true or false.') : null,
            'short_answer' => collect($answer['accepted'] ?? [])->filter(fn ($a) => trim((string) $a) !== '')->isEmpty() ? __('Add at least one accepted answer.') : null,
            'numeric' => ! is_numeric($answer['value'] ?? null) ? __('Enter the correct number.') : null,
            'fill_blanks' => substr_count($q['prompt'], '[[blank]]') === 0 || substr_count($q['prompt'], '[[blank]]') !== count($answer['blanks'] ?? []) ? __('Mark each blank with [[blank]] and give its answers.') : null,
            'ordering' => count($options['items'] ?? []) < 2 || count($answer['order'] ?? []) !== count($options['items'] ?? []) ? __('Add at least two items in the right order.') : null,
            'matching' => count($options['left'] ?? []) < 2 || count($answer['pairs'] ?? []) !== count($options['left'] ?? []) ? __('Add at least two pairs to match.') : null,
            default => null,
        };

        if ($error) {
            throw ValidationException::withMessages([$field => $error]);
        }
    }

    private function ensureCanSeeAttempt(ExamAttempt $attempt): void
    {
        $membership = $this->membership();
        $allowed = $membership->role->isStaff()
            ? Gate::allows('grades.write')
            : $attempt->student_id === $membership->learnerId();

        abort_unless($allowed, 404);
    }

    private function ensureOwnRunningAttempt(ExamAttempt $attempt): void
    {
        abort_unless($this->membership()->role === Role::Student && $attempt->student_id === $this->membership()->user_id, 404);
        abort_unless($attempt->status === 'in_progress', 422, __('This attempt has already been handed in.'));
    }
}
