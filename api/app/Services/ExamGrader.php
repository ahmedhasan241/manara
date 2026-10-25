<?php

namespace App\Services;

use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use Illuminate\Support\Collection;

/**
 * Marks online exam answers. Every type except essays is marked
 * automatically; where a question has several parts (multiple choice,
 * blanks, ordering, matching) each part earns its share of the points.
 *
 * Answer keys (`answer`) and student responses by type:
 * - single_choice   key {correct: id}                 response id
 * - multiple_choice key {correct: [ids]}              response [ids]
 * - true_false      key {correct: bool}               response bool
 * - short_answer    key {accepted: [text], case_sensitive?: bool}   response text
 * - numeric         key {value: number, tolerance?: number}         response number
 * - fill_blanks     key {blanks: [[accepted text]]}   response [text] (prompt marks blanks with [[blank]])
 * - ordering        key {order: [ids]}                response [ids]
 * - matching        key {pairs: {leftId: rightId}}    response {leftId: rightId}
 * - essay           key {rubric?: text}               response text (marked by the teacher)
 */
class ExamGrader
{
    /**
     * @return array{points: float|null, max: float, outcome: 'correct'|'partial'|'incorrect'|'unanswered'|'pending'}
     */
    public function grade(ExamQuestion $question, mixed $response): array
    {
        $max = (float) $question->points;
        $key = $question->answer ?? [];

        if ($question->type === 'essay') {
            $answered = is_string($response) && trim($response) !== '';

            return ['points' => $answered ? null : 0.0, 'max' => $max, 'outcome' => $answered ? 'pending' : 'unanswered'];
        }

        if ($this->isBlank($response)) {
            return ['points' => 0.0, 'max' => $max, 'outcome' => 'unanswered'];
        }

        $share = match ($question->type) {
            'single_choice' => (string) $response === (string) ($key['correct'] ?? '') ? 1.0 : 0.0,
            'true_false' => filter_var($response, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) === (bool) ($key['correct'] ?? false) ? 1.0 : 0.0,
            'multiple_choice' => $this->multipleChoice((array) $response, (array) ($key['correct'] ?? [])),
            'short_answer' => $this->matchesAny((string) $response, (array) ($key['accepted'] ?? []), (bool) ($key['case_sensitive'] ?? false)) ? 1.0 : 0.0,
            'numeric' => $this->numeric($response, $key),
            'fill_blanks' => $this->blanks((array) $response, (array) ($key['blanks'] ?? [])),
            'ordering' => $this->ordering((array) $response, (array) ($key['order'] ?? [])),
            'matching' => $this->matching((array) $response, (array) ($key['pairs'] ?? [])),
            default => 0.0,
        };

        return [
            'points' => round($share * $max, 2),
            'max' => $max,
            'outcome' => $share >= 1.0 ? 'correct' : ($share > 0 ? 'partial' : 'incorrect'),
        ];
    }

    /**
     * Marks every question of an attempt. Essays keep any points a teacher
     * already gave them.
     *
     * @param  Collection<int, ExamQuestion>  $questions
     * @return array{results: array<string, array<string, mixed>>, score: float, max: float, needs_review: bool}
     */
    public function gradeAttempt(ExamAttempt $attempt, Collection $questions): array
    {
        $answers = $attempt->answers ?? [];
        $previous = $attempt->results ?? [];
        $results = [];
        $needsReview = false;

        foreach ($questions as $question) {
            $result = $this->grade($question, $answers[$question->id] ?? null);
            if ($result['outcome'] === 'pending' && isset($previous[$question->id]['reviewed'])) {
                $result = $previous[$question->id];
            }
            $needsReview = $needsReview || $result['outcome'] === 'pending';
            $results[$question->id] = $result;
        }

        return [
            'results' => $results,
            'score' => round(collect($results)->sum(fn (array $r) => (float) ($r['points'] ?? 0)), 2),
            'max' => round((float) $questions->sum('points'), 2),
            'needs_review' => $needsReview,
        ];
    }

    private function isBlank(mixed $response): bool
    {
        return $response === null || $response === '' || $response === [] || (is_array($response) && collect($response)->filter(fn ($v) => $v !== null && $v !== '')->isEmpty());
    }

    /**
     * Each right choice earns its share; each wrong one takes a share away
     * (never below zero), so ticking everything doesn't pay.
     *
     * @param  array<int, mixed>  $chosen
     * @param  array<int, mixed>  $correct
     */
    private function multipleChoice(array $chosen, array $correct): float
    {
        if ($correct === []) {
            return 0.0;
        }
        $chosen = array_map('strval', array_unique($chosen));
        $correct = array_map('strval', $correct);
        $hits = count(array_intersect($chosen, $correct));
        $wrong = count(array_diff($chosen, $correct));

        return max(0.0, ($hits - $wrong) / count($correct));
    }

    /**
     * @param  array<int, mixed>  $accepted
     */
    private function matchesAny(string $response, array $accepted, bool $caseSensitive): bool
    {
        $normalize = fn (string $text) => $caseSensitive ? preg_replace('/\s+/u', ' ', trim($text)) : mb_strtolower(preg_replace('/\s+/u', ' ', trim($text)));

        return collect($accepted)->contains(fn ($option) => $normalize((string) $option) === $normalize($response));
    }

    /**
     * @param  array<string, mixed>  $key
     */
    private function numeric(mixed $response, array $key): float
    {
        $value = is_numeric($response) ? (float) $response : (is_string($response) && is_numeric(str_replace(',', '.', trim($response))) ? (float) str_replace(',', '.', trim($response)) : null);
        if ($value === null || ! isset($key['value'])) {
            return 0.0;
        }

        return abs($value - (float) $key['value']) <= abs((float) ($key['tolerance'] ?? 0)) + 1e-9 ? 1.0 : 0.0;
    }

    /**
     * @param  array<int, mixed>  $responses
     * @param  array<int, mixed>  $blanks  accepted answers per blank
     */
    private function blanks(array $responses, array $blanks): float
    {
        if ($blanks === []) {
            return 0.0;
        }
        $right = collect($blanks)->filter(fn ($accepted, $i) => $this->matchesAny((string) ($responses[$i] ?? ''), (array) $accepted, false))->count();

        return $right / count($blanks);
    }

    /**
     * Each item in its right place earns its share.
     *
     * @param  array<int, mixed>  $order
     * @param  array<int, mixed>  $correct
     */
    private function ordering(array $order, array $correct): float
    {
        if ($correct === []) {
            return 0.0;
        }
        $right = collect(array_values($correct))->filter(fn ($id, $i) => (string) ($order[$i] ?? '') === (string) $id)->count();

        return $right / count($correct);
    }

    /**
     * @param  array<string, mixed>  $pairs
     * @param  array<string, mixed>  $correct
     */
    private function matching(array $pairs, array $correct): float
    {
        if ($correct === []) {
            return 0.0;
        }
        $right = collect($correct)->filter(fn ($rightId, $leftId) => (string) ($pairs[$leftId] ?? '') === (string) $rightId)->count();

        return $right / count($correct);
    }
}
