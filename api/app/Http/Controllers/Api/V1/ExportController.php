<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Attendance;
use App\Models\Course;
use App\Models\Grade;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV exports for administrators and teachers. PDF and scheduled reports are phase 3.
 */
class ExportController extends TenantController
{
    public function grades(Course $course): StreamedResponse
    {
        Gate::authorize('reports.view');

        $assessments = $course->assessments()->orderBy('due_at')->get(['id', 'title', 'max_score']);
        $grades = Grade::whereIn('assessment_id', $assessments->pluck('id'))->get()->groupBy('student_id');
        $students = $course->students()->orderBy('name')->get(['users.id', 'users.name', 'users.email']);

        return $this->csv("{$course->code}-grades.csv", function ($out) use ($assessments, $grades, $students): void {
            fputcsv($out, ['Student', 'Email', ...$assessments->map(fn ($a) => "{$a->title} (/{$a->max_score})")]);
            foreach ($students as $student) {
                $byAssessment = ($grades[$student->id] ?? collect())->keyBy('assessment_id');
                fputcsv($out, [
                    $student->name,
                    $student->email,
                    ...$assessments->map(fn ($a) => $byAssessment[$a->id]->score ?? ''),
                ]);
            }
        });
    }

    public function attendance(Course $course): StreamedResponse
    {
        Gate::authorize('reports.view');

        $rows = Attendance::query()
            ->whereIn('class_session_id', $course->sessions()->select('id'))
            ->with(['session:id,starts_at,topic', 'student:id,name'])
            ->get()
            ->sortBy(fn (Attendance $a) => [$a->session->starts_at, $a->student?->name]);

        return $this->csv("{$course->code}-attendance.csv", function ($out) use ($rows): void {
            fputcsv($out, ['Date', 'Topic', 'Student', 'Status', 'Note']);
            foreach ($rows as $row) {
                fputcsv($out, [$row->session->starts_at->toDateTimeString(), $row->session->topic, $row->student?->name, $row->status, $row->note]);
            }
        });
    }

    private function csv(string $filename, callable $write): StreamedResponse
    {
        return response()->streamDownload(function () use ($write): void {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel reads non-Latin names correctly
            $write($out);
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
