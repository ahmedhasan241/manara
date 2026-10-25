<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Turns grades and attendance into results: a weighted percentage, letter and
 * grade points per subject, an overall average / GPA per student, attendance
 * standing against the school's absence limits, and rankings.
 */
class AcademicStanding
{
    /**
     * Minimum percentage, letter, grade points (4.0 scale).
     *
     * @var list<array{0: int, 1: string, 2: float}>
     */
    public const array SCALE = [
        [90, 'A', 4.0], [85, 'A-', 3.7], [80, 'B+', 3.3], [75, 'B', 3.0], [70, 'B-', 2.7],
        [65, 'C+', 2.3], [60, 'C', 2.0], [55, 'D+', 1.5], [50, 'D', 1.0], [0, 'F', 0.0],
    ];

    /**
     * The school's academic settings, with defaults.
     *
     * @return array{grading_scale: string, late_after_minutes: int, absence_warning_percent: int, absence_limit_percent: int, rankings_visible: bool, rankings_top: int}
     */
    public static function settings(Tenant $tenant): array
    {
        return [
            'grading_scale' => $tenant->type === 'university' ? 'gpa' : 'percent',
            'late_after_minutes' => 10,
            'absence_warning_percent' => 10,
            'absence_limit_percent' => 25,
            'rankings_visible' => true,
            'rankings_top' => 10,
            ...(array) data_get($tenant->settings, 'academic', []),
        ];
    }

    /**
     * What overall rankings are ordered by: GPA where the school grades on the
     * 4.0 scale, the weighted average otherwise.
     */
    public static function rankBy(Tenant $tenant): string
    {
        return self::settings($tenant)['grading_scale'] === 'gpa' ? 'gpa' : 'average';
    }

    /**
     * @return array{letter: string, points: float}
     */
    public static function letter(float $percent): array
    {
        foreach (self::SCALE as [$min, $letter, $points]) {
            if ($percent >= $min) {
                return ['letter' => $letter, 'points' => $points];
            }
        }

        return ['letter' => 'F', 'points' => 0.0];
    }

    /**
     * One row per enrolled student per course.
     *
     * @param  Collection<int, Course>  $courses
     * @param  list<int>|null  $studentIds  limit to these students
     * @return Collection<int, array<string, mixed>>
     */
    public function results(Tenant $tenant, Collection $courses, ?array $studentIds = null): Collection
    {
        if ($courses->isEmpty()) {
            return collect();
        }

        $settings = self::settings($tenant);
        $courseIds = $courses->pluck('id')->all();
        $byId = $courses->keyBy('id');

        $enrolled = DB::table('enrollments')
            ->whereIn('course_id', $courseIds)
            ->when($studentIds !== null, fn ($q) => $q->whereIn('student_id', $studentIds))
            ->get(['course_id', 'student_id']);

        $grades = DB::table('grades')
            ->join('assessments', 'assessments.id', '=', 'grades.assessment_id')
            ->whereIn('assessments.course_id', $courseIds)
            ->whereNull('assessments.deleted_at')
            ->whereNotNull('assessments.published_at')
            ->whereNotNull('grades.score')
            ->where('assessments.max_score', '>', 0)
            ->when($studentIds !== null, fn ($q) => $q->whereIn('grades.student_id', $studentIds))
            ->groupBy('assessments.course_id', 'grades.student_id')
            ->selectRaw('assessments.course_id as course_id, grades.student_id as student_id, count(*) as graded')
            ->selectRaw('sum(1.0 * assessments.weight * grades.score / assessments.max_score) as earned, sum(1.0 * assessments.weight) as weights')
            ->get()
            ->keyBy(fn ($row) => "{$row->course_id}:{$row->student_id}");

        $attendance = DB::table('attendances')
            ->join('class_sessions', 'class_sessions.id', '=', 'attendances.class_session_id')
            ->whereIn('class_sessions.course_id', $courseIds)
            ->when($studentIds !== null, fn ($q) => $q->whereIn('attendances.student_id', $studentIds))
            ->groupBy('class_sessions.course_id', 'attendances.student_id')
            ->selectRaw('class_sessions.course_id as course_id, attendances.student_id as student_id, count(*) as sessions')
            ->selectRaw("sum(case when status = 'present' then 1 else 0 end) as present")
            ->selectRaw("sum(case when status = 'late' then 1 else 0 end) as late")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->selectRaw("sum(case when status = 'excused' then 1 else 0 end) as excused")
            ->get()
            ->keyBy(fn ($row) => "{$row->course_id}:{$row->student_id}");

        return $enrolled->map(function ($row) use ($byId, $grades, $attendance, $settings) {
            $key = "{$row->course_id}:{$row->student_id}";
            $course = $byId[$row->course_id];
            $grade = $grades[$key] ?? null;
            $percent = $grade && $grade->weights > 0 ? round($grade->earned / $grade->weights * 100, 2) : null;

            return [
                'course_id' => $row->course_id,
                'student_id' => (int) $row->student_id,
                'credit_hours' => $course->credit_hours ?? 1.0,
                'percent' => $percent,
                'graded' => (int) ($grade->graded ?? 0),
                ...($percent === null ? ['letter' => null, 'points' => null] : self::letter($percent)),
                'passed' => $percent === null ? null : $percent >= $course->pass_percent,
                'attendance' => $this->attendanceStats($attendance[$key] ?? null, $settings),
            ];
        })->values();
    }

    /**
     * Combines course rows into one row per student.
     *
     * @param  Collection<int, array<string, mixed>>  $results
     * @return Collection<int, array<string, mixed>> keyed by student id
     */
    public function overall(Collection $results): Collection
    {
        return $results->groupBy('student_id')->map(function (Collection $rows, int $studentId) {
            $graded = $rows->whereNotNull('percent');
            $credits = $graded->sum('credit_hours');
            $sessions = $rows->sum('attendance.sessions');
            $attended = $rows->sum('attendance.present') + $rows->sum('attendance.late');
            $failing = $graded->where('passed', false)->count();
            $limits = $rows->where('attendance.status', 'limit')->count();
            $warnings = $rows->where('attendance.status', 'warning')->count();
            $average = $credits > 0 ? round($graded->sum(fn ($r) => $r['percent'] * $r['credit_hours']) / $credits, 2) : null;

            return [
                'student_id' => $studentId,
                'courses' => $rows->count(),
                'average' => $average,
                'gpa' => $credits > 0 ? round($graded->sum(fn ($r) => $r['points'] * $r['credit_hours']) / $credits, 2) : null,
                ...($average === null ? ['letter' => null] : ['letter' => self::letter($average)['letter']]),
                'credits' => round($rows->sum('credit_hours'), 1),
                'credits_earned' => round($graded->where('passed', true)->sum('credit_hours'), 1),
                'failing' => $failing,
                'attendance_rate' => $sessions > 0 ? round($attended / $sessions * 100, 1) : null,
                'absences' => (int) $rows->sum('attendance.absent'),
                'standing' => match (true) {
                    $failing >= 2 || $limits > 0 => 'at_risk',
                    $failing === 1 || $warnings > 0 => 'warning',
                    $average !== null && $average >= 90 => 'honors',
                    default => 'good',
                },
            ];
        });
    }

    /**
     * Sorts students by average or GPA (best first) and numbers them with shared
     * ranks for ties (1, 2, 2, 4). Within a tie the higher average, then attendance,
     * comes first. Students without any marks come last, unranked.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    public function rank(Collection $rows, string $by = 'average'): Collection
    {
        $names = User::whereIn('id', $rows->pluck('student_id'))->pluck('name', 'id');
        $key = fn (array $row) => [$row[$by] !== null, $row[$by] ?? 0, $row['average'] ?? 0, $row['attendance_rate'] ?? 0];

        $sorted = $rows->map(fn (array $row) => [...$row, 'name' => $names[$row['student_id']] ?? ''])
            ->sort(fn (array $a, array $b) => [...$key($b), $a['name']] <=> [...$key($a), $b['name']])
            ->values();

        $rank = 0;
        $previous = null;

        return $sorted->map(function (array $row, int $index) use (&$rank, &$previous, $by) {
            if ($row[$by] === null) {
                return [...$row, 'rank' => null];
            }
            if ($row[$by] !== $previous) {
                $rank = $index + 1;
                $previous = $row[$by];
            }

            return [...$row, 'rank' => $rank];
        });
    }

    /**
     * @param  object{sessions: int, present: int, late: int, absent: int, excused: int}|null  $row
     * @param  array{absence_warning_percent: int, absence_limit_percent: int}  $settings
     * @return array<string, mixed>
     */
    private function attendanceStats(?object $row, array $settings): array
    {
        $sessions = (int) ($row->sessions ?? 0);
        $absent = (int) ($row->absent ?? 0);
        $attended = (int) ($row->present ?? 0) + (int) ($row->late ?? 0);
        $absencePercent = $sessions > 0 ? round($absent / $sessions * 100, 1) : 0.0;

        return [
            'sessions' => $sessions,
            'present' => (int) ($row->present ?? 0),
            'late' => (int) ($row->late ?? 0),
            'absent' => $absent,
            'excused' => (int) ($row->excused ?? 0),
            'rate' => $sessions > 0 ? round($attended / $sessions * 100, 1) : null,
            'absence_percent' => $absencePercent,
            'status' => match (true) {
                $absencePercent >= $settings['absence_limit_percent'] => 'limit',
                $absencePercent >= $settings['absence_warning_percent'] => 'warning',
                default => 'ok',
            },
        ];
    }
}
