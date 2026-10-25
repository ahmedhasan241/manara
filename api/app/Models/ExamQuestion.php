<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One question of an online exam. `options` holds what the student sees
 * (choices, items to order, pairs to match); `answer` holds the key and is
 * never sent to students before results are released.
 */
#[Fillable(['tenant_id', 'id', 'assessment_id', 'position', 'type', 'prompt', 'points', 'options', 'answer', 'explanation'])]
class ExamQuestion extends Model
{
    use BelongsToTenant, HasUuids;

    public const array TYPES = ['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'numeric', 'fill_blanks', 'ordering', 'matching', 'essay'];

    protected function casts(): array
    {
        return [
            'points' => 'decimal:2',
            'options' => 'array',
            'answer' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Assessment, $this>
     */
    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }
}
