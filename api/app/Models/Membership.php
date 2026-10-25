<?php

namespace App\Models;

use App\Enums\Role;
use App\Support\Tenancy\BelongsToTenant;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'user_id', 'role', 'student_number'])]
class Membership extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return ['role' => Role::class];
    }

    /**
     * The student whose records this membership sees: themself, or for a parent the
     * child selected for this request (X-Student header, default the first child).
     */
    public function learnerId(): ?int
    {
        return $this->role === Role::Parent ? app(CurrentTenant::class)->studentId() : $this->user_id;
    }

    /**
     * Students this membership follows as a parent or guardian.
     *
     * @return list<int>
     */
    public function childIds(): array
    {
        return Guardianship::query()
            ->where('tenant_id', $this->tenant_id)
            ->where('guardian_id', $this->user_id)
            ->orderBy('id')
            ->pluck('student_id')
            ->all();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
