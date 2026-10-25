<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A learner's private note on a lecture, optionally pinned to a moment in the video.
 */
#[Fillable(['user_id', 'course_id', 'lecture_id', 'position_seconds', 'body'])]
class LectureNote extends Model
{
    protected function casts(): array
    {
        return ['position_seconds' => 'integer'];
    }

    /**
     * @return BelongsTo<Lecture, $this>
     */
    public function lecture(): BelongsTo
    {
        return $this->belongsTo(Lecture::class)->withoutGlobalScopes();
    }
}
