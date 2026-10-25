<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Proof that a learner finished every lecture of a course. Anyone with the
 * code can verify it on the public verification page.
 */
#[Fillable(['code', 'user_id', 'course_id', 'recipient_name', 'course_title', 'instructor_name', 'organization_name', 'duration_seconds', 'issued_at'])]
class Certificate extends Model
{
    protected function casts(): array
    {
        return ['issued_at' => 'datetime', 'duration_seconds' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (Certificate $certificate): void {
            // Unambiguous characters only, grouped for reading aloud: MN-7KQ2-M9XD
            $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
            $certificate->code ??= 'MN-'.collect(range(1, 2))
                ->map(fn () => collect(range(1, 4))->map(fn () => $alphabet[random_int(0, strlen($alphabet) - 1)])->implode(''))
                ->implode('-');
        });
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class)->withoutGlobalScopes();
    }

    /**
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'code' => $this->code,
            'recipient_name' => $this->recipient_name,
            'course_title' => $this->course_title,
            'course_slug' => $this->course?->slug,
            'instructor_name' => $this->instructor_name,
            'organization_name' => $this->organization_name,
            'duration_seconds' => $this->duration_seconds,
            'issued_at' => $this->issued_at->toIso8601String(),
        ];
    }
}
