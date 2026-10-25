<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A learner's right to a marketplace course: bought, free, or given by their
 * school (enrollment). Not tenant-scoped: learners may belong to no workspace.
 */
#[Table('course_access')]
#[Fillable(['user_id', 'course_id', 'tenant_id', 'source', 'order_id', 'last_viewed_at'])]
class CourseAccess extends Model
{
    protected function casts(): array
    {
        return ['last_viewed_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class)->withoutGlobalScopes();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
