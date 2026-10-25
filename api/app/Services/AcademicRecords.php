<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Grade;
use App\Models\Guardianship;
use App\Models\User;
use App\Notifications\AbsenceRecorded;
use App\Notifications\GradePosted;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

/**
 * Writes grades and attendance. Shared by the regular endpoints and offline sync,
 * so both follow the same rules: one row per student per assessment/session, and
 * when two writes race, the one with the later client timestamp wins.
 */
class AcademicRecords
{
    /**
     * @param  array{id?: string, student_id: int, score: float|int|string|null, feedback?: string|null, client_updated_at?: string|null}  $input
     * @return array{record: Grade, applied: bool}
     */
    public function recordGrade(Assessment $assessment, array $input, User $actor): array
    {
        $clientUpdatedAt = isset($input['client_updated_at']) ? Carbon::parse($input['client_updated_at']) : now();

        $grade = Grade::firstOrNew([
            'assessment_id' => $assessment->id,
            'student_id' => $input['student_id'],
        ]);

        if ($grade->exists && $grade->client_updated_at && $grade->client_updated_at->greaterThan($clientUpdatedAt)) {
            return ['record' => $grade, 'applied' => false];
        }

        if (! $grade->exists && isset($input['id'])) {
            $grade->id = $input['id'];
        }

        $isNewScore = ! $grade->exists || (string) $grade->score !== (string) $input['score'];

        $grade->fill([
            'score' => $input['score'],
            'feedback' => $input['feedback'] ?? $grade->feedback,
            'graded_by' => $actor->id,
            'client_updated_at' => $clientUpdatedAt,
        ])->save();

        if ($isNewScore && $assessment->published_at) {
            $grade->student?->notify(new GradePosted($grade->load('assessment.course')));
        }

        return ['record' => $grade, 'applied' => true];
    }

    /**
     * @param  array{id?: string, student_id: int, status: string, note?: string|null, client_updated_at?: string|null}  $input
     * @return array{record: Attendance, applied: bool}
     */
    public function recordAttendance(ClassSession $session, array $input, User $actor): array
    {
        $clientUpdatedAt = isset($input['client_updated_at']) ? Carbon::parse($input['client_updated_at']) : now();

        $attendance = Attendance::firstOrNew([
            'class_session_id' => $session->id,
            'student_id' => $input['student_id'],
        ]);

        if ($attendance->exists && $attendance->client_updated_at && $attendance->client_updated_at->greaterThan($clientUpdatedAt)) {
            return ['record' => $attendance, 'applied' => false];
        }

        if (! $attendance->exists && isset($input['id'])) {
            $attendance->id = $input['id'];
        }

        $attendance->fill([
            'status' => $input['status'],
            'note' => $input['note'] ?? null,
            'recorded_by' => $actor->id,
            'client_updated_at' => $clientUpdatedAt,
        ]);
        $newlyAbsent = $attendance->status === 'absent' && $attendance->isDirty('status');
        $attendance->save();

        if ($newlyAbsent) {
            self::notifyGuardians($attendance);
        }

        return ['record' => $attendance, 'applied' => true];
    }

    /**
     * Lets the student's parents know about an absence.
     */
    public static function notifyGuardians(Attendance $attendance): void
    {
        $guardians = User::whereIn('id', Guardianship::query()->where('tenant_id', $attendance->tenant_id)->where('student_id', $attendance->student_id)->select('guardian_id'))->get();

        if ($guardians->isNotEmpty()) {
            Notification::send($guardians, new AbsenceRecorded($attendance->load('student:id,name', 'session.course:id,title')));
        }
    }
}
