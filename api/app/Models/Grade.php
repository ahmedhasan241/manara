<?php

namespace App\Models;

use App\Support\LogsActivity;
use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'id', 'assessment_id', 'student_id', 'score', 'feedback', 'graded_by', 'client_updated_at'])]
class Grade extends Model
{
    use BelongsToTenant, HasUuids, LogsActivity;

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'feedback' => 'encrypted',
            'client_updated_at' => 'datetime',
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
}
