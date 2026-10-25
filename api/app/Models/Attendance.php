<?php

namespace App\Models;

use App\Support\LogsActivity;
use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'id', 'class_session_id', 'student_id', 'status', 'note', 'recorded_by', 'client_updated_at'])]
class Attendance extends Model
{
    use BelongsToTenant, HasUuids, LogsActivity;

    /** @var list<string> */
    public const array STATUSES = ['present', 'absent', 'late', 'excused'];

    protected function casts(): array
    {
        return ['client_updated_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<ClassSession, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ClassSession::class, 'class_session_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
