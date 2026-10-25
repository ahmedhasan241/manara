<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A course a learner saved for later. Not tenant-scoped, like course access.
 */
#[Fillable(['user_id', 'course_id'])]
class WishlistItem extends Model
{
    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class)->withoutGlobalScopes();
    }
}
