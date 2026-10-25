<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['tenant_id', 'id', 'course_id', 'title', 'type', 'is_online', 'time_limit_minutes', 'max_attempts', 'shuffle_questions', 'results_visibility', 'instructions', 'max_score', 'weight', 'due_at', 'published_at'])]
class Assessment extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'max_score' => 'decimal:2',
            'weight' => 'decimal:2',
            'due_at' => 'datetime',
            'published_at' => 'datetime',
            'is_online' => 'boolean',
            'shuffle_questions' => 'boolean',
            'time_limit_minutes' => 'integer',
            'max_attempts' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return HasMany<Grade, $this>
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * @return HasMany<ExamQuestion, $this>
     */
    public function questions(): HasMany
    {
        return $this->hasMany(ExamQuestion::class)->orderBy('position');
    }

    /**
     * @return HasMany<ExamAttempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }

    /** Whether students may see their marks and the answer key for a submitted attempt now. */
    public function resultsVisible(): bool
    {
        return match ($this->results_visibility) {
            'never' => false,
            'after_due' => $this->due_at === null || now()->greaterThanOrEqualTo($this->due_at),
            default => true,
        };
    }
}
