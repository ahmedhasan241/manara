<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student's sitting of an online exam: their answers, the marks per
 * question once submitted, and the total that goes to the gradebook.
 */
#[Fillable(['tenant_id', 'id', 'assessment_id', 'student_id', 'status', 'question_order', 'answers', 'results', 'score', 'max_score', 'feedback', 'started_at', 'deadline_at', 'submitted_at'])]
class ExamAttempt extends Model
{
    use BelongsToTenant, HasUuids;

    protected function casts(): array
    {
        return [
            'question_order' => 'array',
            'answers' => 'array',
            'results' => 'array',
            'score' => 'decimal:2',
            'max_score' => 'decimal:2',
            'feedback' => 'encrypted',
            'started_at' => 'datetime',
            'deadline_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Assessment, $this>
     */
    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /** Past the time limit (with a short grace for a final save already in flight). */
    public function isOverdue(): bool
    {
        return $this->deadline_at !== null && now()->greaterThan($this->deadline_at->copy()->addSeconds(30));
    }
}
